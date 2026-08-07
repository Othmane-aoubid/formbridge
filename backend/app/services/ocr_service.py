from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeDocumentRequest
from azure.core.credentials import AzureKeyCredential
from app.core.config import settings
import logging
from typing import Dict, Any
import fitz  # PyMuPDF for PDF text extraction

logger = logging.getLogger(__name__)


class OCRService:
    def __init__(self):
        self.client = DocumentIntelligenceClient(
            endpoint=settings.azure_document_intelligence_endpoint,
            credential=AzureKeyCredential(settings.azure_document_intelligence_key)
        )
    
    async def extract_text_from_pdf_url(self, pdf_url: str, chunk_pages: int = None) -> str | list[str]:
        """
        Extract all text from PDF using PyMuPDF to bypass Azure's 2-page limitation
        
        Args:
            pdf_url: URL to the PDF file
            chunk_pages: If specified, returns list of text chunks (one per chunk_pages pages)
                        If None, returns single string with all text
        """
        try:
            import httpx
            import io
            
            # Download PDF from URL asynchronously
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.get(pdf_url)
                response.raise_for_status()
            
            # Open PDF with PyMuPDF
            pdf_bytes = io.BytesIO(response.content)
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            
            # Get page count before closing
            page_count = len(doc)
            
            # Auto-determine chunking if not specified
            if chunk_pages is None:
                # Use chunking for documents with more than 15 pages to reduce API calls
                chunk_pages = 15 if page_count > 15 else None
            
            if chunk_pages is None:
                # Extract text from all pages as single string
                all_text = ""
                for page_num, page in enumerate(doc):
                    page_text = page.get_text()
                    all_text += f"--- Page {page_num + 1} ---\n{page_text}\n\n"
                
                doc.close()
                logger.info(f"Extracted {len(all_text)} characters from {page_count} pages using PyMuPDF (single-pass)")
                return all_text
            else:
                # Extract text in chunks
                chunks = []
                for start_page in range(0, page_count, chunk_pages):
                    end_page = min(start_page + chunk_pages, page_count)
                    chunk_text = ""
                    for page_num in range(start_page, end_page):
                        page = doc[page_num]
                        page_text = page.get_text()
                        chunk_text += f"--- Page {page_num + 1} ---\n{page_text}\n\n"
                    chunks.append(chunk_text)
                    logger.info(f"Extracted chunk {len(chunks)}: pages {start_page + 1}-{end_page}, {len(chunk_text)} characters")
                
                doc.close()
                logger.info(f"Extracted {len(chunks)} chunks from {page_count} pages using PyMuPDF (chunk-based)")
                return chunks
        except Exception as e:
            logger.error(f"Error extracting text with PyMuPDF: {str(e)}")
            return "" if chunk_pages is None else []
    
    async def analyze_document(
        self,
        blob_sas_url: str,
        model_id: str = "prebuilt-layout"
    ) -> Dict[str, Any]:
        """
        Analyze document using Azure Document Intelligence (Form Recognizer)
        """
        try:
            poller = self.client.begin_analyze_document(
                model_id=model_id,
                body={"urlSource": blob_sas_url}
            )
            
            result = poller.result()
            
            # Log how many pages Azure detected
            logger.info(f"Azure Document Intelligence detected {len(result.pages)} pages in document")
            
            # Extract fields from the result
            extracted_fields = {}
            confidence_scores = {}
            
            if result.documents and len(result.documents) > 0:
                doc = result.documents[0]
                
                # Extract common invoice fields
                if doc.fields:
                    if "VendorName" in doc.fields:
                        extracted_fields["vendorName"] = doc.fields["VendorName"].content
                        confidence_scores["vendorName"] = doc.fields["VendorName"].confidence
                    
                    if "InvoiceId" in doc.fields:
                        extracted_fields["invoiceNumber"] = doc.fields["InvoiceId"].content
                        confidence_scores["invoiceNumber"] = doc.fields["InvoiceId"].confidence
                    
                    if "InvoiceDate" in doc.fields:
                        extracted_fields["invoiceDate"] = doc.fields["InvoiceDate"].content
                        confidence_scores["invoiceDate"] = doc.fields["InvoiceDate"].confidence
                    
                    if "TotalTax" in doc.fields:
                        # Strip currency symbols and convert to float
                        amount_str = doc.fields["TotalTax"].content
                        amount_str = amount_str.replace('$', '').replace(',', '').strip()
                        extracted_fields["totalAmount"] = float(amount_str)
                        confidence_scores["totalAmount"] = doc.fields["TotalTax"].confidence
                    
                    if "Items" in doc.fields:
                        line_items = []
                        for item in doc.fields["Items"].values():
                            line_item = {
                                "description": item.get("Description", {}).content if "Description" in item else "",
                                "qty": item.get("Quantity", {}).value if "Quantity" in item else 1,
                                "unitPrice": item.get("Price", {}).value if "Price" in item else 0,
                                "amount": item.get("Amount", {}).value if "Amount" in item else 0
                            }
                            line_items.append(line_item)
                        extracted_fields["lineItems"] = line_items
            
            # If no structured fields extracted, use key-value pairs
            if not extracted_fields and result.key_value_pairs:
                for kvp in result.key_value_pairs:
                    key_name = kvp.key.content.lower().replace(" ", "").replace("-", "")
                    extracted_fields[key_name] = kvp.value.content if kvp.value else ""
                    confidence_scores[key_name] = kvp.confidence if hasattr(kvp, 'confidence') else 0.5
            
            # Extract OCR text from the result - prioritize full content extraction
            ocr_text = ""
            if result.content:
                ocr_text = result.content
                logger.info(f"Extracted {len(ocr_text)} characters from result.content")
            
            # Extract paragraphs for better content structure
            paragraphs = []
            if result.paragraphs:
                for para in result.paragraphs:
                    para_data = {
                        "content": para.content,
                        "role": para.role if hasattr(para, 'role') else None
                    }
                    # Convert bounding regions to serializable format
                    if hasattr(para, 'bounding_regions') and para.bounding_regions:
                        para_data["boundingRegions"] = [
                            {
                                "pageNumber": br.page_number if hasattr(br, 'page_number') else None,
                                "polygon": list(br.polygon) if hasattr(br, 'polygon') else []
                            }
                            for br in para.bounding_regions
                        ]
                    paragraphs.append(para_data)
                logger.info(f"Extracted {len(paragraphs)} paragraphs")
            
            # Always extract from pages to ensure we get ALL content
            if result.pages:
                page_texts = []
                for page_num, page in enumerate(result.pages):
                    page_content = []
                    if hasattr(page, 'lines'):
                        for line in page.lines:
                            if hasattr(line, 'content'):
                                page_content.append(line.content)
                    if page_content:
                        page_text = "\n".join(page_content)
                        page_texts.append(f"--- Page {page_num + 1} ---\n{page_text}")
                
                if page_texts:
                    pages_text = "\n\n".join(page_texts)
                    # Use pages text if content is empty or shorter
                    if not ocr_text or len(pages_text) > len(ocr_text):
                        ocr_text = pages_text
                        logger.info(f"Using page-level extraction: {len(ocr_text)} characters from {len(result.pages)} pages")
            
            logger.info(f"Final OCR text length: {len(ocr_text)} characters")
            
            # Extract tables with full content
            tables = []
            if result.tables:
                for table in result.tables:
                    table_data = {
                        "rowCount": table.row_count,
                        "columnCount": table.column_count,
                        "cells": []
                    }
                    if table.cells:
                        for cell in table.cells:
                            table_data["cells"].append({
                                "rowIndex": cell.row_index,
                                "columnIndex": cell.column_index,
                                "content": cell.content,
                                "rowSpan": cell.row_span,
                                "columnSpan": cell.column_span,
                                "kind": cell.kind if hasattr(cell, 'kind') else None
                            })
                    tables.append(table_data)
                logger.info(f"Extracted {len(tables)} tables")
            
            # Extract key-value pairs
            key_value_pairs = {}
            if result.key_value_pairs:
                for kvp in result.key_value_pairs:
                    key_value_pairs[kvp.key.content] = kvp.value.content if kvp.value else ""
                logger.info(f"Extracted {len(key_value_pairs)} key-value pairs")
            
            logger.info(f"Document analysis completed successfully")
            
            return {
                "extracted_fields": extracted_fields,
                "confidence_scores": confidence_scores,
                "ocr_text": ocr_text,
                "paragraphs": paragraphs,
                "tables": tables,
                "key_value_pairs": key_value_pairs
            }
            
        except Exception as e:
            logger.error(f"Error analyzing document: {str(e)}")
            raise
