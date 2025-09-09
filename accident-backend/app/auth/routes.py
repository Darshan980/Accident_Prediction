# auth/routes.py
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

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

router = APIRouter()

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

# Admin Authentication Routes
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
