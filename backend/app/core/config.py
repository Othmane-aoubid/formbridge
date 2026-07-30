from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Application
    app_name: str = "FormBridge API"
    app_version: str = "1.0.0"
    debug: bool = True
    
    # Azure Storage
    azure_storage_account_url: str
    azure_storage_account_name: str
    azure_storage_account_key: str
    azure_storage_container_incoming: str = "incoming"
    azure_storage_container_processed: str = "processed"
    azure_storage_container_archive: str = "archive"
    
    # Azure Document Intelligence (Form Recognizer)
    azure_document_intelligence_endpoint: str
    azure_document_intelligence_key: str
    
    # Azure Cognitive Search
    azure_search_endpoint: str
    azure_search_key: str
    azure_search_index_name: str = "documents"
    
    # Azure Cosmos DB
    azure_cosmos_endpoint: str
    azure_cosmos_key: str
    azure_cosmos_database_name: str = "formbridge"
    azure_cosmos_container_name: str = "documents"
    
    # Azure Service Bus
    azure_service_bus_connection_string: str
    azure_service_bus_queue_name: str = "document-processing"
    
    # Authentication
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    
    # CORS
    cors_origins: list = ["http://localhost:3000", "http://localhost:8000"]
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "allow"


settings = Settings()
