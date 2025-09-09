# auth/handlers.py
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from fastapi import HTTPException

from config.settings import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from models.database import User, Admin
from models.schemas import UserCreate, AdminCreate

logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a plain password"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str) -> Optional[dict]:
    """Verify JWT token and extract payload"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
        return {"username": username, "user_id": payload.get("user_id")}
    except JWTError:
        return None

# User operations
def get_user_by_username(db: Session, username: str) -> Optional[User]:
    """Get user by username"""
    return db.query(User).filter(User.username == username).first()

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Get user by email"""
    return db.query(User).filter(User.email == email).first()

def create_user(db: Session, user: UserCreate) -> User:
    """Create a new user"""
    if get_user_by_username(db, user.username):
        raise HTTPException(status_code=400, detail="Username already registered")
    if get_user_by_email(db, user.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    db_user = User(username=user.username, email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    """Authenticate user credentials"""
    user = get_user_by_username(db, username)
    if not user or not verify_password(password, user.hashed_password):
        return None
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    return user

# Admin operations
def get_admin_by_username(db: Session, username: str) -> Optional[Admin]:
    """Get admin by username"""
    return db.query(Admin).filter(Admin.username == username).first()

def create_admin(db: Session, admin: AdminCreate) -> Admin:
    """Create a new admin"""
    if get_admin_by_username(db, admin.username):
        raise HTTPException(status_code=400, detail="Admin username already registered")
    
    permissions = ["view_logs", "update_log_status", "view_dashboard", "manage_users", "system_settings"]
    if admin.is_super_admin:
        permissions.extend(["delete_logs", "manage_admins", "database_access", "export_data"])
    
    hashed_password = get_password_hash(admin.password)
    db_admin = Admin(
        username=admin.username,
        email=admin.email,
        hashed_password=hashed_password,
        is_super_admin=admin.is_super_admin,
        permissions=",".join(permissions)
    )
    db.add(db_admin)
    db.commit()
    db.refresh(db_admin)
    return db_admin

def authenticate_admin(db: Session, username: str, password: str) -> Optional[Admin]:
    """Authenticate admin credentials"""
    admin = get_admin_by_username(db, username)
    if not admin or not verify_password(password, admin.hashed_password):
        return None
    admin.last_login = datetime.now(timezone.utc)
    db.commit()
    return admin

def create_default_super_admin(db: Session):
    """Create default super admin if none exists"""
    try:
        existing_admin = db.query(Admin).filter(Admin.is_super_admin == True).first()
        if not existing_admin:
            default_admin = AdminCreate(
                username="superadmin",
                email="admin@example.com", 
                password="admin123",
                is_super_admin=True
            )
            create_admin(db, default_admin)
            logger.info("Default super admin created: username='superadmin', password='admin123'")
    except Exception as e:
        logger.error(f"Error creating default super admin: {str(e)}")
