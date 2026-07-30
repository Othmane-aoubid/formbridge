from typing import Optional, List
from app.services.document_service import DocumentService
from app.models.review import ReviewQueueItem, ReviewResponse
from app.models.document import DocumentStatus
import logging

logger = logging.getLogger(__name__)


class ReviewService:
    def __init__(self):
        self.document_service = DocumentService()
    
    async def get_review_queue(
        self,
        confidence_threshold: float = 0.8,
        document_type: Optional[str] = None,
        status: str = "needs_review",
        skip: int = 0,
        limit: int = 50
    ) -> List[ReviewQueueItem]:
        """
        Get documents pending review based on confidence threshold
        """
        try:
            documents = await self.document_service.search_documents(
                query=None,
                document_type=document_type,
                status=status,
                skip=skip,
                limit=limit
            )
            
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
                
                if avg_confidence < confidence_threshold:
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
    
    async def get_review_document(self, document_id: str) -> Optional[ReviewResponse]:
        """
        Get document details for review
        """
        try:
            document = await self.document_service.get_document(document_id)
            if not document:
                return None
            
            # Generate preview URL (in production, this would be a thumbnail service)
            preview_url = document.blob_uri
            
            return ReviewResponse(
                document_id=document.id,
                filename=document.filename,
                blob_uri=document.blob_uri,
                preview_url=preview_url,
                extracted_fields=document.extracted_fields,
                confidence_scores=document.confidence_scores.dict(),
                status=document.status
            )
            
        except Exception as e:
            logger.error(f"Error getting review document {document_id}: {str(e)}")
            return None
    
    async def submit_review(
        self,
        document_id: str,
        corrected_fields: dict,
        reviewer_id: str,
        comments: Optional[str] = None
    ) -> bool:
        """
        Submit corrected fields and complete review
        """
        try:
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
