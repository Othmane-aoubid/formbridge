from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from app.models.document import ExtractedFields, DocumentStatus


class ReviewSubmit(BaseModel):
    corrected_fields: ExtractedFields = Field(alias="correctedFields")
    reviewer_id: str = Field(alias="reviewerId")
    comments: Optional[str] = None
    
    class Config:
        populate_by_name = True


class ReviewQueueItem(BaseModel):
    document_id: str = Field(alias="documentId")
    filename: str
    document_type: str = Field(alias="documentType")
    status: DocumentStatus
    confidence_score: float = Field(alias="confidenceScore")
    created_at: str = Field(alias="createdAt")
    
    class Config:
        populate_by_name = True


class ReviewResponse(BaseModel):
    document_id: str = Field(alias="documentId")
    filename: str
    blob_uri: str = Field(alias="blobUri")
    preview_url: str = Field(alias="previewUrl")
    extracted_fields: ExtractedFields = Field(alias="extractedFields")
    confidence_scores: Dict[str, float] = Field(alias="confidenceScores")
    status: DocumentStatus
    ocr_text: Optional[str] = Field(alias="ocrText", default="")
    
    class Config:
        populate_by_name = True
