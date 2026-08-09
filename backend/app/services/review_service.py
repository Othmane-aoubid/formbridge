from typing import Optional, List
from app.services.document_service import DocumentService
from app.services.storage_service import StorageService
from app.models.review import ReviewQueueItem, ReviewResponse, ReviewQueueParams
from app.models.document import DocumentStatus, DocumentSearchParams
import logging

logger = logging.getLogger(__name__)


class ReviewService:
    def __init__(self):
        self.document_service = DocumentService()
        self.storage_service = StorageService()
    
    async def get_review_queue(
        self,
        params: ReviewQueueParams,
        user_id: Optional[str] = None
    ) -> List[ReviewQueueItem]:
        """
        Get documents pending review based on confidence threshold.
        If user_id is provided, only returns documents belonging to that user.
        """
        try:
            search_params = DocumentSearchParams(
                query=None,
                document_type=params.document_type,
                status=params.status,
                skip=params.skip,
                limit=params.limit
            )
            documents = await self.document_service.search_documents(search_params, user_id=user_id)
            
            # Filter by confidence threshold
            queue_items = []
            for doc in documents:
                # Calculate average confidence score
                if doc.confidence_scores:
                    scores = [
                        score for score in doc.confidence_scores.dict().values()
                        if score is not None
                    ]
                    avg_confidence = sum(scores) / len(scores) if scores else 0
                else:
                    avg_confidence = 0
                
                if avg_confidence < params.confidence_threshold:
                    queue_items.append(ReviewQueueItem(
                        document_id=doc.id,
                        filename=doc.filename,
                        document_type=doc.document_type.value,
                        status=doc.status,
                        confidence_score=avg_confidence,
                        created_at=doc.created_at.isoformat()
                    ))
            
            logger.info(f"Retrieved review queue with {len(queue_items)} items")
            return queue_items
            
        except Exception as e:
            logger.error(f"Error getting review queue: {str(e)}")
            return []
    
    async def get_review_document(self, document_id: str, user_id: Optional[str] = None) -> Optional[ReviewResponse]:
        """
        Get document details for review.
        If user_id is provided, verifies document ownership.
        """
        try:
            # Use ownership check if user_id is provided
            if user_id:
                document = await self.document_service.get_document_with_ownership_check(document_id, user_id)
            else:
                document = await self.document_service.get_document(document_id)
            
            if not document:
                return None

            # Generate preview URL with SAS token for read access
            preview_url = await self.storage_service.generate_download_sas(document.blob_uri)
            logger.info(f"Generated preview URL for document {document_id}: {preview_url}")

            # Filter out None values from confidence_scores
            filtered_confidence_scores = {
                k: v for k, v in document.confidence_scores.model_dump().items()
                if v is not None
            }

            return ReviewResponse(
                document_id=document.id,
                filename=document.filename,
                blob_uri=document.blob_uri,
                preview_url=preview_url,
                extracted_fields=document.extracted_fields.model_dump(),
                confidence_scores=filtered_confidence_scores,
                status=document.status,
                ocr_text=document.ocr_text if hasattr(document, 'ocr_text') else ""
            )

        except Exception as e:
            logger.error(f"Error getting review document {document_id}: {str(e)}")
            return None
    
    async def submit_review(
        self,
        document_id: str,
        corrected_fields: dict,
        reviewer_id: str,
        comments: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> bool:
        """
        Submit corrected fields and complete review.
        If user_id is provided, verifies document ownership before allowing review.
        """
        try:
            # Verify ownership if user_id is provided
            if user_id:
                document = await self.document_service.get_document_with_ownership_check(document_id, user_id)
                if not document:
                    logger.warning(f"Ownership check failed for review submission on document {document_id}")
                    return False
            
            # Update document with corrected fields
            updates = {
                "extractedFields": corrected_fields,
                "updated_by": reviewer_id
            }
            
            # Add review comment to audit
            if comments:
                updates["audit_comment"] = comments
            
            # Update status to validated
            await self.document_service.update_status(
                document_id,
                DocumentStatus.validated,
                actor=reviewer_id
            )
            
            # Update fields
            await self.document_service.update_document(document_id, updates)
            
            logger.info(f"Review submitted for document {document_id} by {reviewer_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error submitting review for {document_id}: {str(e)}")
            return False
