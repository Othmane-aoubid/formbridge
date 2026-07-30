from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class DocumentType(str, Enum):
    invoice = "invoice"
    receipt = "receipt"
    contract = "contract"
    other = "other"


class DocumentStatus(str, Enum):
    ingested = "ingested"
    processing = "processing"
    needs_review = "needs_review"
    validated = "validated"
    exported = "exported"
    archived = "archived"


class LineItem(BaseModel):
    description: str
    quantity: int = Field(default=1, alias="qty")
    unit_price: float = Field(alias="unitPrice")
    amount: float


class ExtractedFields(BaseModel):
    vendor_name: Optional[str] = Field(None, alias="vendorName")
    invoice_number: Optional[str] = Field(None, alias="invoiceNumber")
    invoice_date: Optional[str] = Field(None, alias="invoiceDate")
    total_amount: Optional[float] = Field(None, alias="totalAmount")
    currency: Optional[str] = "USD"
    line_items: List[LineItem] = Field(default_factory=list, alias="lineItems")


class ConfidenceScores(BaseModel):
    vendor_name: Optional[float] = Field(None, alias="vendorName")
    invoice_number: Optional[float] = Field(None, alias="invoiceNumber")
    total_amount: Optional[float] = Field(None, alias="totalAmount")


class AuditEntry(BaseModel):
    actor: str
    action: str
    timestamp: datetime


class DocumentCreate(BaseModel):
    filename: str
    content_type: str = "application/pdf"
    document_type: Optional[DocumentType] = DocumentType.other
    tenant_id: Optional[str] = Field(None, alias="tenantId")


class DocumentResponse(BaseModel):
    id: str
    tenant_id: Optional[str] = Field(None, alias="tenantId")
    blob_uri: str = Field(alias="blobUri")
    filename: str
    content_type: str = Field(alias="contentType")
    document_type: DocumentType = Field(alias="documentType")
    extracted_fields: ExtractedFields = Field(alias="extractedFields")
    confidence_scores: ConfidenceScores = Field(alias="confidenceScores")
    status: DocumentStatus
    created_by: Optional[str] = Field(None, alias="createdBy")
    created_at: datetime = Field(alias="createdAt")
    audit: List[AuditEntry] = Field(default_factory=list)
    
    class Config:
        populate_by_name = True


class UploadSasResponse(BaseModel):
    document_id: str = Field(alias="documentId")
    upload_sas_url: str = Field(alias="uploadSasUrl")
    
    class Config:
        populate_by_name = True
