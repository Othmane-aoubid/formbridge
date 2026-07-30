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
                body_request={"urlSource": blob_sas_url}
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
            
            logger.info(f"Document analysis completed successfully")
            
            return {
                "extracted_fields": extracted_fields,
                "confidence_scores": confidence_scores,
                "raw_result": result
            }
            
        except Exception as e:
            logger.error(f"Error analyzing document: {str(e)}")
            raise
