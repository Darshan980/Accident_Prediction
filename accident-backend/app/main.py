# Enhanced main.py with SIMPLE and RELIABLE CORS fix
from fastapi import FastAPI, UploadFile, File, HTTPException, WebSocket, WebSocketDisconnect, Depends, Query, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta
import logging
import json
import base64
import asyncio
import time
import cv2
import numpy as np
import os
from PIL import Image
import io
import uuid
from typing import Optional, List, Dict, Any
from pathlib import Path
from jose import JWTError, jwt
from passlib.context import CryptContext

# Database imports
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, Text, and_, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.sql import func
from pydantic import BaseModel

# Import your existing detection service
from services.detection import accident_model, analyze_image, LiveStreamProcessor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./accident_detection.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# ==================== DATABASE MODELS ====================

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    department = Column(String, nullable=True)
    role = Column(String, default="user")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    last_password_change = Column(DateTime(timezone=True), nullable=True)

class Admin(Base):
    __tablename__ = "admins"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    department = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_super_admin = Column(Boolean, default=False)
    permissions = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    last_password_change = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(Integer, nullable=True)

class AccidentLog(Base):
    __tablename__ = "accident_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    video_source = Column(String, default="unknown")
    confidence = Column(Float)
    accident_detected = Column(Boolean)
    predicted_class = Column(String)
    processing_time = Column(Float)
    snapshot_filename = Column(String, nullable=True)
    snapshot_url = Column(String, nullable=True)
    frame_id = Column(String, nullable=True)
    analysis_type = Column(String, default="unknown")
    status = Column(String, default="unresolved")
    notes = Column(Text, nullable=True)
    location = Column(String, nullable=True)
    weather_conditions = Column(String, nullable=True)
    severity_estimate = Column(String, nullable=True)
    user_feedback = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

# ==================== PYDANTIC MODELS ====================

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int

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

class ProfileUpdateRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

# ==================== AUTH UTILITY FUNCTIONS ====================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
        return {"username": username, "user_id": payload.get("user_id")}
    except JWTError:
        return None

# ==================== DATABASE OPERATIONS ====================

def get_user_by_username(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username).first()

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()

def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()

