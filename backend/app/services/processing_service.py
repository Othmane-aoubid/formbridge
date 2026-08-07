from typing import Optional, Dict, Any, Tuple

from app.services.storage_service import StorageService

from app.services.ocr_service import OCRService

from app.services.document_service import DocumentService

from app.services.ai_extraction_service import AIExtractionService

from app.models.document import DocumentStatus, DocumentSearchParams

from app.core.config import settings

import logging

from datetime import datetime



logger = logging.getLogger(__name__)





class ProcessingService:

    def __init__(self):

        self.storage_service = StorageService()

        self.ocr_service = OCRService()

        self.document_service = DocumentService()

        self.ai_extraction_service = AIExtractionService()

    

    async def process_document(self, document_id: str) -> bool:

        """

        Process a document through the complete pipeline:

        1. Retrieve blob from storage

        2. Send to Azure Document Intelligence

        3. Extract OCR text, fields, tables, etc.

        4. Update Cosmos DB with results

        5. Index in Azure AI Search

        6. Update status to completed or failed

        """

        try:

            # Get document record

            document = await self.document_service.get_document(document_id)

            if not document:

                logger.error(f"Document {document_id} not found")

                await self._mark_failed(document_id, "Document not found")

                return False



            # Check if processing was stopped by user

            if await self._check_user_stopped(document_id, document):

                return False



            # Update status to processing

            await self.document_service.update_status(

                document_id,

                DocumentStatus.processing,

                actor="system"

            )



            # Update processing timestamp and initial progress

            await self._update_progress(document_id, 10, "Initializing", include_timestamp=True)



            # Generate SAS URL for Document Intelligence

            

            # Check if stopped before expensive operations
            document = await self.document_service.get_document(document_id)
            if await self._check_user_stopped(document_id, document):
                return False



            blob_sas_url = await self.storage_service.generate_download_sas(document.blob_uri)



            # Extract complete text from PDF using PyMuPDF to bypass Azure's 2-page limitation
            full_pdf_text, ai_extracted_fields, timing, nvidia_already_called = await self._extract_with_pymupdf(
                blob_sas_url,
                document.document_type.value
            )



            if not full_pdf_text:
                logger.warning("PyMuPDF extraction failed, falling back to Azure")
                await self._update_progress(document_id, 40, "Extracting content")
                logger.info(f"Starting document analysis for {document_id}")

                # Check if stopped before expensive Azure operation
                document = await self.document_service.get_document(document_id)
                if await self._check_user_stopped(document_id, document):
                    return False

                analysis_result = await self._extract_with_azure(blob_sas_url, document.document_type.value)

            else:
                # Use NVIDIA NIM to extract structured data from complete PDF text
                ai_extracted_fields, ai_timing = await self._extract_with_nvidia_nim(
                    full_pdf_text,
                    document.document_type.value,
                    timing
                )
                timing.update(ai_timing)
                nvidia_already_called = True

            # Create analysis result structure from extraction data
            analysis_result = self._create_analysis_result(full_pdf_text, ai_extracted_fields)



            await self._update_progress(document_id, 80, "Processing data")

            # Update document with extracted data and search indexed status
            await self._update_document_with_extraction(document_id, analysis_result)

            # Note: We'll make Azure AI Search truly background in a future step

            # Finalize document status based on confidence scores
            return await self._finalize_document_status(document_id, analysis_result)

            

        except Exception as e:

            logger.error(f"Error processing document {document_id}: {str(e)}")

            await self._mark_failed(document_id, str(e))

            return False

    

    async def _mark_failed(self, document_id: str, error_message: str):

        """

        Mark document as failed with error message

        """

        try:

            # Check if document was manually stopped by user - don't override

            document = await self.document_service.get_document(document_id)

            if self._has_user_stopped_error(document):

                logger.info(f"Document {document_id} was stopped by user, not overriding status")

                return

            

            await self.document_service.update_document(

                document_id,

                {

                    "status": DocumentStatus.failed.value,

                    "processingError": error_message,

                    "processingCompletedAt": datetime.utcnow().isoformat(),

                    "processingProgress": 0,

                    "processingStep": "Failed"

                }

            )

        except Exception as e:

            logger.error(f"Error marking document {document_id} as failed: {str(e)}")

    

    async def fix_stuck_processing_documents(self):

        """

        Fix documents that are stuck in processing status but have already been processed

        """

        try:

            # Get documents stuck in processing status

            params = DocumentSearchParams(status="processing", limit=100)
            stuck_docs = await self.document_service.search_documents(params)

            

            for doc in stuck_docs:

                # Check if document has extracted data (meaning it was actually processed)

                extracted_fields = doc.extracted_fields if hasattr(doc, 'extracted_fields') else None

                ocr_text = doc.ocr_text if hasattr(doc, 'ocr_text') else None

                

                if extracted_fields or ocr_text:

                    logger.info(f"Document {doc.id} is stuck in processing but has extracted data, fixing status")

                    

                    # Update to needs_review if it has extracted data

                    await self.document_service.update_document(

                        doc.id,

                        {

                            "status": DocumentStatus.needs_review.value,

                            "processingProgress": 100,

                            "processingStep": "Completed",

                            "processingCompletedAt": datetime.utcnow().isoformat()

                        }

                    )

                    logger.info(f"Document {doc.id} status updated to needs_review")

                else:

                    # No extracted data, mark as failed

                    logger.info(f"Document {doc.id} is stuck in processing with no data, marking as failed")

                    await self.document_service.update_document(

                        doc.id,

                        {

                            "status": DocumentStatus.failed.value,

                            "processingError": "Processing incomplete - no extracted data",

                            "processingProgress": 0,

                            "processingStep": "Failed",

                            "processingCompletedAt": datetime.utcnow().isoformat()

                        }

                    )

        except Exception as e:

            logger.error(f"Error fixing stuck processing documents: {str(e)}")



    async def _update_progress(self, document_id: str, progress: int, step: str, include_timestamp: bool = False):

        """

        Update processing progress for a document

        """

        try:

            update_data = {

                "processingProgress": progress,

                "processingStep": step

            }

            if include_timestamp:

                update_data["processingStartedAt"] = datetime.utcnow().isoformat()

            

            await self.document_service.update_document(document_id, update_data)

            # Broadcast update via WebSocket with step information

            from app.main import broadcast_document_update

            await broadcast_document_update(document_id, "processing", progress, step)

        except Exception as e:

            logger.error(f"Error updating progress for document {document_id}: {str(e)}")

    

    async def _ensure_search_index_exists(self):

        """

        Ensure the Azure Search index exists, create it if it doesn't.

        This is called once per document, but only creates the index if missing.

        """

        try:

            from azure.search.documents.indexes import SearchIndexClient

            from azure.core.credentials import AzureKeyCredential

            from azure.search.documents.indexes.models import (

                SearchIndex,

                SimpleField,

                SearchableField,

                SearchFieldDataType

            )



            index_client = SearchIndexClient(

                endpoint=settings.azure_search_endpoint,

                credential=AzureKeyCredential(settings.azure_search_key)

            )



            # Check if index exists - only create if missing

            try:

                index_client.get_index(settings.azure_search_index_name)

                logger.info(f"Search index '{settings.azure_search_index_name}' already exists")

                return

            except Exception:

                # Index doesn't exist, proceed with creation

                logger.info(f"Search index '{settings.azure_search_index_name}' does not exist, creating it...")



            # Define the index schema

            index = SearchIndex(

                name=settings.azure_search_index_name,

                fields=[

                    SimpleField(name="id", type=SearchFieldDataType.String, key=True),

                    SearchableField(name="filename", type=SearchFieldDataType.String),

                    SimpleField(name="blobUri", type=SearchFieldDataType.String),

                    SearchableField(name="documentType", type=SearchFieldDataType.String),

                    SimpleField(name="contentType", type=SearchFieldDataType.String),

                    SearchableField(name="status", type=SearchFieldDataType.String),

                    SearchableField(name="ocrText", type=SearchFieldDataType.String),

                    SimpleField(name="extractedFields", type=SearchFieldDataType.String),

                    SimpleField(name="confidenceScores", type=SearchFieldDataType.String),

                    SimpleField(name="createdAt", type=SearchFieldDataType.DateTimeOffset),

                    SimpleField(name="processedAt", type=SearchFieldDataType.DateTimeOffset),

                ]

            )



            index_client.create_index(index)

            logger.info(f"Successfully created search index '{settings.azure_search_index_name}'")



        except Exception as e:

            logger.error(f"Error creating search index: {str(e)}")

            # Don't fail the entire process if index creation fails

    

    async def _index_document(

        self,

        document_id: str,

        document: Any,

        analysis_result: Dict[str, Any]

    ):

        """

        Index document in Azure AI Search

        """

        try:

            # Ensure index exists before indexing

            await self._ensure_search_index_exists()

            

            from azure.search.documents import SearchClient

            from azure.core.credentials import AzureKeyCredential

            

            search_client = SearchClient(

                endpoint=settings.azure_search_endpoint,

                index_name=settings.azure_search_index_name,

                credential=AzureKeyCredential(settings.azure_search_key)

            )

            

            # Prepare document for indexing

            created_at_str = document.created_at.isoformat() if hasattr(document.created_at, 'isoformat') else str(document.created_at)

            created_at_str = created_at_str + "Z" if created_at_str and not created_at_str.endswith("Z") else created_at_str

            

            search_document = {

                "id": document_id,

                "filename": document.filename,

                "blobUri": document.blob_uri,

                "documentType": document.document_type,

                "contentType": document.content_type,

                "status": DocumentStatus.completed.value,

                "ocrText": analysis_result["ocr_text"],

                "extractedFields": str(analysis_result["extracted_fields"]),

                "confidenceScores": str(analysis_result["confidence_scores"]),

                "createdAt": created_at_str,

                "processedAt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.%fZ")

            }

            

            # Upload or merge document

            search_client.merge_or_upload_documents(documents=[search_document])

            logger.info(f"Document {document_id} indexed in Azure AI Search")

            

        except Exception as e:

            logger.error(f"Error indexing document {document_id} in Azure AI Search: {str(e)}")

            # Don't fail the entire process if indexing fails

            # Just log the error and continue

    

    async def delete_document_from_search(self, document_id: str) -> bool:

        """

        Delete document from Azure AI Search

        """

        try:

            from azure.search.documents import SearchClient

            from azure.core.credentials import AzureKeyCredential



            search_client = SearchClient(

                endpoint=settings.azure_search_endpoint,

                index_name=settings.azure_search_index_name,

                credential=AzureKeyCredential(settings.azure_search_key)

            )



            search_client.delete_documents(documents=[{"id": document_id}])

            logger.info(f"Document {document_id} deleted from Azure AI Search")

            return True



        except Exception as e:

            logger.error(f"Error deleting document {document_id} from Azure AI Search: {str(e)}")

            return False



    def _is_user_stopped(self, document: Any) -> bool:
        """
        Check if document was stopped by user based on status and error message.
        """
        return (hasattr(document, 'status') and
                document.status == "failed" and
                hasattr(document, 'processing_error') and
                document.processing_error == "Processing stopped by user")

    def _has_user_stopped_error(self, document: Any) -> bool:
        """
        Check if document has the user-stopped error message.
        """
        return (document and
                hasattr(document, 'processing_error') and
                document.processing_error == "Processing stopped by user")

    async def _check_user_stopped(self, document_id: str, document: Any) -> bool:
        """
        Check if document processing was stopped by user.
        Returns True if processing should be aborted.
        """
        if self._is_user_stopped(document):
            logger.info(f"Document {document_id} processing was stopped by user, aborting")
            return True
        return False

    async def _extract_with_pymupdf(self, blob_sas_url: str, document_type: str) -> Tuple[str | list, Dict[str, Any], Dict[str, Any], bool]:
        """
        Extract text from PDF using PyMuPDF.
        Returns: (full_pdf_text_or_chunks, empty_fields, empty_timing, nvidia_not_called)
        """
        logger.info(f"Extracting complete text from PDF using PyMuPDF")
        extracted_result = await self.ocr_service.extract_text_from_pdf_url(blob_sas_url)
        
        ai_extracted_fields = {}
        timing = {}
        nvidia_already_called = False
        
        # Return chunks as-is for large documents, single text for small documents
        if isinstance(extracted_result, list):
            logger.info(f"Returning {len(extracted_result)} text chunks for chunked processing")
            return extracted_result, ai_extracted_fields, timing, nvidia_already_called
        else:
            full_pdf_text = extracted_result or ""
            logger.info(f"Single-pass extraction: {len(full_pdf_text)} characters")
            return full_pdf_text, ai_extracted_fields, timing, nvidia_already_called

    async def _process_chunked_extraction(self, chunks: list, document_type: str) -> Tuple[str, Dict[str, Any], Dict[str, Any]]:
        """
        Process text chunks and extract fields from each.
        Returns: (full_text, all_extracted_fields, timing)
        """
        logger.info(f"Received {len(chunks)} text chunks, processing each chunk separately")
        all_extracted_fields = {}
        timing = {}
        full_text = ""
        
        for chunk_idx, chunk_text in enumerate(chunks):
            logger.info(f"Processing chunk {chunk_idx + 1}/{len(chunks)} ({len(chunk_text)} characters)")
            
            chunk_fields, chunk_timing = await self._extract_fields_with_nvidia(
                chunk_text, document_type
            )
            
            timing.update(chunk_timing)
            all_extracted_fields.update(chunk_fields)
            full_text += chunk_text + "\n\n"
            logger.info(f"Chunk {chunk_idx + 1} extracted {len(chunk_fields)} fields")
        
        logger.info(f"Total extracted fields from all chunks: {len(all_extracted_fields)}")
        return full_text, all_extracted_fields, timing

    async def _extract_fields_with_nvidia(self, text: str, document_type: str) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Extract fields from text using NVIDIA NIM.
        Returns: (extracted_fields, timing)
        """
        logger.info(f"Starting NVIDIA field extraction for document_type: {document_type}, text_length: {len(text)} chars")
        logger.info(f"Text preview (first 200 chars): {text[:200]}")
        
        try:
            fields, timing = await self.ai_extraction_service.extract_fields_from_ocr(
                text, document_type, return_timing=True
            )
            
            logger.info(f"NVIDIA extraction completed successfully")
            logger.info(f"Extracted {len(fields)} fields: {list(fields.keys())}")
            logger.info(f"Timing info: {timing}")
            
            return fields, timing
        except Exception as e:
            logger.error(f"NVIDIA extraction failed: {str(e)}")
            logger.error(f"Exception type: {type(e).__name__}")
            logger.error(f"Document type: {document_type}, Text length: {len(text)}")
            return {}, {}

    async def _extract_with_nvidia_nim(self, pdf_text_or_chunks: str | list, document_type: str, timing: Dict[str, Any]) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Extract fields from OCR text using NVIDIA NIM.
        Handles both single text and chunked processing for large documents.
        Returns: (ai_extracted_fields, ai_timing)
        """
        # Handle chunked processing for large documents
        if isinstance(pdf_text_or_chunks, list):
            logger.info(f"Processing {len(pdf_text_or_chunks)} text chunks separately")
            full_text, all_extracted_fields, chunk_timing = await self._process_chunked_extraction(pdf_text_or_chunks, document_type)
            timing.update(chunk_timing)
            return all_extracted_fields, timing
        
        # Single text processing
        logger.info(f"Using NVIDIA NIM to extract structured data from complete PDF text")
        logger.info(f"Document type: {document_type}, OCR text length: {len(pdf_text_or_chunks)} chars")
        logger.info(f"OCR text preview (first 200 chars): {pdf_text_or_chunks[:200]}")
        
        try:
            ai_extracted_fields, ai_timing = await self.ai_extraction_service.extract_fields_from_ocr(
                pdf_text_or_chunks,
                document_type,
                return_timing=True
            )
            logger.info(f"NVIDIA extraction completed successfully")
            logger.info(f"Extracted {len(ai_extracted_fields)} fields: {list(ai_extracted_fields.keys())}")
            logger.info(f"Timing info: {ai_timing}")
            return ai_extracted_fields, ai_timing
        except Exception as e:
            logger.error(f"NVIDIA extraction failed: {str(e)}")
            logger.error(f"Exception type: {type(e).__name__}")
            logger.error(f"Document type: {document_type}, Text length: {len(pdf_text_or_chunks)}")
            return {}, {}

    async def _extract_with_azure(self, blob_sas_url: str, document_type: str) -> Dict[str, Any]:
        """
        Extract fields using Azure Document Intelligence.
        Returns: analysis_result dictionary
        """
        # Select model based on document type
        model_mapping = {
            "invoice": "prebuilt-invoice",
            "receipt": "prebuilt-receipt",
            "contract": "prebuilt-read",
            "other": "prebuilt-read"
        }
        model_id = model_mapping.get(document_type, "prebuilt-read")
        logger.info(f"Using model '{model_id}' for document type '{document_type}'")

        try:
            analysis_result = await self.ocr_service.analyze_document(blob_sas_url, model_id)
        except Exception as e:
            logger.error(f"Azure analysis failed: {str(e)}")
            analysis_result = {
                "extracted_fields": {},
                "confidence_scores": {},
                "ocr_text": "",
                "paragraphs": [],
                "tables": [],
                "key_value_pairs": {}
            }
        
        return analysis_result

    def _calculate_needs_review(self, confidence_scores: Dict[str, Any], document_id: str) -> bool:
        """
        Determine if document needs review based on confidence scores.
        Returns True if document needs review.
        """
        if not confidence_scores:
            logger.info(f"Document {document_id} has no confidence scores, sending to review")
            return True

        # Calculate average confidence score
        avg_confidence = sum(confidence_scores.values()) / len(confidence_scores)
        logger.info(f"Average confidence score for document {document_id}: {avg_confidence:.2f}")

        # Set threshold for auto-approval (0.8 = 80%)
        confidence_threshold = 0.8
        if avg_confidence < confidence_threshold:
            logger.info(f"Document {document_id} needs review (confidence: {avg_confidence:.2f} < {confidence_threshold})")
            return True
        else:
            logger.info(f"Document {document_id} auto-approved (confidence: {avg_confidence:.2f} >= {confidence_threshold})")
            return False

    def _create_analysis_result(self, full_pdf_text: str, ai_extracted_fields: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create analysis result structure from extraction data.
        Returns: analysis_result dictionary
        """
        analysis_result = {
            "extracted_fields": ai_extracted_fields if ai_extracted_fields else {},
            "confidence_scores": {},
            "ocr_text": full_pdf_text,  # Always save the OCR text
            "paragraphs": [],
            "tables": [],
            "key_value_pairs": {}
        }

        logger.info(f"OCR text length: {len(full_pdf_text)}")
        logger.info(f"Extracted fields count: {len(ai_extracted_fields) if ai_extracted_fields else 0}")

        # Filter out None values from confidence scores to avoid validation errors
        analysis_result["confidence_scores"] = {
            k: v for k, v in analysis_result["confidence_scores"].items()
            if v is not None
        }

        return analysis_result

    async def _update_document_with_extraction(self, document_id: str, analysis_result: Dict[str, Any]):
        """
        Update document with extracted data and search indexed status.
        """
        update_data = {
            "extractedFields": analysis_result["extracted_fields"],
            "confidenceScores": analysis_result["confidence_scores"],
            "ocrText": analysis_result["ocr_text"],
            "paragraphs": analysis_result.get("paragraphs", []),
            "tables": analysis_result["tables"],
            "keyValuePairs": analysis_result["key_value_pairs"],
            "processingCompletedAt": datetime.utcnow().isoformat(),
            "searchIndexed": True,
            "searchIndexedAt": datetime.utcnow().isoformat()
        }

        await self.document_service.update_document(document_id, update_data)
        logger.info(f"Scheduling document {document_id} for Azure AI Search indexing")

    async def _finalize_document_status(self, document_id: str, analysis_result: Dict[str, Any]):
        """
        Determine final status based on confidence scores and update document.
        """
        # Check if stopped before final status update
        document = await self.document_service.get_document(document_id)
        if await self._check_user_stopped(document_id, document):
            return False

        # Determine if document needs review based on confidence scores
        confidence_scores = analysis_result["confidence_scores"]
        needs_review = self._calculate_needs_review(confidence_scores, document_id)

        # Update status based on confidence
        final_status = DocumentStatus.needs_review if needs_review else DocumentStatus.completed
        await self.document_service.update_status(
            document_id,
            final_status,
            actor="system"
        )

        # Broadcast final status via WebSocket
        from app.main import broadcast_document_update
        await broadcast_document_update(document_id, final_status.value, 100)

        await self._update_progress(document_id, 100, "Completed")
        logger.info(f"Document {document_id} processed successfully")
        return True

    async def _process_with_nvidia(self, document_id: str, blob_sas_url: str, document_type: str) -> Dict[str, Any]:

        """

        Fallback processing using NVIDIA API when Azure rate limits are reached

        """

        try:

            import httpx

            import base64



            logger.info(f"Using NVIDIA API for document {document_id}")



            # Download the document content

            async with httpx.AsyncClient() as client:

                response = await client.get(blob_sas_url)

                response.raise_for_status()

                document_content = response.content



            # Encode document content to base64

            base64_content = base64.b64encode(document_content).decode('utf-8')



            # Call NVIDIA API for document processing

            nvidia_api_url = "https://integrate.api.nvidia.com/v1/vision/nvidia/llama-3.2-90b-vision-instruct"

            headers = {

                "Authorization": f"Bearer {settings.nvidia_nim_api_key}",

                "Content-Type": "application/json"

            }



            # Prepare prompt based on document type

            prompt = f"Extract structured data from this {document_type} document. Return JSON with fields like vendor name, invoice number, date, total amount, line items, etc."



            payload = {

                "model": settings.nvidia_nim_model,

                "messages": [

                    {

                        "role": "user",

                        "content": [

                            {

                                "type": "text",

                                "text": prompt

                            },

                            {

                                "type": "image_url",

                                "image_url": {

                                    "url": f"data:application/pdf;base64,{base64_content}"

                                }

                            }

                        ]

                    }

                ],

                "max_tokens": 4096,

                "temperature": 0.2

            }



            async with httpx.AsyncClient(timeout=60.0) as client:

                response = await client.post(nvidia_api_url, json=payload, headers=headers)

                response.raise_for_status()

                result = response.json()



            # Parse NVIDIA response to extract structured data

            extracted_text = result.get("choices", [{}])[0].get("message", {}).get("content", "")



            # Try to parse JSON from the response

            import json

            try:

                extracted_fields = json.loads(extracted_text)

            except json.JSONDecodeError:

                # If not valid JSON, use AI extraction service

                extracted_fields = await self.ai_extraction_service.extract_fields_from_ocr(

                    extracted_text,

                    document_type

                )



            return {

                "extracted_fields": extracted_fields,

                "confidence_scores": {},  # NVIDIA doesn't provide confidence scores

                "ocr_text": extracted_text,

                "tables": [],

                "key_value_pairs": {}

            }



        except Exception as e:

            logger.error(f"Error processing document with NVIDIA API: {str(e)}")

            raise Exception(f"NVIDIA fallback failed: {str(e)}")