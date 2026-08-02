from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions
from datetime import datetime, timedelta
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class StorageService:
    def __init__(self):
        self.blob_service_client = BlobServiceClient(
            account_url=settings.azure_storage_account_url,
            credential=settings.azure_storage_account_key
        )
    
    async def generate_upload_sas(
        self,
        filename: str,
        document_id: str,
        content_type: str = "application/pdf"
    ) -> str:
        """
        Generate a SAS URL for uploading a document
        """
        try:
            container_client = self.blob_service_client.get_container_client(
                settings.azure_storage_container_incoming
            )
            
            # Create container if it doesn't exist
            if not container_client.exists():
                container_client.create_container()
            
            # Create blob client with document ID as blob name
            blob_name = f"{document_id}/{filename}"
            blob_client = container_client.get_blob_client(blob_name)
            
            # Generate SAS token (simplified - in production use user delegation SAS)
            sas_token = generate_blob_sas(
                account_name=self.blob_service_client.account_name,
                container_name=settings.azure_storage_container_incoming,
                blob_name=blob_name,
                account_key=settings.azure_storage_account_key,
                permission=BlobSasPermissions(write=True),
                expiry=datetime.utcnow() + timedelta(hours=1)
            )
            
            sas_url = f"{settings.azure_storage_account_url}/{settings.azure_storage_container_incoming}/{blob_name}?{sas_token}"
            logger.info(f"Generated upload SAS for document {document_id}")
            
            return sas_url
            
        except Exception as e:
            logger.error(f"Error generating upload SAS: {str(e)}")
            raise
    
    async def generate_download_sas(self, blob_uri: str) -> str:
        """
        Generate a SAS URL for downloading a document
        """
        try:
            # Parse blob URI to extract container and blob name
            # Format: https://account.blob.core.windows.net/container/blob
            uri_parts = blob_uri.replace(f"{settings.azure_storage_account_url}/", "").split("/")
            container_name = uri_parts[0]
            blob_name = "/".join(uri_parts[1:])
            
            sas_token = generate_blob_sas(
                account_name=self.blob_service_client.account_name,
                container_name=container_name,
                blob_name=blob_name,
                account_key=settings.azure_storage_account_key,
                permission=BlobSasPermissions(read=True),
                expiry=datetime.utcnow() + timedelta(hours=1)
            )
            
            sas_url = f"{blob_uri}?{sas_token}"
            logger.info(f"Generated download SAS for blob {blob_name}")
            
            return sas_url
            
        except Exception as e:
            logger.error(f"Error generating download SAS: {str(e)}")
            raise
    
    async def move_blob(
        self,
        source_container: str,
        source_blob: str,
        destination_container: str
    ) -> None:
        """
        Move a blob from source to destination container
        """
        try:
            source_client = self.blob_service_client.get_blob_client(
                container=source_container,
                blob=source_blob
            )
            dest_client = self.blob_service_client.get_blob_client(
                container=destination_container,
                blob=source_blob
            )

            # Copy blob to destination
            dest_client.start_copy_from_url(source_client.url)

            # Delete source after copy
            source_client.delete_blob()

            logger.info(f"Moved blob from {source_container} to {destination_container}")

        except Exception as e:
            logger.error(f"Error moving blob: {str(e)}")
            raise

    async def delete_blob(self, blob_uri: str) -> None:
        """
        Delete a blob from Azure Storage
        """
        try:
            # Parse blob URI to extract container and blob name
            uri_parts = blob_uri.replace(f"{settings.azure_storage_account_url}/", "").split("/")
            container_name = uri_parts[0]
            blob_name = "/".join(uri_parts[1:])

            blob_client = self.blob_service_client.get_blob_client(
                container=container_name,
                blob=blob_name
            )

            blob_client.delete_blob()
            logger.info(f"Deleted blob {blob_name} from container {container_name}")

        except Exception as e:
            logger.error(f"Error deleting blob: {str(e)}")
            raise