def create_user(db: Session, user: UserCreate) -> User:
    if get_user_by_username(db, user.username):
        raise HTTPException(status_code=400, detail="Username already registered")
    
    if get_user_by_email(db, user.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    user = get_user_by_username(db, username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    return user

# Admin functions
def get_admin_by_username(db: Session, username: str) -> Optional[Admin]:
    return db.query(Admin).filter(Admin.username == username).first()

def get_admin_by_email(db: Session, email: str) -> Optional[Admin]:
    return db.query(Admin).filter(Admin.email == email).first()

def get_admin_by_id(db: Session, admin_id: int) -> Optional[Admin]:
    return db.query(Admin).filter(Admin.id == admin_id).first()

DEFAULT_ADMIN_PERMISSIONS = [
    "view_logs", "update_log_status", "view_dashboard", "manage_users", "system_settings"
]

SUPER_ADMIN_PERMISSIONS = [
    "view_logs", "update_log_status", "delete_logs", "view_dashboard", 
    "manage_users", "manage_admins", "system_settings", "database_access", "export_data"
]

def create_admin(db: Session, admin: AdminCreate, created_by_id: Optional[int] = None) -> Admin:
    if get_admin_by_username(db, admin.username):
        raise HTTPException(status_code=400, detail="Admin username already registered")
    
    if get_admin_by_email(db, admin.email):
        raise HTTPException(status_code=400, detail="Admin email already registered")
    
    permissions = admin.permissions or (SUPER_ADMIN_PERMISSIONS if admin.is_super_admin else DEFAULT_ADMIN_PERMISSIONS)
    
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
    admin = get_admin_by_username(db, username)
    if not admin:
        return None
    if not verify_password(password, admin.hashed_password):
        return None
    
    admin.last_login = datetime.now(timezone.utc)
    db.commit()
    return admin

def create_admin_access_token(admin: Admin) -> str:
    access_token_expires = timedelta(minutes=60)
    access_token_data = {
        "sub": admin.username,
        "user_id": admin.id,
        "is_admin": True,
        "is_super_admin": admin.is_super_admin,
        "permissions": admin.permissions.split(",") if admin.permissions else []
    }
    return create_access_token(data=access_token_data, expires_delta=access_token_expires)

def create_default_super_admin(db: Session):
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
            logger.warning("IMPORTANT: Change the default password immediately!")
    except Exception as e:
        logger.error(f"Error creating default super admin: {str(e)}")

# ==================== PROFILE UPDATE HELPER FUNCTIONS ====================

def user_exists_by_username_sync(db: Session, username: str, exclude_user_id: int = None) -> bool:
    query = db.query(User).filter(User.username == username)
    if exclude_user_id:
        query = query.filter(User.id != exclude_user_id)
    return query.first() is not None

def user_exists_by_email_sync(db: Session, email: str, exclude_user_id: int = None) -> bool:
    query = db.query(User).filter(User.email == email)
    if exclude_user_id:
        query = query.filter(User.id != exclude_user_id)
    return query.first() is not None

def update_user_profile_sync(db: Session, user_id: int, updated_fields: dict):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    for field, value in updated_fields.items():
        if hasattr(user, field):
            setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    return user

def update_user_password_sync(db: Session, user_id: int, new_hashed_password: str):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.hashed_password = new_hashed_password
    user.last_password_change = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return user

def upgrade_database_schema():
    try:
        # Add missing columns to existing tables
        try:
            with engine.begin() as conn:
                conn.execute(text('ALTER TABLE users ADD COLUMN department VARCHAR'))
            logger.info("Added department column to users table")
        except Exception as e:
            logger.debug(f"Department column might already exist in users: {e}")
        
        try:
            with engine.begin() as conn:
                conn.execute(text('ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT "user"'))
            logger.info("Added role column to users table")
        except Exception as e:
            logger.debug(f"Role column might already exist in users: {e}")
            
        try:
            with engine.begin() as conn:
                conn.execute(text('ALTER TABLE users ADD COLUMN last_password_change DATETIME'))
            logger.info("Added last_password_change column to users table")
        except Exception as e:
            logger.debug(f"Last_password_change column might already exist in users: {e}")
            
        try:
            with engine.begin() as conn:
                conn.execute(text('ALTER TABLE admins ADD COLUMN department VARCHAR'))
            logger.info("Added department column to admins table")
        except Exception as e:
            logger.debug(f"Department column might already exist in admins: {e}")
            
        try:
            with engine.begin() as conn:
                conn.execute(text('ALTER TABLE admins ADD COLUMN last_password_change DATETIME'))
            logger.info("Added last_password_change column to admins table")
        except Exception as e:
            logger.debug(f"Last_password_change column might already exist in admins: {e}")
            
    except Exception as e:
        logger.error(f"Error upgrading database schema: {e}")

# ==================== DEPENDENCY FUNCTIONS ====================

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token_data = verify_token(credentials.credentials)
    if token_data is None:
        raise credentials_exception
    
    user = get_user_by_username(db, token_data["username"])
    if user is None or not user.is_active:
        raise credentials_exception
    
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Admin:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate admin credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        is_admin: bool = payload.get("is_admin", False)
        
        if username is None or not is_admin:
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception
    
    admin = get_admin_by_username(db, username)
    if admin is None or not admin.is_active:
        raise credentials_exception
    
    return admin

def get_current_super_admin(current_admin: Admin = Depends(get_current_admin)) -> Admin:
    if not current_admin.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin privileges required"
        )
    return current_admin

def check_admin_permission(permission: str):
    def permission_checker(current_admin: Admin = Depends(get_current_admin)) -> Admin:
        if current_admin.is_super_admin:
            return current_admin
        
        admin_permissions = current_admin.permissions.split(",") if current_admin.permissions else []
        if permission not in admin_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{permission}' required"
            )
        return current_admin
    
    return permission_checker

