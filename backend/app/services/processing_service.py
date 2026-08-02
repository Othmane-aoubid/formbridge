from typing import Optional, Dict, Any
from app.services.storage_service import StorageService
from app.services.ocr_service import OCRService
from app.services.document_service import DocumentService
from app.services.ai_extraction_service import AIExtractionService
from app.models.document import DocumentStatus
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

            # Update status to processing
            await self.document_service.update_status(
                document_id,
                DocumentStatus.processing,
                actor="system"
            )

            # Update processing timestamp and initial progress
            await self.document_service.update_document(
                document_id,
                {
                    "processingStartedAt": datetime.utcnow().isoformat(),
                    "processingProgress": 0,
                    "processingStep": "Initializing"
                }
            )

            # Generate SAS URL for Document Intelligence
            await self._update_progress(document_id, 10, "Generating download URL")
            blob_sas_url = await self.storage_service.generate_download_sas(document.blob_uri)
            
            # Analyze document with Azure Document Intelligence
            await self._update_progress(document_id, 20, "Analyzing document with AI")
            logger.info(f"Starting document analysis for {document_id}")

            # Select model based on document type
            model_mapping = {
                "invoice": "prebuilt-invoice",
                "receipt": "prebuilt-receipt",
                "contract": "prebuilt-read",
                "other": "prebuilt-read"
            }
            model_id = model_mapping.get(document.document_type.value, "prebuilt-read")
            logger.info(f"Using model '{model_id}' for document type '{document.document_type.value}'")

            try:
                analysis_result = await self.ocr_service.analyze_document(
                    blob_sas_url=blob_sas_url,
                    model_id=model_id
                )
            except Exception as azure_error:
                # Check if it's a rate limit error or Azure service unavailable
                error_str = str(azure_error).lower()
                if "rate limit" in error_str or "429" in error_str or "quota" in error_str or "limit" in error_str:
                    if settings.nvidia_nim_api_key:
                        await self._update_progress(document_id, 25, "Rate limit reached, switching to NVIDIA API")
                        logger.warning(f"Azure rate limit reached, falling back to NVIDIA API: {str(azure_error)}")
                        analysis_result = await self._process_with_nvidia(document_id, blob_sas_url, document.document_type.value)
                    else:
                        logger.error(f"Azure rate limit reached but NVIDIA API key not configured, failing: {str(azure_error)}")
                        raise Exception("Azure rate limit reached and NVIDIA fallback not available")
                else:
                    # If it's not a rate limit error, re-raise
                    raise azure_error

            await self._update_progress(document_id, 60, "Extracting structured data")

            # If no structured fields were extracted and we have OCR text, try AI extraction
            if not analysis_result["extracted_fields"] and analysis_result["ocr_text"]:
                logger.info(f"No structured fields from Azure, attempting AI extraction from OCR text")
                ai_extracted_fields = await self.ai_extraction_service.extract_fields_from_ocr(
                    analysis_result["ocr_text"],
                    document.document_type.value
                )
                if ai_extracted_fields:
                    analysis_result["extracted_fields"] = ai_extracted_fields
                    # AI extraction doesn't provide confidence scores, so clear them
                    analysis_result["confidence_scores"] = {}
                    logger.info(f"AI extraction succeeded, extracted {len(ai_extracted_fields)} fields")
            
            # Filter out None values from confidence scores to avoid validation errors
            analysis_result["confidence_scores"] = {
                k: v for k, v in analysis_result["confidence_scores"].items()
                if v is not None
            }

            await self._update_progress(document_id, 80, "Saving extracted data")

            # Update document with extracted data
            update_data = {
                "extractedFields": analysis_result["extracted_fields"],
                "confidenceScores": analysis_result["confidence_scores"],
                "ocrText": analysis_result["ocr_text"],
                "tables": analysis_result["tables"],
                "keyValuePairs": analysis_result["key_value_pairs"],
                "processingCompletedAt": datetime.utcnow().isoformat()
            }

            await self.document_service.update_document(document_id, update_data)

            # Index in Azure AI Search (non-blocking - will be done in background)
            logger.info(f"Scheduling document {document_id} for Azure AI Search indexing")
            # Note: We'll make this truly background in a future step
            
            # Determine if document needs review based on confidence scores
            await self._update_progress(document_id, 90, "Analyzing confidence scores")
            confidence_scores = analysis_result["confidence_scores"]
            needs_review = False

            if confidence_scores:
                # Calculate average confidence score
                avg_confidence = sum(confidence_scores.values()) / len(confidence_scores)
                logger.info(f"Average confidence score for document {document_id}: {avg_confidence:.2f}")

                # Set threshold for auto-approval (0.8 = 80%)
                confidence_threshold = 0.8
                if avg_confidence < confidence_threshold:
                    needs_review = True
                    logger.info(f"Document {document_id} needs review (confidence: {avg_confidence:.2f} < {confidence_threshold})")
                else:
                    logger.info(f"Document {document_id} auto-approved (confidence: {avg_confidence:.2f} >= {confidence_threshold})")
            else:
                # No confidence scores available, send to review
                needs_review = True
                logger.info(f"Document {document_id} has no confidence scores, sending to review")

            # Update status based on confidence
            final_status = DocumentStatus.needs_review if needs_review else DocumentStatus.completed
            await self.document_service.update_status(
                document_id,
                final_status,
                actor="system"
            )

            await self._update_progress(document_id, 100, "Completed")

            # Update search indexed status
            await self.document_service.update_document(
                document_id,
                {
                    "searchIndexed": True,
                    "searchIndexedAt": datetime.utcnow().isoformat()
                }
            )

            logger.info(f"Document {document_id} processed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error processing document {document_id}: {str(e)}")
            await self._mark_failed(document_id, str(e))
            return False
    
    async def _mark_failed(self, document_id: str, error_message: str):
        """
        Mark document as failed with error message
        """
        try:
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

    async def _update_progress(self, document_id: str, progress: int, step: str):
        """
        Update processing progress for a document
        """
        try:
            await self.document_service.update_document(
                document_id,
                {
                    "processingProgress": progress,
                    "processingStep": step
                }
            )
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