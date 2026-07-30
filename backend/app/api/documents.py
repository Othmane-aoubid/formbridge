from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import Dict, Optional
import uuid
from app.models.document import DocumentCreate, DocumentResponse, UploadSasResponse
from app.services.storage_service import StorageService
from app.services.document_service import DocumentService
from app.core.config import settings

router = APIRouter()

# Initialize services (in production, use dependency injection)
storage_service = StorageService()
document_service = DocumentService()


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    filename: str = Form(...),
    content_type: str = Form(...),
    document_type: str = Form(...)
) -> DocumentResponse:
    """
    Upload document to Azure Storage and create record in Cosmos DB
    """
    document_id = str(uuid.uuid4())
    
    # Generate SAS URL for upload
    sas_url = await storage_service.generate_upload_sas(
        filename=filename,
        document_id=document_id,
        content_type=content_type
    )
    
    # Upload file to Azure Storage
    import requests
    file_content = await file.read()
    requests.put(sas_url, data=file_content, headers={
        'x-ms-blob-type': 'BlockBlob',
        'Content-Type': content_type
    })
    
    # Create document record in Cosmos DB
    blob_uri = f"https://{settings.azure_storage_account_name}.blob.core.windows.net/incoming/{document_id}/{filename}"
    document = await document_service.create_document(
        document_id=document_id,
        blob_uri=blob_uri,
        filename=filename,
        content_type=content_type,
        document_type=document_type,
        created_by="user"
    )
    
    return document


@router.post("/upload/complete")
async def complete_upload(
    document_id: str,
    filename: str,
    content_type: str,
    document_type: str
) -> DocumentResponse:
    """
    Create document record in Cosmos DB after successful upload
    """
    blob_uri = f"https://{settings.azure_storage_account_name}.blob.core.windows.net/incoming/{document_id}/{filename}"
    
    document = await document_service.create_document(
        document_id=document_id,
        blob_uri=blob_uri,
        filename=filename,
        content_type=content_type,
        document_type=document_type,
        created_by="user"
    )
    
    return document


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: str) -> DocumentResponse:
    """
    Get document metadata and extracted fields
    """
    document = await document_service.get_document(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return document


@router.get("/{document_id}/download")
async def get_download_sas(document_id: str) -> Dict[str, str]:
    """
    Generate a SAS URL for document download
    """
    document = await document_service.get_document(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    sas_url = await storage_service.generate_download_sas(document.blob_uri)
    return {"download_sas_url": sas_url}


@router.get("/")
async def search_documents(
    query: Optional[str] = None,
    document_type: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
) -> Dict[str, object]:
    """
    Search documents with filters
    """
    results = await document_service.search_documents(
        query=query,
        document_type=document_type,
        status=status,
        skip=skip,
        limit=limit
    )
    
    return {
        "results": results,
        "count": len(results),
        "skip": skip,
        "limit": limit
    }
