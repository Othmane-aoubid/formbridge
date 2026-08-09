from fastapi import APIRouter, HTTPException, Depends
from typing import Dict
from app.models.review import ReviewSubmit, ReviewQueueItem, ReviewResponse, ReviewQueueParams
from app.services.review_service import ReviewService
from app.api.auth import get_current_user_dependency

router = APIRouter()

# Initialize service
review_service = ReviewService()


@router.get("/queue")
async def get_review_queue(
    params: ReviewQueueParams = Depends(),
    current_user = Depends(get_current_user_dependency)
) -> Dict[str, object]:
    """
    Get documents pending review with filters (only returns documents belonging to authenticated user)
    """
    queue = await review_service.get_review_queue(params, user_id=current_user.id)
    
    return {
        "queue": queue,
        "count": len(queue),
        "skip": params.skip,
        "limit": params.limit
    }


@router.get("/{document_id}", response_model=ReviewResponse)
async def get_review_document(
    document_id: str,
    current_user = Depends(get_current_user_dependency)
) -> ReviewResponse:
    """
    Get document details for review
    """
    document = await review_service.get_review_document(document_id, user_id=current_user.id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return document


@router.post("/{document_id}/submit")
async def submit_review(
    document_id: str,
    review: ReviewSubmit,
    current_user = Depends(get_current_user_dependency)
) -> Dict[str, str]:
    """
    Submit corrected fields and complete review
    """
    success = await review_service.submit_review(
        document_id=document_id,
        corrected_fields=review.corrected_fields,
        reviewer_id=review.reviewer_id,
        comments=review.comments,
        user_id=current_user.id
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Document not found or review failed")
    
    return {
        "message": "Review submitted successfully",
        "document_id": document_id,
        "status": "validated"
    }
