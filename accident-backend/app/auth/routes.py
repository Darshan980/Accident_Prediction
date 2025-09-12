# auth/routes.py - FIXED bcrypt compatibility issue
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

# FIXED: Better bcrypt compatibility handling
def setup_password_context():
    """Setup password context with better error handling"""
    try:
        from passlib.context import CryptContext
        # Use more compatible bcrypt configuration
        return CryptContext(
            schemes=["bcrypt"], 
            deprecated="auto",
            bcrypt__rounds=12,  # Explicit rounds
            bcrypt__ident="2b"  # Explicit bcrypt variant
        )
    except Exception as e:
        logger.warning(f"Passlib bcrypt setup failed: {e}")
        try:
            # Fallback to basic bcrypt
            import bcrypt
            class BasicBcryptContext:
                @staticmethod
                def verify(plain_password: str, hashed_password: str) -> bool:
                    try:
                        return bcrypt.checkpw(
                            plain_password.encode('utf-8'), 
                            hashed_password.encode('utf-8')
                        )
                    except Exception as verify_error:
                        logger.error(f"Password verification failed: {verify_error}")
                        return False
                
                @staticmethod
                def hash(password: str) -> str:
                    try:
                        salt = bcrypt.gensalt()
                        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
                    except Exception as hash_error:
                        logger.error(f"Password hashing failed: {hash_error}")
                        raise
            
            return BasicBcryptContext()
        except Exception as fallback_error:
            logger.error(f"All password context setups failed: {fallback_error}")
            raise

# Initialize password context
try:
    pwd_context = setup_password_context()
    
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify password with better error handling"""
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception as e:
            logger.error(f"Password verification error: {e}")
            return False
    
    def get_password_hash(password: str) -> str:
        """Hash password with better error handling"""
        try:
            return pwd_context.hash(password)
        except Exception as e:
            logger.error(f"Password hashing error: {e}")
            raise HTTPException(status_code=500, detail="Password hashing failed")
            
except Exception as setup_error:
    logger.error(f"Password context setup failed: {setup_error}")
    # Final fallback - import from handlers
    try:
        from auth.handlers import verify_password, get_password_hash
        logger.info("Using password functions from auth.handlers")
    except ImportError:
        logger.error("Cannot import password functions from anywhere")
        raise ImportError("Password handling system unavailable")

# User Authentication Routes
@router.post("/register", response_model=UserResponse)
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    try:
        db_user = create_user(db, user)
        logger.info(f"User registered successfully: {db_user.username}")
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
    """User login with enhanced error logging"""
    try:
        logger.info(f"Login attempt for user: {user_credentials.username}")
        user = authenticate_user(db, user_credentials.username, user_credentials.password)
        if not user:
            logger.warning(f"Login failed for user: {user_credentials.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        logger.info(f"Login successful for user: {user.username}")
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
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail="Login failed")

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
            logger.info(f"Profile updated for user: {current_user.username}")
        
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
    password_data: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Change user password - FIXED with better error handling"""
    try:
        logger.info(f"Processing password change for user: {current_user.username}")
        
        current_password = password_data.currentPassword
        new_password = password_data.newPassword
        
        # Validate required fields
        if not current_password:
            raise HTTPException(status_code=400, detail="Current password is required")
        
        if not new_password:
            raise HTTPException(status_code=400, detail="New password is required")
        
        # Verify current password with better error handling
        try:
            password_valid = verify_password(current_password, current_user.hashed_password)
            if not password_valid:
                raise HTTPException(status_code=400, detail="Current password is incorrect")
        except Exception as verify_error:
            logger.error(f"Password verification failed: {verify_error}")
            raise HTTPException(status_code=500, detail="Password verification failed")
        
        # Validate new password strength
        if len(new_password) < 6:
            raise HTTPException(
                status_code=400, 
                detail="New password must be at least 6 characters long"
            )
        
        # Check if new password is different
        try:
            if verify_password(new_password, current_user.hashed_password):
                raise HTTPException(
                    status_code=400, 
                    detail="New password must be different from current password"
                )
        except Exception as same_check_error:
            logger.warning(f"Could not check if passwords are same: {same_check_error}")
            # Continue anyway since this is not critical
        
        # Update password
        try:
            new_hash = get_password_hash(new_password)
            current_user.hashed_password = new_hash
            db.commit()
            logger.info(f"Password updated successfully for user: {current_user.username}")
        except Exception as hash_error:
            db.rollback()
            logger.error(f"Password hashing/storage failed: {hash_error}")
            raise HTTPException(status_code=500, detail="Failed to update password")
        
        return {"message": "Password updated successfully", "success": True}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Password change failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Password change failed: {str(e)}")

# Admin routes (enhanced error handling)
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
        logger.info(f"Admin registered successfully: {db_admin.username}")
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
        logger.error(f"Admin registration failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Admin registration failed: {str(e)}")

@router.post("/admin/login", response_model=AdminToken)
async def login_admin(admin_credentials: AdminLogin, db: Session = Depends(get_db)):
    """Admin login with enhanced error handling"""
    try:
        logger.info(f"Admin login attempt for: {admin_credentials.username}")
        admin = authenticate_admin(db, admin_credentials.username, admin_credentials.password)
        if not admin:
            logger.warning(f"Admin login failed for: {admin_credentials.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect admin credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        logger.info(f"Admin login successful: {admin.username}")
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
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin login error: {str(e)}")
        raise HTTPException(status_code=500, detail="Admin login failed")

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
