from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeDocumentRequest
from azure.core.credentials import AzureKeyCredential
from app.core.config import settings
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


class OCRService:
    def __init__(self):
        self.client = DocumentIntelligenceClient(
            endpoint=settings.azure_document_intelligence_endpoint,
            credential=AzureKeyCredential(settings.azure_document_intelligence_key)
        )
    
    async def analyze_document(
        self,
        blob_sas_url: str,
        model_id: str = "prebuilt-invoice"
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
                        extracted_fields["totalAmount"] = float(doc.fields["TotalTax"].content)
                        confidence_scores["totalAmount"] = doc.fields["TotalTax"].confidence
                    
                    if "Items" in doc.fields:
                        line_items = []
                        for item in doc.fields["Items"].values:
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
            
            # Extract OCR text from the result
            ocr_text = ""
            if result.content:
                ocr_text = result.content
            elif result.pages:
                # Fallback: concatenate text from pages if content is empty
                page_texts = []
                for page in result.pages:
                    if hasattr(page, 'lines'):
                        for line in page.lines:
                            if hasattr(line, 'content'):
                                page_texts.append(line.content)
                ocr_text = "\n".join(page_texts)
            
            # Extract tables
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
                                "columnSpan": cell.column_span
                            })
                    tables.append(table_data)
            
            # Extract key-value pairs
            key_value_pairs = {}
            if result.key_value_pairs:
                for kvp in result.key_value_pairs:
                    key_value_pairs[kvp.key.content] = kvp.value.content if kvp.value else ""
            
            logger.info(f"Document analysis completed successfully")
            
            return {
                "extracted_fields": extracted_fields,
                "confidence_scores": confidence_scores,
                "ocr_text": ocr_text,
                "tables": tables,
                "key_value_pairs": key_value_pairs
            }
            
        except Exception as e:
            logger.error(f"Error analyzing document: {str(e)}")
            raise