# ==================== UTILITY FUNCTIONS ====================

BASE_DIR = Path(__file__).parent
SNAPSHOTS_DIR = BASE_DIR / "snapshots"
live_processors = {}

def save_snapshot(frame: np.ndarray, detection_data: dict) -> tuple[str, str]:
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        frame_id = detection_data.get('frame_id', 'unknown')
        filename = f"accident_{timestamp}_{frame_id}_{uuid.uuid4().hex[:8]}.jpg"
        
        filepath = SNAPSHOTS_DIR / filename
        cv2.imwrite(str(filepath), frame)
        url_path = f"/snapshots/{filename}"
        
        logger.info(f"Snapshot saved: {filename}")
        return filename, url_path
        
    except Exception as e:
        logger.error(f"Failed to save snapshot: {str(e)}")
        return None, None

def log_accident_detection(
    db: Session, 
    detection_data: dict, 
    frame: np.ndarray = None,
    source: str = "unknown",
    analysis_type: str = "unknown"
) -> AccidentLog:
    try:
        snapshot_filename = None
        snapshot_url = None
        
        if frame is not None and detection_data.get('accident_detected', False):
            snapshot_filename, snapshot_url = save_snapshot(frame, detection_data)
        
        confidence = detection_data.get('confidence', 0.0)
        if confidence >= 0.9:
            severity = 'high'
        elif confidence >= 0.7:
            severity = 'medium'
        else:
            severity = 'low'
        
        log_entry = AccidentLog(
            video_source=source,
            confidence=confidence,
            accident_detected=detection_data.get('accident_detected', False),
            predicted_class=detection_data.get('predicted_class', 'unknown'),
            processing_time=detection_data.get('processing_time', 0.0),
            snapshot_filename=snapshot_filename,
            snapshot_url=snapshot_url,
            frame_id=str(detection_data.get('frame_id', '')),
            analysis_type=analysis_type,
            severity_estimate=severity,
            location=detection_data.get('location', 'Unknown'),
            weather_conditions=detection_data.get('weather_conditions', 'Unknown')
        )
        
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        
        logger.info(f"Logged detection: ID {log_entry.id}, Accident: {log_entry.accident_detected}")
        return log_entry
        
    except Exception as e:
        logger.error(f"Failed to log accident detection: {str(e)}")
        db.rollback()
        return None

