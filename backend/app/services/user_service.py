import logging
from azure.cosmos import CosmosClient, PartitionKey
from passlib.context import CryptContext
from typing import Optional
from app.core.config import settings
from app.models.user import User, UserCreate

logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UserService:
    def __init__(self):
        self.client = CosmosClient(settings.azure_cosmos_endpoint, settings.azure_cosmos_key)
        self.database = self.client.get_database_client(settings.azure_cosmos_database_name)
        self.container = self.database.get_container_client("users")
    
    def hash_password(self, password: str) -> str:
        logger.info(f"[AUTH_DEBUG] Password hashing started")
        hashed = pwd_context.hash(password)
        logger.info(f"[AUTH_DEBUG] Password hashing finished - hash length: {len(hashed)}")
        return hashed
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        logger.info(f"[AUTH_DEBUG] Password verification started - stored hash length: {len(hashed_password)}")
        result = pwd_context.verify(plain_password, hashed_password)
        logger.info(f"[AUTH_DEBUG] Password verification result: {result}")
        return result
    
    async def create_user(self, user_data: UserCreate) -> User:
        # Check if user already exists
        query = "SELECT * FROM c WHERE c.email = @email"
        parameters = [{"name": "@email", "value": user_data.email}]
        existing = list(self.container.query_items(
            query=query,
            parameters=parameters,
            enable_cross_partition_query=True
        ))
        
        if existing:
            logger.info(f"[AUTH_DEBUG] User already exists - email: {user_data.email}")
            raise ValueError("User with this email already exists")
        
        logger.info(f"[AUTH_DEBUG] User does not exist, proceeding with creation - email: {user_data.email}")
        
        # Create new user
        user = User(
            email=user_data.email,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            hashed_password=self.hash_password(user_data.password)
        )
        
        # Convert datetime to ISO string for JSON serialization
        user_dict = user.model_dump()
        user_dict['created_at'] = user.created_at.isoformat()
        user_dict['updated_at'] = user.updated_at.isoformat()
        
        self.container.create_item(body=user_dict)
        logger.info(f"[AUTH_DEBUG] Database insert successful - email: {user_data.email}")
        return user
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        query = "SELECT * FROM c WHERE c.email = @email"
        parameters = [{"name": "@email", "value": email}]
        results = list(self.container.query_items(
            query=query,
            parameters=parameters,
            enable_cross_partition_query=True
        ))
        
        if results:
            return User(**results[0])
        return None
    
    async def authenticate_user(self, email: str, password: str) -> Optional[User]:
        user = await self.get_user_by_email(email)
        if not user:
            logger.info(f"[AUTH_DEBUG] User not found - email: {email}")
            return None
        logger.info(f"[AUTH_DEBUG] User found - email: {email}")
        if not self.verify_password(password, user.hashed_password):
            logger.info(f"[AUTH_DEBUG] Password verification failed - email: {email}")
            return None
        return user


user_service = UserService()
