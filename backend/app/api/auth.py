import logging
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel, EmailStr
import secrets
from azure.communication.email import EmailClient

from app.core.config import settings
from app.services.user_service import user_service
from app.models.user import UserCreate, UserResponse as UserResponseModel, User

logger = logging.getLogger(__name__)

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Simple in-memory storage for password reset tokens (in production, use a database)
password_reset_tokens = {}


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str


class Token(BaseModel):
    access_token: str
    token_type: str


class UserResponse(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    created_at: datetime
    updated_at: datetime


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return encoded_jwt


@router.post("/register", response_model=UserResponse)
async def register(user: UserRegister):
    try:
        user_data = UserCreate(
            email=user.email,
            password=user.password,
            first_name=user.first_name,
            last_name=user.last_name
        )
        created_user = await user_service.create_user(user_data)
        logger.info(f"User registered successfully: {user.email}")
        return UserResponse(
            id=created_user.id,
            email=created_user.email,
            first_name=created_user.first_name,
            last_name=created_user.last_name,
            created_at=created_user.created_at,
            updated_at=created_user.updated_at
        )
    except ValueError as e:
        logger.warning(f"Registration failed for {user.email}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error during registration for {user.email}: {type(e).__name__}")
        raise HTTPException(status_code=500, detail="Registration failed")


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await user_service.authenticate_user(form_data.username, form_data.password)
    if not user:
        logger.warning(f"Authentication failed for {form_data.username}")
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    logger.info(f"Authentication successful for {form_data.username}")
    access_token = create_access_token(data={"sub": user.email})
    return Token(access_token=access_token, token_type="bearer")


async def get_current_user_dependency(token: str = Depends(oauth2_scheme)) -> User:
    """
    Dependency to get the current authenticated user from JWT token.
    Returns the user object for use in other endpoints.
    """
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        email: str = payload.get("sub")
        if email is None:
            logger.warning("Invalid token: missing subject")
            raise HTTPException(status_code=401, detail="Invalid credentials")
    except JWTError as e:
        logger.warning(f"Token validation failed: {type(e).__name__}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user = await user_service.get_user_by_email(email)
    if not user:
        logger.warning(f"User not found: {email}")
        raise HTTPException(status_code=404, detail="User not found")
    
    return user


@router.get("/me", response_model=UserResponse)
async def get_current_user_endpoint(user = Depends(get_current_user_dependency)):
    """
    Get current user profile endpoint.
    """
    return UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        created_at=user.created_at,
        updated_at=user.updated_at
    )


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """
    Initiate password reset by generating a reset token.
    In production, this would send an email with the reset link.
    For now, returns the token for testing purposes.
    """
    user = await user_service.get_user_by_email(request.email)
    if not user:
        # Don't reveal if email exists or not for security
        logger.info(f"Password reset requested for non-existent email: {request.email}")
        return {"message": "If the email exists, a password reset link has been sent"}
    
    # Generate a secure random token
    reset_token = secrets.token_urlsafe(32)
    
    # Store token with expiration (1 hour)
    password_reset_tokens[reset_token] = {
        "user_id": user.id,
        "email": user.email,
        "expires_at": datetime.utcnow() + timedelta(hours=1)
    }
    
    logger.info(f"Password reset token generated for {request.email}")
    
    # Send password reset email using Azure Communication Services
    try:
        email_client = EmailClient.from_connection_string(settings.azure_communication_connection_string)
        
        reset_link = f"{settings.frontend_base_url}/reset-password?token={reset_token}"
        
        message = {
            "senderAddress": settings.senderAddress,
            "recipients": {
                "to": [{"address": user.email}]
            },
            "content": {
                "subject": "Password Reset Request",
                "plainText": f"Click the following link to reset your password: {reset_link}\n\nThis link will expire in 1 hour.",
                "html": f"<p>Click the following link to reset your password:</p><p><a href='{reset_link}'>Reset Password</a></p><p>This link will expire in 1 hour.</p>"
            }
        }
        
        poller = email_client.begin_send(message)
        result = poller.result()
        logger.info(f"Password reset email sent successfully to {user.email}")
    except Exception as e:
        logger.error(f"Failed to send password reset email to {user.email}: {str(e)}")
        # Still return success to avoid revealing user existence, but log the error
    
    return {"message": "If the email exists, a password reset link has been sent"}


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """
    Reset password using a valid reset token.
    """
    if request.token not in password_reset_tokens:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    token_data = password_reset_tokens[request.token]
    
    # Check if token is expired
    if datetime.utcnow() > token_data["expires_at"]:
        del password_reset_tokens[request.token]
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    # Get user and update password
    user = await user_service.get_user_by_email(token_data["email"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Hash new password
    new_hashed_password = user_service.hash_password(request.new_password)
    
    # Update user password in database
    password_updated = await user_service.update_user_password(token_data["email"], new_hashed_password)
    
    if not password_updated:
        raise HTTPException(status_code=500, detail="Failed to update password")
    
    logger.info(f"Password reset successful for {token_data['email']}")
    
    # Remove used token
    del password_reset_tokens[request.token]
    
    return {"message": "Password reset successful"}