async def analyze_frame_with_logging(
    frame_bytes: bytes, 
    db: Session,
    source: str = "live_camera",
    frame_id: str = None
) -> dict:
    start_time = time.time()
    frame = None
    
    try:
        nparr = np.frombuffer(frame_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            try:
                image = Image.open(io.BytesIO(frame_bytes))
                frame = np.array(image.convert('RGB'))
                frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
            except Exception as pil_error:
                logger.error(f"PIL fallback failed: {str(pil_error)}")
                raise ValueError("Could not decode frame data")
        
        result = accident_model.predict(frame)
        result["processing_time"] = time.time() - start_time
        result["frame_id"] = frame_id or f"frame_{int(time.time() * 1000)}"
        
        log_entry = log_accident_detection(
            db=db,
            detection_data=result,
            frame=frame,
            source=source,
            analysis_type="live"
        )
        
        if log_entry:
            result["log_id"] = log_entry.id
            result["snapshot_url"] = log_entry.snapshot_url
        
        return result
        
    except Exception as e:
        logger.error(f"Error in frame analysis with logging: {str(e)}")
        return {
            "accident_detected": False,
            "confidence": 0.0,
            "details": f"Frame analysis error: {str(e)}",
            "processing_time": time.time() - start_time,
            "error": True
        }

# ==================== APP INITIALIZATION ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Enhanced Accident Detection API with Authentication...")
    
    # Create all database tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified")
    
    # Upgrade database schema for existing installations
    upgrade_database_schema()
    
    if accident_model.model is None:
        logger.warning("Model not loaded during startup")
    else:
        logger.info("Model loaded successfully")
    
    SNAPSHOTS_DIR.mkdir(exist_ok=True)
    logger.info(f"Snapshots directory ready: {SNAPSHOTS_DIR}")
    
    # Create default super admin if none exists
    db = SessionLocal()
    try:
        create_default_super_admin(db)
    finally:
        db.close()
    
    yield
    
    # Shutdown
    logger.info("Shutting down Enhanced Accident Detection API...")
    
    for client_id, processor in live_processors.items():
        try:
            if hasattr(processor, 'cleanup'):
                processor.cleanup()
        except Exception as e:
            logger.error(f"Error cleaning up processor {client_id}: {str(e)}")
    
    live_processors.clear()
    logger.info("Shutdown complete")

# Create FastAPI instance with lifespan
app = FastAPI(
    title="Enhanced Accident Detection API with Authentication",
    description="AI-powered accident detection system with user/admin authentication",
    version="2.1.0",
    lifespan=lifespan
)

# ==================== SIMPLE AND RELIABLE CORS SETUP ====================

# Get allowed origins from environment or use defaults
def get_cors_origins():
    env_origins = os.getenv("ALLOWED_ORIGINS", "")
    if env_origins:
        origins = [origin.strip() for origin in env_origins.split(",") if origin.strip()]
    else:
        origins = [
            "http://localhost:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
            "http://localhost:8080",
            "http://127.0.0.1:8080",
            "https://accident-prediction-1-mpm0.onrender.com"  # Your production URL
        ]
    
    # Always allow all origins for development - this fixes most CORS issues
    if os.getenv("ENVIRONMENT", "development") == "development":
        origins = ["*"]
    
    return origins

cors_origins = get_cors_origins()
logger.info(f"CORS origins configured: {cors_origins}")

# Add CORS middleware with comprehensive settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600  # Cache preflight for 1 hour
)

# Mount static files for serving snapshots
app.mount("/snapshots", StaticFiles(directory="snapshots"), name="snapshots")

# ==================== EXPLICIT CORS HEADERS FOR ALL ROUTES ====================

@app.middleware("http")
async def add_cors_header(request: Request, call_next):
    """Add CORS headers to all responses as a safety net"""
    response = await call_next(request)
    
    origin = request.headers.get("origin")
    if origin and (origin in cors_origins or "*" in cors_origins):
        response.headers["Access-Control-Allow-Origin"] = origin
    elif "*" in cors_origins:
        response.headers["Access-Control-Allow-Origin"] = "*"
    
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Expose-Headers"] = "*"
    
    return response

# ==================== ROUTES ====================

@app.get("/")
async def root():
    return {
        "message": "Enhanced Accident Detection API with Authentication is running!", 
        "version": "2.1.0",
        "features": ["Real-time detection", "Database logging", "Snapshot storage", "User/Admin Auth", "Dashboard API"],
        "cors_status": "enabled",
        "cors_origins": cors_origins
    }

@app.get("/api/health")
async def health_check(db: Session = Depends(get_db)):
    try:
        total_logs = db.query(AccidentLog).count()
        accidents_detected = db.query(AccidentLog).filter(AccidentLog.accident_detected == True).count()
        total_users = db.query(User).count()
        total_admins = db.query(Admin).count()
        
        return {
            "status": "healthy",
            "model_loaded": accident_model.model is not None,
            "model_path": accident_model.model_path,
            "threshold": accident_model.threshold,
            "active_connections": len(live_processors),
            "database_status": "connected",
            "total_logs": total_logs,
            "accidents_detected": accidents_detected,
            "total_users": total_users,
            "total_admins": total_admins,
            "snapshots_directory": str(SNAPSHOTS_DIR),
            "timestamp": time.time(),
            "cors_status": "enabled",
            "cors_origins": cors_origins
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "model_loaded": accident_model.model is not None if accident_model else False,
            "cors_status": "enabled"
        }

