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


@router.get("/me", response_model=UserResponse)
async def get_current_user(token: str = Depends(oauth2_scheme)):
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
    
    return UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        created_at=user.created_at,
        updated_at=user.updated_at
    )
