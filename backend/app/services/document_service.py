from typing import Optional, List, Dict, Any, Union
from azure.cosmos import CosmosClient, PartitionKey
from app.core.config import settings
from app.models.document import DocumentResponse, DocumentStatus, DocumentType
import logging
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)


class DocumentService:
    def __init__(self):
        self.client = CosmosClient(
            url=settings.azure_cosmos_endpoint,
            credential=settings.azure_cosmos_key
        )
        self.database = self.client.get_database_client(settings.azure_cosmos_database_name)
        self.container = self.database.get_container_client(settings.azure_cosmos_container_name)
        
        # Create database and container if they don't exist
        self._initialize_database()
    
    def _initialize_database(self):
        """Initialize Cosmos DB database and container"""
        try:
            if not self.database:
                self.client.create_database(settings.azure_cosmos_database_name)
            
            if not self.container:
                self.database.create_container(
                    id=settings.azure_cosmos_container_name,
                    partition_key=PartitionKey(path="/id")
                )
            logger.info("Cosmos DB initialized successfully")
        except Exception as e:
            logger.warning(f"Cosmos DB initialization warning: {str(e)}")
    
    async def create_document(
        self,
        document_id: str,
        blob_uri: str,
        filename: str,
        content_type: str,
        document_type: Union[DocumentType, str],
        tenant_id: Optional[str] = None,
        created_by: Optional[str] = None
    ) -> DocumentResponse:
        """
        Create a new document record
        """
        try:
            # Convert string to DocumentType if needed
            if isinstance(document_type, str):
                document_type = DocumentType(document_type)

            document = {
                "id": document_id,
                "tenantId": tenant_id,
                "blobUri": blob_uri,
                "filename": filename,
                "contentType": content_type,
                "documentType": document_type.value,
                "extractedFields": {},
                "confidenceScores": {},
                "status": DocumentStatus.ingested.value,
                "createdBy": created_by,
                "createdAt": datetime.utcnow().isoformat(),
                "audit": [
                    {
                        "actor": created_by or "system",
                        "action": "ingest",
                        "timestamp": datetime.utcnow().isoformat()
                    }
                ]
            }
            
            self.container.create_item(body=document)
            logger.info(f"Created document record {document_id}")
            
            return DocumentResponse(**document)
            
        except Exception as e:
            logger.error(f"Error creating document: {str(e)}")
            raise
    
    async def get_document(self, document_id: str) -> Optional[DocumentResponse]:
        """
        Get a document by ID
        """
        try:
            item = self.container.read_item(item=document_id, partition_key=document_id)
            return DocumentResponse(**item)
        except Exception as e:
            logger.error(f"Error getting document {document_id}: {str(e)}")
            return None
    
    async def update_document(
        self,
        document_id: str,
        updates: Dict[str, Any]
    ) -> Optional[DocumentResponse]:
        """
        Update document fields
        """
        try:
            item = self.container.read_item(item=document_id, partition_key=document_id)
            item.update(updates)

            # Convert RootModel objects to dicts for JSON serialization
            if "extractedFields" in item and hasattr(item["extractedFields"], "model_dump"):
                item["extractedFields"] = item["extractedFields"].model_dump()
            if "confidenceScores" in item and hasattr(item["confidenceScores"], "model_dump"):
                item["confidenceScores"] = item["confidenceScores"].model_dump()

            # Add audit entry
            if "audit" in item:
                item["audit"].append({
                    "actor": updates.get("updated_by", "system"),
                    "action": "update",
                    "timestamp": datetime.utcnow().isoformat()
                })

            updated_item = self.container.replace_item(item=document_id, body=item)
            logger.info(f"Updated document {document_id}")

            return DocumentResponse(**updated_item)

        except Exception as e:
            logger.error(f"Error updating document {document_id}: {str(e)}")
            return None
    
    async def update_status(
        self,
        document_id: str,
        status: DocumentStatus,
        actor: str = "system"
    ) -> Optional[DocumentResponse]:
        """
        Update document status
        """
        return await self.update_document(
            document_id,
            {
                "status": status.value,
                "updated_by": actor
            }
        )
    
    async def delete_document(self, document_id: str) -> bool:
        """
        Delete a document from Cosmos DB
        """
        try:
            self.container.delete_item(item=document_id, partition_key=document_id)
            logger.info(f"Deleted document {document_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting document {document_id}: {str(e)}")
            return False

    async def search_documents(
        self,
        query: Optional[str] = None,
        document_type: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[DocumentResponse]:
        """
        Search documents with filters
        """
        try:
            query_string = "SELECT * FROM c WHERE 1=1"
            parameters = []

            if query:
                query_string += " AND CONTAINS(c.filename, @query)"
                parameters.append({"name": "@query", "value": query})

            if document_type:
                query_string += " AND c.documentType = @documentType"
                parameters.append({"name": "@documentType", "value": document_type})

            if status:
                query_string += " AND c.status = @status"
                parameters.append({"name": "@status", "value": status})

            query_string += f" ORDER BY c.createdAt DESC OFFSET {skip} LIMIT {limit}"

            items = list(self.container.query_items(
                query=query_string,
                parameters=parameters,
                enable_cross_partition_query=True
            ))
            
            return [DocumentResponse(**item) for item in items]
            
        except Exception as e:
            logger.error(f"Error searching documents: {str(e)}")
            return []
