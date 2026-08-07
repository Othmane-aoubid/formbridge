from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Body
from fastapi.responses import StreamingResponse
from typing import Dict, Optional
from pydantic import BaseModel
import uuid
import logging
import csv
import json
import io
from datetime import datetime
from app.models.document import DocumentCreate, DocumentResponse, UploadSasResponse, DocumentCreateParams, DocumentSearchParams
from app.services.storage_service import StorageService
from app.services.document_service import DocumentService
from app.services.processing_service import ProcessingService
from app.services.service_bus_service import ServiceBusService
from app.core.config import settings


class BatchExportRequest(BaseModel):
    document_ids: list[str]
    format: str = "csv"
    
    class Config:
        # Allow both camelCase and snake_case
        extra = "allow"

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize services (in production, use dependency injection)
storage_service = StorageService()
document_service = DocumentService()
processing_service = ProcessingService()
service_bus_service = ServiceBusService()


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
        DocumentCreateParams(
            document_id=document_id,
            blob_uri=blob_uri,
            filename=filename,
            content_type=content_type,
            document_type=document_type,
            created_by="user"
        )
    )
    
    # Send processing message to Service Bus queue for reliable background processing
    message_sent = await service_bus_service.send_processing_message(
        document_id=document_id,
        document_type=document_type,
        blob_uri=blob_uri
    )
    
    if not message_sent:
        # Fallback to direct processing if Service Bus fails
        import asyncio
        logger.info(f"Starting direct processing for document {document_id}")
        task = asyncio.create_task(processing_service.process_document(document_id))
        logger.info(f"Background task created for document {document_id}: {task}")
    
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
        DocumentCreateParams(
            document_id=document_id,
            blob_uri=blob_uri,
            filename=filename,
            content_type=content_type,
            document_type=document_type,
            created_by="user"
        )
    )
    
    # Send processing message to Service Bus queue for reliable background processing
    message_sent = await service_bus_service.send_processing_message(
        document_id=document_id,
        document_type=document_type,
        blob_uri=blob_uri
    )
    
    if not message_sent:
        # Fallback to direct processing if Service Bus fails
        import asyncio
        asyncio.create_task(processing_service.process_document(document_id))
    
    return document


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: str) -> DocumentResponse:
    """
    Get document metadata and extracted fields
    """
    document = await document_service.get_document(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Generate preview URL with SAS token
    preview_url = await storage_service.generate_download_sas(document.blob_uri)
    
    # Add preview_url to response (it's not in the DocumentResponse model but will be included in the dict)
    document_dict = document.model_dump()
    document_dict["previewUrl"] = preview_url
    
    return DocumentResponse(**document_dict)


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


@router.get("")
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
    params = DocumentSearchParams(
        query=query,
        document_type=document_type,
        status=status,
        skip=skip,
        limit=limit
    )
    results = await document_service.search_documents(params)

    return {
        "results": results,
        "count": len(results),
        "skip": skip,
        "limit": limit
    }


@router.post("/{document_id}/reprocess")
async def reprocess_document(document_id: str) -> Dict[str, str]:
    """
    Trigger reprocessing of a document
    """
    document = await document_service.get_document(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Reset processing status
    await document_service.update_document(
        document_id,
        {
            "status": "processing",
            "processingProgress": 0,
            "processingStep": "Reprocessing",
            "processingError": None
        }
    )
    
    # Send processing message to Service Bus queue for reliable background processing
    message_sent = await service_bus_service.send_processing_message(
        document_id=document_id,
        document_type=document.document_type if hasattr(document, 'document_type') else "other",
        blob_uri=document.blob_uri if hasattr(document, 'blob_uri') else ""
    )
    
    if not message_sent:
        # Fallback to direct processing if Service Bus fails
        import asyncio
        logger.info(f"Starting direct processing for document {document_id}")
        task = asyncio.create_task(processing_service.process_document(document_id))
        logger.info(f"Background task created for document {document_id}: {task}")
    
    return {"message": "Document reprocessing started", "document_id": document_id}


@router.post("/{document_id}/stop")
async def stop_processing(document_id: str) -> Dict[str, str]:
    """
    Stop processing of a document
    """
    document = await document_service.get_document(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Update status to indicate processing was stopped
    await document_service.update_document(
        document_id,
        {
            "status": "failed",
            "processingProgress": 0,
            "processingStep": "Stopped",
            "processingError": "Processing stopped by user"
        }
    )

    return {"message": "Document processing stopped", "document_id": document_id}


@router.delete("/{document_id}")
async def delete_document(document_id: str) -> Dict[str, str]:
    """
    Delete a document
    """
    document = await document_service.get_document(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete document from Cosmos DB
    await document_service.delete_document(document_id)

    # Delete blob from Azure Storage
    try:
        await storage_service.delete_blob(document.blob_uri)
    except Exception as e:
        # Log error but don't fail the delete if blob deletion fails
        pass

    return {"message": "Document deleted successfully", "document_id": document_id}


@router.get("/{document_id}/export")
async def export_document(document_id: str, format: str = "csv"):
    """
    Export a document in specified format (csv, excel, json)
    """
    document = await document_service.get_document(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    format = format.lower()
    
    if format == "csv":
        return await _export_csv(document)
    elif format == "excel":
        return await _export_excel(document)
    elif format == "json":
        return await _export_json(document)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")


async def _export_csv(document):
    """Export document as CSV"""
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(["Field", "Value"])
    
    # Basic metadata
    writer.writerow(["Document ID", document.id])
    writer.writerow(["Filename", document.filename])
    writer.writerow(["Document Type", document.document_type.value if hasattr(document, 'document_type') else 'Unknown'])
    writer.writerow(["Status", document.status])
    writer.writerow(["Created At", document.created_at])
    writer.writerow(["Processed At", document.processing_completed_at if hasattr(document, 'processing_completed_at') else 'N/A'])
    writer.writerow([])
    
    # Extracted fields
    if hasattr(document, 'extracted_fields') and document.extracted_fields:
        writer.writerow(["Extracted Fields"])
        # Convert to dict if it's a Pydantic model
        if hasattr(document.extracted_fields, 'dict'):
            extracted_fields = document.extracted_fields.dict()
        elif isinstance(document.extracted_fields, dict):
            extracted_fields = document.extracted_fields
        else:
            extracted_fields = {}
        
        for key, value in extracted_fields.items():
            if value is not None:
                writer.writerow([key, value])
        writer.writerow([])
    
    # Confidence scores
    if hasattr(document, 'confidence_scores') and document.confidence_scores:
        writer.writerow(["Confidence Scores"])
        if hasattr(document.confidence_scores, 'dict'):
            confidence_scores = document.confidence_scores.dict()
        elif isinstance(document.confidence_scores, dict):
            confidence_scores = document.confidence_scores
        else:
            confidence_scores = {}
        
        for key, value in confidence_scores.items():
            if value is not None:
                writer.writerow([key, f"{value:.2%}" if isinstance(value, (int, float)) else value])
        writer.writerow([])
    
    # OCR text (truncated)
    if hasattr(document, 'ocr_text') and document.ocr_text:
        writer.writerow(["OCR Text"])
        writer.writerow([document.ocr_text[:5000]])  # Limit to 5000 chars
    
    output.seek(0)
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={document.filename}.csv"}
    )


async def _export_excel(document):
    """Export document as Excel (simplified as CSV for now)"""
    # For full Excel support, would need openpyxl or xlsxwriter
    # Returning CSV with .xlsx extension for compatibility
    return await _export_csv(document)


async def _export_json(document):
    """Export document as JSON"""
    export_data = {
        "document_id": document.id,
        "filename": document.filename,
        "document_type": document.document_type.value if hasattr(document, 'document_type') else 'Unknown',
        "status": document.status,
        "created_at": document.created_at,
        "processed_at": document.processing_completed_at if hasattr(document, 'processing_completed_at') else None,
        "extracted_fields": document.extracted_fields if hasattr(document, 'extracted_fields') else {},
        "confidence_scores": document.confidence_scores if hasattr(document, 'confidence_scores') else {},
        "ocr_text": document.ocr_text if hasattr(document, 'ocr_text') else None,
        "tables": document.tables if hasattr(document, 'tables') else [],
        "key_value_pairs": document.key_value_pairs if hasattr(document, 'key_value_pairs') else {},
        "exported_at": datetime.utcnow().isoformat()
    }
    
    json_str = json.dumps(export_data, indent=2, default=str)
    
    return StreamingResponse(
        io.BytesIO(json_str.encode('utf-8')),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={document.filename}.json"}
    )


@router.post("/export/batch")
async def export_documents_batch(request: BatchExportRequest):
    """
    Export multiple documents in specified format
    """
    if not request.document_ids:
        raise HTTPException(status_code=400, detail="No document IDs provided")
    
    format = request.format.lower()
    
    documents = []
    for doc_id in request.document_ids:
        document = await document_service.get_document(doc_id)
        if document:
            documents.append(document)
    
    if not documents:
        raise HTTPException(status_code=404, detail="No documents found")
    
    if format == "csv":
        return await _export_batch_csv(documents)
    elif format == "excel":
        return await _export_batch_excel(documents)
    elif format == "json":
        return await _export_batch_json(documents)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")


async def _export_batch_csv(documents):
    """Export multiple documents as CSV"""
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(["Document ID", "Filename", "Type", "Status", "Created At", "Processed At", "Extracted Fields Count"])
    
    for doc in documents:
        extracted_count = 0
        if hasattr(doc, 'extracted_fields') and doc.extracted_fields:
            # Convert to dict if it's a Pydantic model
            if hasattr(doc.extracted_fields, 'dict'):
                extracted_fields_dict = doc.extracted_fields.dict()
                extracted_count = len([k for k, v in extracted_fields_dict.items() if v is not None])
            elif isinstance(doc.extracted_fields, dict):
                extracted_count = len([k for k, v in doc.extracted_fields.items() if v is not None])
        
        writer.writerow([
            doc.id,
            doc.filename,
            doc.document_type.value if hasattr(doc, 'document_type') else 'Unknown',
            doc.status,
            doc.created_at,
            doc.processing_completed_at if hasattr(doc, 'processing_completed_at') else 'N/A',
            extracted_count
        ])
    
    output.seek(0)
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=documents_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"}
    )


async def _export_batch_excel(documents):
    """Export multiple documents as Excel (simplified as CSV for now)"""
    return await _export_batch_csv(documents)


async def _export_batch_json(documents):
    """Export multiple documents as JSON"""
    export_data = {
        "export_date": datetime.utcnow().isoformat(),
        "document_count": len(documents),
        "documents": []
    }
    
    for doc in documents:
        doc_data = {
            "document_id": doc.id,
            "filename": doc.filename,
            "document_type": doc.document_type.value if hasattr(doc, 'document_type') else 'Unknown',
            "status": doc.status,
            "created_at": doc.created_at,
            "processed_at": doc.processing_completed_at if hasattr(doc, 'processing_completed_at') else None,
            "extracted_fields": doc.extracted_fields if hasattr(doc, 'extracted_fields') else {},
            "confidence_scores": doc.confidence_scores if hasattr(doc, 'confidence_scores') else {}
        }
        export_data["documents"].append(doc_data)
    
    json_str = json.dumps(export_data, indent=2, default=str)
    
    return StreamingResponse(
        io.BytesIO(json_str.encode('utf-8')),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=documents_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"}
    )


@router.post("/fix-stuck-processing", response_model=None)
async def fix_stuck_processing() -> Dict[str, str]:
    """
    Fix documents that are stuck in processing status
    """
    await processing_service.fix_stuck_processing_documents()
    return {"message": "Fixed stuck processing documents"}
