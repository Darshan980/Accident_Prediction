# auth/routes.py - FIXED to handle both field name formats
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, ValidationError, Field
from typing import Optional
import logging

from models.database import get_db, User, Admin
from models.schemas import (
    UserCreate, UserLogin, UserResponse, Token,
    AdminCreate, AdminLogin, AdminResponse, AdminToken
)
from auth.handlers import (
    create_user, authenticate_user, create_admin, authenticate_admin, create_access_token
)
from auth.dependencies import get_current_active_user, get_current_admin
from config.settings import ACCESS_TOKEN_EXPIRE_MINUTES

# Setup logging
logger = logging.getLogger(__name__)

router = APIRouter()

# FIXED Pydantic model to accept both field formats
class PasswordChangeRequest(BaseModel):
    currentPassword: str = Field(alias='current_password')
    newPassword: str = Field(alias='new_password')
    
    class Config:
        # Allow both field names (camelCase and snake_case)
        allow_population_by_field_name = True
        extra = "ignore"

class ProfileUpdateRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    
    class Config:
        extra = "ignore"

# Import password functions
try:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(password: str) -> str:
        return pwd_context.hash(password)
        
except ImportError:
    try:
        from auth.handlers import verify_password, get_password_hash
    except ImportError:
        logger.error("Cannot import password functions")

# User Authentication Routes
@router.post("/register", response_model=UserResponse)
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    try:
        db_user = create_user(db, user)
        return UserResponse(
            id=db_user.id,
            username=db_user.username,
            email=db_user.email,
            is_active=db_user.is_active,
            created_at=db_user.created_at,
            last_login=db_user.last_login
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@router.post("/login", response_model=Token)
async def login_user(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """User login"""
    user = authenticate_user(db, user_credentials.username, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id},
        expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current user information"""
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        last_login=current_user.last_login
    )

@router.put("/me", response_model=UserResponse)
async def update_user_profile(
    user_update: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update current user profile"""
    try:
        updated = False
        
        if user_update.username and user_update.username != current_user.username:
            existing_user = db.query(User).filter(
                User.username == user_update.username,
                User.id != current_user.id
            ).first()
            if existing_user:
                raise HTTPException(status_code=400, detail="Username already exists")
            current_user.username = user_update.username
            updated = True
        
        if user_update.email and user_update.email != current_user.email:
            existing_user = db.query(User).filter(
                User.email == user_update.email,
                User.id != current_user.id
            ).first()
            if existing_user:
                raise HTTPException(status_code=400, detail="Email already exists")
            current_user.email = user_update.email
            updated = True
        
        if user_update.department:
            current_user.department = user_update.department
            updated = True
        
        if updated:
            db.commit()
            db.refresh(current_user)
        
        return UserResponse(
            id=current_user.id,
            username=current_user.username,
            email=current_user.email,
            is_active=current_user.is_active,
            created_at=current_user.created_at,
            last_login=current_user.last_login
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Profile update failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Profile update failed: {str(e)}")

@router.put("/change-password")
async def change_password(
    password_data: PasswordChangeRequest,  # Now properly handles both field formats
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Change user password - FIXED to handle snake_case fields"""
    try:
        logger.info(f"Processing password change for user: {current_user.username}")
        
        current_password = password_data.currentPassword
        new_password = password_data.newPassword
        
        logger.info("Password fields extracted successfully")
        
        # Validate required fields
        if not current_password:
            raise HTTPException(status_code=400, detail="Current password is required")
        
        if not new_password:
            raise HTTPException(status_code=400, detail="New password is required")
        
        # Verify current password
        if not verify_password(current_password, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        
        # Validate new password strength
        if len(new_password) < 6:
            raise HTTPException(
                status_code=400, 
                detail="New password must be at least 6 characters long"
            )
        
        # Check if new password is different
        if verify_password(new_password, current_user.hashed_password):
            raise HTTPException(
                status_code=400, 
                detail="New password must be different from current password"
            )
        
        # Update password
        current_user.hashed_password = get_password_hash(new_password)
        db.commit()
        
        logger.info("Password updated successfully")
        return {"message": "Password updated successfully", "success": True}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Password change failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Password change failed: {str(e)}")

# Admin routes (unchanged)
@router.post("/admin/register", response_model=AdminResponse)
async def register_admin(
    admin: AdminCreate, 
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Register a new admin (requires super admin access)"""
    if not current_admin.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can create new admins"
        )
    
    try:
        db_admin = create_admin(db, admin)
        return AdminResponse(
            id=db_admin.id,
            username=db_admin.username,
            email=db_admin.email,
            is_active=db_admin.is_active,
            is_super_admin=db_admin.is_super_admin,
            permissions=db_admin.permissions.split(",") if db_admin.permissions else [],
            created_at=db_admin.created_at,
            last_login=db_admin.last_login
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Admin registration failed: {str(e)}")

@router.post("/admin/login", response_model=AdminToken)
async def login_admin(admin_credentials: AdminLogin, db: Session = Depends(get_db)):
    """Admin login"""
    admin = authenticate_admin(db, admin_credentials.username, admin_credentials.password)
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect admin credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=60)
    access_token_data = {
        "sub": admin.username,
        "user_id": admin.id,
        "is_admin": True,
        "is_super_admin": admin.is_super_admin,
        "permissions": admin.permissions.split(",") if admin.permissions else []
    }
    access_token = create_access_token(data=access_token_data, expires_delta=access_token_expires)
    
    return AdminToken(
        access_token=access_token,
        token_type="bearer",
        expires_in=60 * 60,
        admin_level="super_admin" if admin.is_super_admin else "admin"
    )

@router.get("/admin/me", response_model=AdminResponse)
async def get_current_admin_info(current_admin: Admin = Depends(get_current_admin)):
    """Get current admin information"""
    return AdminResponse(
        id=current_admin.id,
        username=current_admin.username,
        email=current_admin.email,
        is_active=current_admin.is_active,
        is_super_admin=current_admin.is_super_admin,
        permissions=current_admin.permissions.split(",") if current_admin.permissions else [],
        created_at=current_admin.created_at,
        last_login=current_admin.last_login
    )
