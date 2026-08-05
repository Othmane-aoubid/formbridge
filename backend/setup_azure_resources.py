"""
Setup script to create Azure resources for FormBridge.
Run this after configuring your .env file.
"""

import os
import logging
from dotenv import load_dotenv
from azure.cosmos import CosmosClient, PartitionKey
from azure.storage.blob import BlobServiceClient
from azure.core.exceptions import AzureError

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Configuration
COSMOS_ENDPOINT = os.getenv("AZURE_COSMOS_ENDPOINT")
COSMOS_KEY = os.getenv("AZURE_COSMOS_KEY")
COSMOS_DATABASE_NAME = os.getenv("AZURE_COSMOS_DATABASE_NAME", "formbridge")
COSMOS_CONTAINER_NAME = os.getenv("AZURE_COSMOS_CONTAINER_NAME", "documents")
COSMOS_USERS_CONTAINER_NAME = "users"

STORAGE_ACCOUNT_URL = os.getenv("AZURE_STORAGE_ACCOUNT_URL")
STORAGE_ACCOUNT_KEY = os.getenv("AZURE_STORAGE_ACCOUNT_KEY")
CONTAINER_INCOMING = os.getenv("AZURE_STORAGE_CONTAINER_INCOMING", "incoming")
CONTAINER_PROCESSED = os.getenv("AZURE_STORAGE_CONTAINER_PROCESSED", "processed")
CONTAINER_ARCHIVE = os.getenv("AZURE_STORAGE_CONTAINER_ARCHIVE", "archive")


def setup_cosmos_db():
    """Create Cosmos DB database and container"""
    logger.info("Setting up Cosmos DB...")
    
    if not COSMOS_ENDPOINT or not COSMOS_KEY:
        logger.error("Missing Cosmos DB credentials in .env")
        return False
    
    try:
        client = CosmosClient(COSMOS_ENDPOINT, COSMOS_KEY)
        
        # Create database
        database = client.create_database_if_not_exists(id=COSMOS_DATABASE_NAME)
        logger.info(f"Database '{COSMOS_DATABASE_NAME}' created/verified")
        
        # Create container (serverless accounts don't support throughput setting)
        container = database.create_container_if_not_exists(
            id=COSMOS_CONTAINER_NAME,
            partition_key=PartitionKey(path="/id")
        )
        logger.info(f"Container '{COSMOS_CONTAINER_NAME}' created/verified")
        
        # Create users container for authentication
        users_container = database.create_container_if_not_exists(
            id=COSMOS_USERS_CONTAINER_NAME,
            partition_key=PartitionKey(path="/email")
        )
        logger.info(f"Container '{COSMOS_USERS_CONTAINER_NAME}' created/verified")
        
        return True
    except AzureError as e:
        logger.error(f"Azure error setting up Cosmos DB: {type(e).__name__}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error setting up Cosmos DB: {type(e).__name__}")
        return False


def setup_storage_containers():
    """Create Storage blob containers"""
    logger.info("Setting up Storage containers...")
    
    if not STORAGE_ACCOUNT_URL or not STORAGE_ACCOUNT_KEY:
        logger.error("Missing Storage credentials in .env")
        logger.error("Please add AZURE_STORAGE_ACCOUNT_KEY to your .env file")
        return False
    
    try:
        blob_service_client = BlobServiceClient(
            account_url=STORAGE_ACCOUNT_URL,
            credential=STORAGE_ACCOUNT_KEY
        )
        
        containers = [
            CONTAINER_INCOMING,
            CONTAINER_PROCESSED,
            CONTAINER_ARCHIVE
        ]
        
        for container_name in containers:
            container_client = blob_service_client.get_container_client(container_name)
            if not container_client.exists():
                blob_service_client.create_container(container_name)
                logger.info(f"Container '{container_name}' created")
            else:
                logger.info(f"Container '{container_name}' already exists")
        
        return True
    except AzureError as e:
        logger.error(f"Azure error setting up Storage containers: {type(e).__name__}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error setting up Storage containers: {type(e).__name__}")
        return False


def main():
    logger.info("=== FormBridge Azure Resources Setup ===")
    
    cosmos_success = setup_cosmos_db()
    storage_success = setup_storage_containers()
    
    logger.info("=== Setup Summary ===")
    logger.info(f"Cosmos DB: {'Success' if cosmos_success else 'Failed'}")
    logger.info(f"Storage: {'Success' if storage_success else 'Failed'}")
    
    if cosmos_success and storage_success:
        logger.info("All resources set up successfully!")
    else:
        logger.error("Some resources failed to set up. Check the errors above.")


if __name__ == "__main__":
    main()
