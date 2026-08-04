import logging
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel, EmailStr

from app.core.config import settings
from app.services.user_service import user_service
from app.models.user import UserCreate, UserResponse as UserResponseModel

logger = logging.getLogger(__name__)

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


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
        logger.info(f"[AUTH_DEBUG] Register request received - email: {user.email}")
        logger.info(f"[AUTH_DEBUG] Password character length: {len(user.password)}")
        logger.info(f"[AUTH_DEBUG] Password UTF-8 byte length: {len(user.password.encode('utf-8'))}")
        
        user_data = UserCreate(
            email=user.email,
            password=user.password,
            first_name=user.first_name,
            last_name=user.last_name
        )
        created_user = await user_service.create_user(user_data)
        logger.info(f"[AUTH_DEBUG] User created successfully - email: {user.email}")
        return UserResponse(
            id=created_user.id,
            email=created_user.email,
            first_name=created_user.first_name,
            last_name=created_user.last_name,
            created_at=created_user.created_at,
            updated_at=created_user.updated_at
        )
    except ValueError as e:
        logger.info(f"[AUTH_DEBUG] Registration ValueError - email: {user.email}, error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[AUTH_DEBUG] Registration exception - email: {user.email}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    logger.info(f"[AUTH_DEBUG] Login request received - username: {form_data.username}")
    logger.info(f"[AUTH_DEBUG] Password character length: {len(form_data.password)}")
    logger.info(f"[AUTH_DEBUG] Password UTF-8 byte length: {len(form_data.password.encode('utf-8'))}")
    
    user = await user_service.authenticate_user(form_data.username, form_data.password)
    if not user:
        logger.info(f"[AUTH_DEBUG] Authentication failed - username: {form_data.username}")
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    logger.info(f"[AUTH_DEBUG] Authentication successful - username: {form_data.username}")
    access_token = create_access_token(data={"sub": user.email})
    return Token(access_token=access_token, token_type="bearer")


@router.get("/me", response_model=UserResponse)
async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid credentials")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user = await user_service.get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        created_at=user.created_at,
        updated_at=user.updated_at
    )