# ==================== AUTHENTICATION ROUTES ====================

@app.post("/auth/register", response_model=UserResponse)
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
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

@app.post("/auth/login", response_model=Token)
async def login_user(user_credentials: UserLogin, db: Session = Depends(get_db)):
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

@app.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        last_login=current_user.last_login
    )

@app.post("/auth/admin/login", response_model=AdminToken)
async def login_admin(admin_credentials: AdminLogin, db: Session = Depends(get_db)):
    admin = authenticate_admin(db, admin_credentials.username, admin_credentials.password)
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect admin credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_admin_access_token(admin)
    
    return AdminToken(
        access_token=access_token,
        token_type="bearer",
        expires_in=60 * 60,
        admin_level="super_admin" if admin.is_super_admin else "admin"
    )

@app.get("/auth/admin/me", response_model=AdminResponse)
async def get_current_admin_info(current_admin: Admin = Depends(get_current_admin)):
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

# ==================== BASIC ROUTES FOR TESTING ====================

@app.get("/api/dashboard/stats")
async def get_dashboard_stats_public(db: Session = Depends(get_db)):
    """Get dashboard statistics (public route for frontend compatibility)"""
    try:
        total_logs = db.query(AccidentLog).count()
        accidents_detected = db.query(AccidentLog).filter(AccidentLog.accident_detected == True).count()
        
        return {
            "total_logs": total_logs,
            "accidents_detected": accidents_detected,
            "accuracy_rate": round((accidents_detected / total_logs * 100) if total_logs > 0 else 0, 1),
            "active_connections": len(live_processors),
            "model_status": "loaded" if accident_model.model is not None else "not_loaded"
        }
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {str(e)}")
        return {
            "total_logs": 0,
            "accidents_detected": 0,
            "accuracy_rate": 0,
            "active_connections": len(live_processors),
            "model_status": "not_loaded"
        }

@app.get("/api/logs")
async def get_logs_public(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=500),
    db: Session = Depends(get_db)
):
    """Get accident logs (public route for dashboard compatibility)"""
    try:
        logs = db.query(AccidentLog).order_by(AccidentLog.timestamp.desc()).offset(skip).limit(limit).all()
        
        result = []
        for log in logs:
            result.append({
                "id": log.id,
                "timestamp": log.timestamp.isoformat(),
                "video_source": log.video_source,
                "confidence": log.confidence,
                "accident_detected": log.accident_detected,
                "predicted_class": log.predicted_class,
                "processing_time": log.processing_time,
                "analysis_type": log.analysis_type,
                "status": log.status,
                "created_at": log.created_at.isoformat() if log.created_at else None
            })
        
        return result
    except Exception as e:
        logger.error(f"Error fetching logs: {str(e)}")
        return []

# ==================== ERROR HANDLERS ====================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with CORS headers"""
    logger.error(f"HTTP Exception: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )

# ==================== STARTUP CONFIGURATION ====================

if __name__ == "__main__":
    import uvicorn
    
    print("=" * 60)
    print("🚀 ACCIDENT DETECTION API STARTING (CORS FIXED)")
    print("=" * 60)
    print(f"📍 Server URL: http://0.0.0.0:8000")
    print(f"📍 Production URL: https://accident-prediction-1-mpm0.onrender.com")
    print(f"📋 API Docs: /docs")
    print(f"🔍 Health Check: /api/health")
    print(f"🌐 CORS Origins: {cors_origins}")
    print("=" * 60)
    print("🔐 Default Admin Credentials:")
    print("   Username: superadmin")
    print("   Password: admin123")
    print("   ⚠️  CHANGE THESE IN PRODUCTION!")
    print("=" * 60)
    
    # Run the server with production settings
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=int(os.getenv("PORT", 8000)),
        log_level="info"
    )
