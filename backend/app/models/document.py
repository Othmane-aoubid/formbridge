from pydantic import BaseModel, Field, RootModel
from typing import Optional, List, Dict, Any, Union
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
    completed = "completed"
    failed = "failed"


class LineItem(BaseModel):
    description: str
    quantity: int = Field(default=1, alias="qty")
    unit_price: float = Field(alias="unitPrice")
    amount: float


class ExtractedFields(RootModel[Dict[str, Any]]):
    pass


class ConfidenceScores(RootModel[Dict[str, float]]):
    pass


class AuditEntry(BaseModel):
    actor: str
    action: str
    timestamp: datetime


class DocumentCreate(BaseModel):
    filename: str
    content_type: str = "application/pdf"
    document_type: Optional[DocumentType] = DocumentType.other
    tenant_id: Optional[str] = Field(None, alias="tenantId")


class DocumentCreateParams(BaseModel):
    document_id: str = Field(alias="documentId")
    blob_uri: str = Field(alias="blobUri")
    filename: str
    content_type: str = Field(alias="contentType")
    document_type: Union[DocumentType, str]
    tenant_id: Optional[str] = Field(None, alias="tenantId")
    created_by: Optional[str] = Field(None, alias="createdBy")


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
    processing_progress: Optional[int] = Field(0, alias="processingProgress")
    processing_step: Optional[str] = Field(None, alias="processingStep")
    processing_started_at: Optional[datetime] = Field(None, alias="processingStartedAt")
    processing_completed_at: Optional[datetime] = Field(None, alias="processingCompletedAt")
    processing_error: Optional[str] = Field(None, alias="processingError")
    ocr_text: Optional[str] = Field(None, alias="ocrText")
    tables: Optional[List[Dict[str, Any]]] = Field(None, alias="tables")
    key_value_pairs: Optional[Dict[str, str]] = Field(None, alias="keyValuePairs")
    preview_url: Optional[str] = Field(None, alias="previewUrl")

    class Config:
        populate_by_name = True


class DocumentSearchParams(BaseModel):
    query: Optional[str] = None
    document_type: Optional[str] = Field(None, alias="documentType")
    status: Optional[str] = None
    skip: int = 0
    limit: int = 50

    class Config:
        populate_by_name = True


class UploadSasResponse(BaseModel):
    document_id: str = Field(alias="documentId")
    upload_sas_url: str = Field(alias="uploadSasUrl")

    class Config:
        populate_by_name = True
