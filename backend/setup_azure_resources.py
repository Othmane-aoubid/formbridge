"""
Setup script to create Azure resources for FormBridge.
Run this after configuring your .env file.
"""

import os
from dotenv import load_dotenv
from azure.cosmos import CosmosClient, PartitionKey
from azure.storage.blob import BlobServiceClient

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
    print("Setting up Cosmos DB...")
    
    if not COSMOS_ENDPOINT or not COSMOS_KEY:
        print("✗ Missing Cosmos DB credentials in .env")
        return False
    
    try:
        client = CosmosClient(COSMOS_ENDPOINT, COSMOS_KEY)
        
        # Create database
        database = client.create_database_if_not_exists(id=COSMOS_DATABASE_NAME)
        print(f"✓ Database '{COSMOS_DATABASE_NAME}' created/verified")
        
        # Create container (serverless accounts don't support throughput setting)
        container = database.create_container_if_not_exists(
            id=COSMOS_CONTAINER_NAME,
            partition_key=PartitionKey(path="/id")
        )
        print(f"✓ Container '{COSMOS_CONTAINER_NAME}' created/verified")
        
        # Create users container for authentication
        users_container = database.create_container_if_not_exists(
            id=COSMOS_USERS_CONTAINER_NAME,
            partition_key=PartitionKey(path="/email")
        )
        print(f"✓ Container '{COSMOS_USERS_CONTAINER_NAME}' created/verified")
        
        return True
    except Exception as e:
        print(f"✗ Error setting up Cosmos DB: {e}")
        return False


def setup_storage_containers():
    """Create Storage blob containers"""
    print("\nSetting up Storage containers...")
    
    if not STORAGE_ACCOUNT_URL or not STORAGE_ACCOUNT_KEY:
        print("✗ Missing Storage credentials in .env")
        print("  Please add AZURE_STORAGE_ACCOUNT_KEY to your .env file")
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
                print(f"✓ Container '{container_name}' created")
            else:
                print(f"✓ Container '{container_name}' already exists")
        
        return True
    except Exception as e:
        print(f"✗ Error setting up Storage containers: {e}")
        return False


def main():
    print("=== FormBridge Azure Resources Setup ===\n")
    
    cosmos_success = setup_cosmos_db()
    storage_success = setup_storage_containers()
    
    print("\n=== Setup Summary ===")
    print(f"Cosmos DB: {'✓ Success' if cosmos_success else '✗ Failed'}")
    print(f"Storage: {'✓ Success' if storage_success else '✗ Failed'}")
    
    if cosmos_success and storage_success:
        print("\n✓ All resources set up successfully!")
    else:
        print("\n✗ Some resources failed to set up. Check the errors above.")


if __name__ == "__main__":
    main()
