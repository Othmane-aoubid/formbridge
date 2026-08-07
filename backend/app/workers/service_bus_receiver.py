import asyncio
import json
import logging
from app.core.config import settings
from app.services.processing_service import ProcessingService

logger = logging.getLogger(__name__)


class ServiceBusReceiver:
    def __init__(self):
        self.connection_string = settings.azure_service_bus_connection_string
        self.queue_name = settings.azure_service_bus_queue_name
        self.processing_service = ProcessingService()
        self.running = False
        
    async def receive_messages(self):
        """
        Continuously receive and process messages from Service Bus queue
        Service Bus is disabled - this method does nothing
        """
        logger.info("Service Bus receiver disabled - using direct processing fallback")
        return
    
    def stop(self):
        """
        Stop the receiver
        """
        self.running = False
        logger.info("Service Bus receiver stop signal sent")


async def start_receiver():
    """
    Start the Service Bus receiver (can be called from main.py)
    """
    receiver = ServiceBusReceiver()
    await receiver.receive_messages()
