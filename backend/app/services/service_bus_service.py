from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class ServiceBusService:
    def __init__(self):
        self.connection_string = settings.azure_service_bus_connection_string
        self.queue_name = settings.azure_service_bus_queue_name
        self.client = None
        
        # Service Bus disabled - do not initialize client
        logger.info("Service Bus disabled - client not initialized")
    
    async def send_processing_message(
        self,
        document_id: str,
        document_type: str,
        blob_uri: str
    ) -> bool:
        """
        Send a message to the Service Bus queue for document processing
        Service Bus is disabled - always return False to use direct processing fallback
        """
        logger.info(f"Service Bus disabled - using direct processing fallback for document {document_id}")
        return False
    
    async def close(self):
        """
        Close the Service Bus client
        """
        if self.client:
            await self.client.close()
            logger.info("Service Bus client closed")
