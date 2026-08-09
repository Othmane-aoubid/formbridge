from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Body
from fastapi.responses import StreamingResponse
from typing import Dict, Optional
from pydantic import BaseModel
import uuid
import logging
import csv
import json
import io
import ast
import re
from datetime import datetime
from app.models.document import DocumentCreate, DocumentResponse, UploadSasResponse, DocumentCreateParams, DocumentSearchParams
from app.services.storage_service import StorageService
from app.services.document_service import DocumentService
from app.services.processing_service import ProcessingService
from app.services.service_bus_service import ServiceBusService
from app.core.config import settings
from app.api.auth import get_current_user_dependency


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
    document_type: str = Form(...),
    current_user = Depends(get_current_user_dependency)
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
    
    # Create document record in Cosmos DB with authenticated user's ID
    blob_uri = f"https://{settings.azure_storage_account_name}.blob.core.windows.net/incoming/{document_id}/{filename}"
    document = await document_service.create_document(
        DocumentCreateParams(
            document_id=document_id,
            blob_uri=blob_uri,
            filename=filename,
            content_type=content_type,
            document_type=document_type,
            created_by=current_user.id
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
    document_type: str,
    current_user = Depends(get_current_user_dependency)
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
            created_by=current_user.id
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
async def get_document(
    document_id: str,
    current_user = Depends(get_current_user_dependency)
) -> DocumentResponse:
    """
    Get document metadata and extracted fields
    """
    document = await document_service.get_document_with_ownership_check(document_id, current_user.id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Generate preview URL with SAS token
    preview_url = await storage_service.generate_download_sas(document.blob_uri)
    
    # Add preview_url to response (it's not in the DocumentResponse model but will be included in the dict)
    document_dict = document.model_dump()
    document_dict["previewUrl"] = preview_url
    
    return DocumentResponse(**document_dict)


@router.get("/{document_id}/download")
async def get_download_sas(
    document_id: str,
    current_user = Depends(get_current_user_dependency)
) -> Dict[str, str]:
    """
    Generate a SAS URL for document download
    """
    document = await document_service.get_document_with_ownership_check(document_id, current_user.id)
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
    limit: int = 50,
    current_user = Depends(get_current_user_dependency)
) -> Dict[str, object]:
    """
    Search documents with filters (only returns documents belonging to authenticated user)
    """
    params = DocumentSearchParams(
        query=query,
        document_type=document_type,
        status=status,
        skip=skip,
        limit=limit
    )
    results = await document_service.search_documents(params, user_id=current_user.id)

    return {
        "results": results,
        "count": len(results),
        "skip": skip,
        "limit": limit
    }


@router.post("/{document_id}/reprocess")
async def reprocess_document(
    document_id: str,
    current_user = Depends(get_current_user_dependency)
) -> Dict[str, str]:
    """
    Trigger reprocessing of a document
    """
    document = await document_service.get_document_with_ownership_check(document_id, current_user.id)
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
async def stop_processing(
    document_id: str,
    current_user = Depends(get_current_user_dependency)
) -> Dict[str, str]:
    """
    Stop processing of a document
    """
    document = await document_service.get_document_with_ownership_check(document_id, current_user.id)
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
async def delete_document(
    document_id: str,
    current_user = Depends(get_current_user_dependency)
) -> Dict[str, str]:
    """
    Delete a document
    """
    document = await document_service.get_document_with_ownership_check(document_id, current_user.id)
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
async def export_document(
    document_id: str,
    format: str = "csv",
    current_user = Depends(get_current_user_dependency)
):
    """
    Export a document in specified format (csv, excel, json)
    """
    document = await document_service.get_document_with_ownership_check(document_id, current_user.id)
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
    """Export document as proper CSV table with section, field_name, value columns"""
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header row - consistent 3 columns
    writer.writerow(["section", "field_name", "value"])
    
    # Helper function to write rows
    def write_row(section, field_name, value):
        """Write a single row with proper value handling"""
        if value is None:
            value = ""
        elif isinstance(value, (dict, list)):
            # Convert to valid JSON (double-quoted)
            value = json.dumps(value, default=str, ensure_ascii=False)
        else:
            value = str(value)
            # Handle enum reprs like "DocumentStatus.validated" -> "validated"
            if '.' in value and not value.startswith(('http', 'https', 'ftp')):
                parts = value.split('.')
                if len(parts) == 2 and parts[0][0].isupper() and parts[1].islower():
                    value = parts[1]
            # Handle string values that contain Python literal syntax (single-quoted dicts/lists)
            if (value.startswith('{') and "'" in value) or (value.startswith('[') and "'" in value):
                try:
                    # Parse Python literal and convert to valid JSON
                    parsed = ast.literal_eval(value)
                    value = json.dumps(parsed, default=str, ensure_ascii=False)
                except:
                    pass  # Keep original if parsing fails
            # Handle Python datetime reprs like "datetime.datetime(...)" - convert to ISO string if possible
            if value.startswith('datetime.datetime(') or value.startswith('datetime.date('):
                try:
                    # Extract the datetime string and convert to ISO format
                    match = re.search(r'datetime\.datetime\(([^)]+)\)', value)
                    if match:
                        # Parse the arguments and create ISO string
                        args = match.group(1).split(',')
                        if len(args) >= 6:
                            year, month, day, hour, minute, second = [int(a.strip()) for a in args[:6]]
                            microsecond = int(args[6].strip()) if len(args) > 6 else 0
                            from datetime import datetime as dt
                            iso_str = dt(year, month, day, hour, minute, second, microsecond).isoformat()
                            value = iso_str
                except:
                    pass  # Keep original if conversion fails
        writer.writerow([section, field_name, value])
    
    # Document Info section
    write_row("document_info", "id", document.id)
    write_row("document_info", "filename", document.filename)
    write_row("document_info", "document_type", document.document_type)
    write_row("document_info", "status", document.status)
    write_row("document_info", "created_at", document.created_at)
    write_row("document_info", "created_by", document.created_by if hasattr(document, 'created_by') else "")
    write_row("document_info", "tenant_id", document.tenant_id if hasattr(document, 'tenant_id') else "")
    write_row("document_info", "blob_uri", document.blob_uri if hasattr(document, 'blob_uri') else "")
    write_row("document_info", "content_type", document.content_type if hasattr(document, 'content_type') else "")
    
    # Processing Info section
    write_row("processing_info", "processing_progress", document.processing_progress if hasattr(document, 'processing_progress') else "")
    write_row("processing_info", "processing_step", document.processing_step if hasattr(document, 'processing_step') else "")
    write_row("processing_info", "processing_started_at", document.processing_started_at if hasattr(document, 'processing_started_at') else "")
    write_row("processing_info", "processing_completed_at", document.processing_completed_at if hasattr(document, 'processing_completed_at') else "")
    write_row("processing_info", "processing_error", document.processing_error if hasattr(document, 'processing_error') else "")
    
    # Extracted Fields section
    if hasattr(document, 'extracted_fields') and document.extracted_fields:
        # Convert to dict if it's a Pydantic RootModel
        if hasattr(document.extracted_fields, 'model_dump'):
            extracted_fields = document.extracted_fields.model_dump()
        elif hasattr(document.extracted_fields, 'dict'):
            extracted_fields = document.extracted_fields.dict()
        elif isinstance(document.extracted_fields, dict):
            extracted_fields = document.extracted_fields
        else:
            extracted_fields = {}
        
        for key, value in extracted_fields.items():
            write_row("extracted_fields", key, value)
    
    # Confidence Scores section
    if hasattr(document, 'confidence_scores') and document.confidence_scores:
        # Convert to dict if it's a Pydantic RootModel
        if hasattr(document.confidence_scores, 'model_dump'):
            confidence_scores = document.confidence_scores.model_dump()
        elif hasattr(document.confidence_scores, 'dict'):
            confidence_scores = document.confidence_scores.dict()
        elif isinstance(document.confidence_scores, dict):
            confidence_scores = document.confidence_scores
        else:
            confidence_scores = {}
        
        for key, value in confidence_scores.items():
            write_row("confidence_scores", key, value)
    
    # Key-Value Pairs section
    if hasattr(document, 'key_value_pairs') and document.key_value_pairs:
        if isinstance(document.key_value_pairs, dict):
            for key, value in document.key_value_pairs.items():
                write_row("key_value_pairs", key, value)
    
    # Tables section - export entire table structures as JSON
    if hasattr(document, 'tables') and document.tables:
        for i, table in enumerate(document.tables):
            write_row("tables", f"table_{i+1}", table)
    
    # Paragraphs section - export entire paragraph structures as JSON
    if hasattr(document, 'paragraphs') and document.paragraphs:
        for i, paragraph in enumerate(document.paragraphs):
            write_row("paragraphs", f"paragraph_{i+1}", paragraph)
    
    # OCR Text section - preserve full text in single cell
    if hasattr(document, 'ocr_text') and document.ocr_text:
        write_row("ocr_text", "full_text", document.ocr_text)
    
    # Audit Trail section - convert to proper JSON with ISO timestamps
    if hasattr(document, 'audit') and document.audit:
        for i, audit_entry in enumerate(document.audit):
            # Convert audit entry to proper JSON format
            if isinstance(audit_entry, dict):
                # Convert datetime objects to ISO strings
                audit_json = {}
                for key, val in audit_entry.items():
                    if hasattr(val, 'isoformat'):  # datetime object
                        audit_json[key] = val.isoformat()
                    else:
                        audit_json[key] = val
                write_row("audit_trail", f"entry_{i+1}", audit_json)
            elif isinstance(audit_entry, str):
                # Parse string format like "actor='X' action='Y' timestamp=datetime.datetime(...)"
                try:
                    audit_dict = {}
                    # Parse key='value' pairs using dict and findall for cleaner parsing
                    kv_pattern = r"(\w+)='([^']*)'"
                    audit_dict.update(dict(re.findall(kv_pattern, audit_entry)))
                    
                    # Parse datetime.datetime(...) if present
                    dt_pattern = r"timestamp=datetime\.datetime\(([^)]+)\)"
                    dt_match = re.search(dt_pattern, audit_entry)
                    if dt_match:
                        args = dt_match.group(1).split(',')
                        if len(args) >= 6:
                            year, month, day, hour, minute, second = [int(a.strip()) for a in args[:6]]
                            microsecond = int(args[6].strip()) if len(args) > 6 else 0
                            iso_str = datetime(year, month, day, hour, minute, second, microsecond).isoformat()
                            audit_dict['timestamp'] = iso_str
                    
                    write_row("audit_trail", f"entry_{i+1}", audit_dict)
                except:
                    # Fallback to original string if parsing fails
                    write_row("audit_trail", f"entry_{i+1}", audit_entry)
            else:
                write_row("audit_trail", f"entry_{i+1}", audit_entry)
    
    # Additional Fields section
    document_dict = document.model_dump() if hasattr(document, 'model_dump') else document.dict()
    known_fields = {'id', 'filename', 'document_type', 'status', 'created_at', 'created_by', 'tenant_id', 
                   'blob_uri', 'content_type', 'processing_progress', 'processing_step', 'processing_started_at',
                   'processing_completed_at', 'processing_error', 'extracted_fields', 'confidence_scores',
                   'key_value_pairs', 'tables', 'paragraphs', 'ocr_text', 'audit', 'preview_url'}
    
    additional_fields = {k: v for k, v in document_dict.items() if k not in known_fields and v is not None}
    for key, value in additional_fields.items():
        write_row("additional_fields", key, value)
    
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
async def export_documents_batch(
    request: BatchExportRequest,
    current_user = Depends(get_current_user_dependency)
):
    """
    Export multiple documents in specified format
    """
    if not request.document_ids:
        raise HTTPException(status_code=400, detail="No document IDs provided")
    
    # Verify ownership of ALL requested documents before proceeding
    ownership_verified = await document_service.verify_documents_ownership(
        request.document_ids,
        current_user.id
    )
    
    if not ownership_verified:
        raise HTTPException(status_code=403, detail="You do not have permission to export one or more of the requested documents")
    
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
