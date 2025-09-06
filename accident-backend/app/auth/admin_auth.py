# auth/admin_auth.py
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from pydantic import BaseModel
from jose import JWTError, jwt
from .user_auth import (
    verify_password, get_password_hash, 
    create_access_token, SECRET_KEY, ALGORITHM
)

# Get database base
Base = declarative_base()

# Admin Database Model
class Admin(Base):
    __tablename__ = "admins"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_super_admin = Column(Boolean, default=False)
    permissions = Column(Text, nullable=True)  # JSON string of permissions
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(Integer, nullable=True)  # ID of admin who created this admin

# Pydantic Models
class AdminCreate(BaseModel):
    username: str
    email: str
    password: str
    is_super_admin: bool = False
    permissions: Optional[List[str]] = None

class AdminLogin(BaseModel):
    username: str
    password: str

class AdminResponse(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool
    is_super_admin: bool
    permissions: Optional[List[str]] = None
    created_at: datetime
    last_login: Optional[datetime] = None

class AdminToken(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    admin_level: str

# Default Admin Permissions
DEFAULT_ADMIN_PERMISSIONS = [
    "view_logs",
    "update_log_status", 
    "view_dashboard",
    "manage_users",
    "system_settings"
]

SUPER_ADMIN_PERMISSIONS = [
    "view_logs",
    "update_log_status",
    "delete_logs",
    "view_dashboard",
    "manage_users",
    "manage_admins",
    "system_settings",
    "database_access",
    "export_data"
]

# Database Operations
def get_admin_by_username(db: Session, username: str) -> Optional[Admin]:
    """Get admin by username"""
    return db.query(Admin).filter(Admin.username == username).first()

def get_admin_by_email(db: Session, email: str) -> Optional[Admin]:
    """Get admin by email"""
    return db.query(Admin).filter(Admin.email == email).first()

def get_admin_by_id(db: Session, admin_id: int) -> Optional[Admin]:
    """Get admin by ID"""
    return db.query(Admin).filter(Admin.id == admin_id).first()

def create_admin(db: Session, admin: AdminCreate, created_by_id: Optional[int] = None) -> Admin:
    """Create new admin"""
    # Check if admin already exists
    if get_admin_by_username(db, admin.username):
        raise HTTPException(
            status_code=400,
            detail="Admin username already registered"
        )
    
    if get_admin_by_email(db, admin.email):
        raise HTTPException(
            status_code=400,
            detail="Admin email already registered"
        )
    
    # Set permissions
    permissions = admin.permissions or (SUPER_ADMIN_PERMISSIONS if admin.is_super_admin else DEFAULT_ADMIN_PERMISSIONS)
    
    # Create new admin
    hashed_password = get_password_hash(admin.password)
    db_admin = Admin(
        username=admin.username,
        email=admin.email,
        hashed_password=hashed_password,
        is_super_admin=admin.is_super_admin,
        permissions=",".join(permissions),
        created_by=created_by_id
    )
    
    db.add(db_admin)
    db.commit()
    db.refresh(db_admin)
    return db_admin

def authenticate_admin(db: Session, username: str, password: str) -> Optional[Admin]:
    """Authenticate admin credentials"""
    admin = get_admin_by_username(db, username)
    if not admin:
        return None
    if not verify_password(password, admin.hashed_password):
        return None
    
    # Update last login
    admin.last_login = datetime.now(timezone.utc)
    db.commit()
    
    return admin

def create_admin_access_token(admin: Admin) -> str:
    """Create JWT token for admin"""
    access_token_expires = timedelta(minutes=60)  # Longer session for admins
    access_token_data = {
        "sub": admin.username,
        "user_id": admin.id,
        "is_admin": True,
        "is_super_admin": admin.is_super_admin,
        "permissions": admin.permissions.split(",") if admin.permissions else []
    }
    return create_access_token(data=access_token_data, expires_delta=access_token_expires)

# Admin Management Functions
def get_all_admins(db: Session) -> List[Admin]:
    """Get all admins"""
    return db.query(Admin).all()

def update_admin_permissions(db: Session, admin_id: int, permissions: List[str]) -> Admin:
    """Update admin permissions"""
    admin = get_admin_by_id(db, admin_id)
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    admin.permissions = ",".join(permissions)
    db.commit()
    db.refresh(admin)
    return admin

def deactivate_admin(db: Session, admin_id: int) -> Admin:
    """Deactivate admin account"""
    admin = get_admin_by_id(db, admin_id)
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    admin.is_active = False
    db.commit()
    db.refresh(admin)
    return admin

def create_default_super_admin(db: Session):
    """Create default super admin if none exists"""
    existing_admin = db.query(Admin).filter(Admin.is_super_admin == True).first()
    
    if not existing_admin:
        default_admin = AdminCreate(
            username="superadmin",
            email="admin@example.com",
            password="admin123",  # Change this!
            is_super_admin=True
        )
        create_admin(db, default_admin)
        print("Default super admin created: username='superadmin', password='admin123'")
        print("IMPORTANT: Change the default password immediately!")