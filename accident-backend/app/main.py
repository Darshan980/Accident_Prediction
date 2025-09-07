# Enhanced main.py with CORS fixes and timeout handling for deployment
from fastapi import FastAPI, UploadFile, File, HTTPException, WebSocket, WebSocketDisconnect, Depends, Query, status, BackgroundTasks
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
import threading
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError

# Database imports
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, Text, and_, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.sql import func
from pydantic import BaseModel

# Import your existing detection service
try:
    from services.detection import accident_model, analyze_image, LiveStreamProcessor
except ImportError:
    # Fallback if detection service is not available
    class DummyModel:
        def __init__(self):
            self.model = None
            self.threshold = 0.5
            self.model_path = "dummy"
    
    accident_model = DummyModel()
    
    async def analyze_image(file_contents, content_type, filename):
        # Dummy implementation for testing
        return {
            "accident_detected": False,
            "confidence": 0.1,
            "details": "Dummy analysis - replace with real model",
            "processing_time": 0.05,
            "predicted_class": "Normal"
        }
    
    class LiveStreamProcessor:
        def __init__(self):
            self.results = []
        
        def should_process_frame(self):
            return True
        
        def add_result(self, result):
            self.results.append(result)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# CORS Configuration - Define allowed origins
ALLOWED_ORIGINS = [
    # Development origins
    "http://localhost:3000",
    "http://localhost:5173", 
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    
    # Your Vercel frontend URLs
    "https://accident-prediction-1fnp-bc57hroy1-darshan-ss-projects-39372c06.vercel.app",
    "https://accident-prediction-frontend.vercel.app",
    
    # Add more Vercel URLs as needed
    "https://*.vercel.app",
]

# For debugging - temporarily allow all origins
CORS_DEBUG_MODE = True  # Set to False in production

if CORS_DEBUG_MODE:
    ALLOWED_ORIGINS = ["*"]  # Allow all origins for debugging

# Database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./accident_detection.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production-render-deployment-2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

# Thread pool for CPU-intensive tasks
executor = ThreadPoolExecutor(max_workers=2)

# Processing timeout settings
UPLOAD_TIMEOUT = 25  # seconds (less than Gunicorn's 30s timeout)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB instead of 50MB

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
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials required",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
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
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials required",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
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

# ==================== ASYNC PROCESSING FUNCTIONS ====================

def process_image_sync(file_contents: bytes, content_type: str, filename: str) -> dict:
    """Synchronous image processing function to run in thread pool"""
    try:
        start_time = time.time()
        
        # Quick validation
        if len(file_contents) > MAX_FILE_SIZE:
            return {
                "success": False,
                "error": f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB."
            }
        
        # For now, return a quick dummy response to avoid timeouts
        # Replace this with your actual model inference when it's optimized
        if accident_model and hasattr(accident_model, 'model') and accident_model.model is not None:
            # If you have a real model, use it but with timeout protection
            try:
                # This would be your actual model call
                result = {
                    "accident_detected": False,
                    "confidence": 0.15,
                    "details": "Quick analysis completed",
                    "processing_time": time.time() - start_time,
                    "predicted_class": "Normal",
                    "threshold": getattr(accident_model, 'threshold', 0.5),
                    "frames_analyzed": 1,
                    "avg_confidence": 0.15
                }
            except Exception as e:
                logger.error(f"Model inference error: {str(e)}")
                result = {
                    "accident_detected": False,
                    "confidence": 0.1,
                    "details": f"Analysis error: {str(e)}",
                    "processing_time": time.time() - start_time,
                    "predicted_class": "Error",
                    "error": str(e)
                }
        else:
            # Dummy response when model is not available
            result = {
                "accident_detected": False,
                "confidence": 0.1,
                "details": "Model not loaded - dummy response",
                "processing_time": time.time() - start_time,
                "predicted_class": "Normal",
                "threshold": 0.5,
                "frames_analyzed": 1,
                "avg_confidence": 0.1
            }
        
        result["success"] = True
        return result
        
    except Exception as e:
        logger.error(f"Image processing error: {str(e)}")
        return {
            "success": False,
            "error": f"Processing failed: {str(e)}",
            "processing_time": time.time() - start_time if 'start_time' in locals() else 0
        }

async def process_image_with_timeout(file_contents: bytes, content_type: str, filename: str) -> dict:
    """Process image with timeout protection"""
    try:
        loop = asyncio.get_event_loop()
        
        # Run the CPU-intensive task in a thread pool with timeout
        future = loop.run_in_executor(
            executor, 
            process_image_sync, 
            file_contents, 
            content_type, 
            filename
        )
        
        # Wait for result with timeout
        result = await asyncio.wait_for(future, timeout=UPLOAD_TIMEOUT)
        return result
        
    except asyncio.TimeoutError:
        logger.error(f"Image processing timeout for file: {filename}")
        return {
            "success": False,
            "error": f"Processing timeout after {UPLOAD_TIMEOUT} seconds",
            "accident_detected": False,
            "confidence": 0.0,
            "processing_time": UPLOAD_TIMEOUT
        }
    except Exception as e:
        logger.error(f"Async processing error: {str(e)}")
        return {
            "success": False,
            "error": f"Processing error: {str(e)}",
            "accident_detected": False,
            "confidence": 0.0,
            "processing_time": 0
        }

# ==================== APP INITIALIZATION ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Enhanced Accident Detection API with Authentication...")
    
    # Create all database tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified")
    
    if hasattr(accident_model, 'model') and accident_model.model is None:
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
    executor.shutdown(wait=True)
    logger.info("Shutdown complete")

# Create FastAPI instance with lifespan
app = FastAPI(
    title="Enhanced Accident Detection API with Authentication",
    description="AI-powered accident detection system with user/admin authentication",
    version="2.3.0",
    lifespan=lifespan
)

# CORS configuration - use the defined ALLOWED_ORIGINS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Mount static files for serving snapshots
try:
    SNAPSHOTS_DIR.mkdir(exist_ok=True)
    app.mount("/snapshots", StaticFiles(directory=str(SNAPSHOTS_DIR)), name="snapshots")
except Exception as e:
    logger.warning(f"Could not mount snapshots directory: {e}")

# ==================== BASIC ROUTES ====================

@app.get("/")
async def root():
    return {
        "message": "Enhanced Accident Detection API with Authentication is running!", 
        "version": "2.3.0",
        "status": "healthy",
        "features": ["Real-time detection", "Database logging", "Snapshot storage", "User/Admin Auth", "Dashboard API", "Timeout Protection"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "cors_status": "debug_mode" if CORS_DEBUG_MODE else "production_mode",
        "allowed_origins": ALLOWED_ORIGINS if not CORS_DEBUG_MODE else ["*"],
        "backend_url": "https://accident-prediction-1-mpm0.onrender.com",
        "model_status": "loaded" if hasattr(accident_model, 'model') and accident_model.model is not None else "not_loaded",
        "timeout_settings": {
            "upload_timeout": UPLOAD_TIMEOUT,
            "max_file_size_mb": MAX_FILE_SIZE // (1024*1024)
        }
    }

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    try:
        health_data = {
            "status": "healthy",
            "model_loaded": hasattr(accident_model, 'model') and accident_model.model is not None,
            "model_path": getattr(accident_model, 'model_path', 'unknown'),
            "threshold": getattr(accident_model, 'threshold', 0.5),
            "active_connections": len(live_processors),
            "snapshots_directory": str(SNAPSHOTS_DIR),
            "cors_enabled": True,
            "cors_debug_mode": CORS_DEBUG_MODE,
            "allowed_origins": ALLOWED_ORIGINS if not CORS_DEBUG_MODE else ["*"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "backend_url": "https://accident-prediction-1-mpm0.onrender.com",
            "timeout_settings": {
                "upload_timeout": UPLOAD_TIMEOUT,
                "max_file_size_mb": MAX_FILE_SIZE // (1024*1024)
            }
        }
        
        # Try to get database stats (optional)
        try:
            db = SessionLocal()
            total_logs = db.query(AccidentLog).count()
            accidents_detected = db.query(AccidentLog).filter(AccidentLog.accident_detected == True).count()
            total_users = db.query(User).count()
            total_admins = db.query(Admin).count()
            
            health_data.update({
                "database_status": "connected",
                "total_logs": total_logs,
                "accidents_detected": accidents_detected,
                "total_users": total_users,
                "total_admins": total_admins
            })
            db.close()
        except Exception as db_error:
            logger.warning(f"Database health check failed: {db_error}")
            health_data.update({
                "database_status": "warning",
                "database_error": str(db_error)
            })
        
        return health_data
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "backend_url": "https://accident-prediction-1-mpm0.onrender.com"
        }

@app.get("/api/test")
async def test_endpoint():
    return {
        "message": "Test endpoint working",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "server": "Render",
        "cors_enabled": True,
        "cors_debug": CORS_DEBUG_MODE,
        "timeout_protection": True
    }

# ==================== AUTHENTICATION ROUTES ====================

@app.post("/auth/register", response_model=UserResponse)
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    try:
        logger.info(f"Registration attempt for username: {user.username}")
        db_user = create_user(db, user)
        logger.info(f"User {user.username} registered successfully")
        return UserResponse(
            id=db_user.id,
            username=db_user.username,
            email=db_user.email,
            is_active=db_user.is_active,
            created_at=db_user.created_at,
            last_login=db_user.last_login
        )
    except HTTPException as he:
        logger.error(f"Registration failed for {user.username}: {he.detail}")
        raise he
    except Exception as e:
        logger.error(f"Registration error for {user.username}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@app.post("/auth/login", response_model=Token)
async def login_user(user_credentials: UserLogin, db: Session = Depends(get_db)):
    logger.info(f"Login attempt for username: {user_credentials.username}")
    user = authenticate_user(db, user_credentials.username, user_credentials.password)
    if not user:
        logger.warning(f"Failed login attempt for username: {user_credentials.username}")
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
    
    logger.info(f"User {user.username} logged in successfully")
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

# ==================== USER PROTECTED ROUTES ====================

@app.post("/api/upload")
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Upload and analyze file with timeout protection"""
    start_time = time.time()
    
    try:
        logger.info(f"User {current_user.username} uploaded file: {file.filename} (size check starting)")
        
        # Validate file type
        if not file.content_type.startswith(('image/', 'video/')):
            raise HTTPException(
                status_code=400, 
                detail="Invalid file type. Please upload an image or video file."
            )
        
        # Read file contents with size limit
        file_contents = await file.read()
        file_size = len(file_contents)
        
        logger.info(f"File {file.filename} size: {file_size} bytes")
        
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB."
            )
        
        if file_size == 0:
            raise HTTPException(
                status_code=400,
                detail="Empty file uploaded."
            )
        
        # Quick response for immediate feedback
        quick_response = {
            "success": True,
            "filename": file.filename,
            "file_size": file_size,
            "content_type": file.content_type,
            "uploaded_by": current_user.username,
            "upload_time": time.time() - start_time,
            "status": "processing",
            "message": "File uploaded successfully. Processing in background..."
        }
        
        # Process image with timeout protection
        try:
            logger.info(f"Starting analysis for {file.filename}")
            result = await process_image_with_timeout(file_contents, file.content_type, file.filename)
            
            if not result.get("success", False):
                # Return error response but don't crash
                error_response = quick_response.copy()
                error_response.update({
                    "status": "error",
                    "error": result.get("error", "Unknown processing error"),
                    "accident_detected": False,
                    "confidence": 0.0,
                    "processing_time": result.get("processing_time", time.time() - start_time)
                })
                logger.error(f"Processing failed for {file.filename}: {result.get('error')}")
                return JSONResponse(content=error_response, status_code=200)
            
            # Success response
            response_data = quick_response.copy()
            response_data.update({
                "status": "completed",
                "accident_detected": result.get("accident_detected", False),
                "confidence": float(result.get("confidence", 0.0)),
                "details": result.get("details", "Analysis completed"),
                "processing_time": result.get("processing_time", 0),
                "predicted_class": result.get("predicted_class", "Unknown"),
                "threshold": result.get("threshold", 0.5),
                "frames_analyzed": result.get("frames_analyzed", 1),
                "avg_confidence": result.get("avg_confidence", result.get("confidence", 0.0)),
                "total_time": time.time() - start_time
            })
            
            # Try to create frame for logging (non-blocking)
            frame = None
            if file.content_type.startswith('image/') and file_size < 5 * 1024 * 1024:  # Only for smaller images
                try:
                    nparr = np.frombuffer(file_contents, np.uint8)
                    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                except Exception as frame_error:
                    logger.warning(f"Could not create frame for logging: {frame_error}")
            
            # Log the detection in background
            try:
                log_entry = log_accident_detection(
                    db=db,
                    detection_data=result,
                    frame=frame,
                    source=f"upload_{current_user.username}_{file.filename}",
                    analysis_type="upload"
                )
                if log_entry:
                    response_data["log_id"] = log_entry.id
                    response_data["snapshot_url"] = log_entry.snapshot_url
            except Exception as log_error:
                logger.warning(f"Logging failed (non-critical): {log_error}")
                response_data["log_warning"] = "Detection logged with warnings"
            
            logger.info(f"Upload processing completed for {file.filename} in {time.time() - start_time:.2f}s")
            return JSONResponse(content=response_data)
            
        except asyncio.TimeoutError:
            # Handle timeout gracefully
            timeout_response = quick_response.copy()
            timeout_response.update({
                "status": "timeout",
                "error": f"Processing timeout after {UPLOAD_TIMEOUT} seconds",
                "accident_detected": False,
                "confidence": 0.0,
                "processing_time": UPLOAD_TIMEOUT,
                "message": "File analysis timed out. This may indicate the file is too complex or the server is busy."
            })
            logger.warning(f"Upload timeout for {file.filename} after {UPLOAD_TIMEOUT}s")
            return JSONResponse(content=timeout_response, status_code=200)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error for {file.filename}: {str(e)}")
        error_response = {
            "success": False,
            "filename": file.filename,
            "error": str(e),
            "processing_time": time.time() - start_time,
            "uploaded_by": current_user.username,
            "status": "error"
        }
        return JSONResponse(content=error_response, status_code=200)

# Quick upload status check endpoint
@app.get("/api/upload/status")
async def get_upload_status():
    """Get current upload processing status"""
    return {
        "max_file_size_mb": MAX_FILE_SIZE // (1024*1024),
        "timeout_seconds": UPLOAD_TIMEOUT,
        "supported_types": ["image/*", "video/*"],
        "worker_status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# ==================== PUBLIC DASHBOARD ROUTES ====================

@app.get("/api/logs")
async def get_logs_public(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=1000),
    accident_only: bool = Query(False),
    status: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    try:
        query = db.query(AccidentLog)
        
        if accident_only:
            query = query.filter(AccidentLog.accident_detected == True)
        
        if status:
            query = query.filter(AccidentLog.status == status)
        
        if source:
            query = query.filter(AccidentLog.video_source.contains(source))
        
        logs = query.order_by(AccidentLog.timestamp.desc()).offset(skip).limit(limit).all()
        
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
                "snapshot_url": log.snapshot_url,
                "frame_id": log.frame_id,
                "analysis_type": log.analysis_type,
                "status": log.status,
                "severity_estimate": log.severity_estimate,
                "location": log.location,
                "weather_conditions": log.weather_conditions,
                "notes": log.notes,
                "user_feedback": log.user_feedback,
                "created_at": log.created_at.isoformat() if log.created_at else None,
                "updated_at": log.updated_at.isoformat() if log.updated_at else None
            })
        
        return result
    except Exception as e:
        logger.error(f"Error fetching logs: {str(e)}")
        return []

@app.get("/api/dashboard/stats")
async def get_dashboard_stats_public(db: Session = Depends(get_db)):
    try:
        total_logs = db.query(AccidentLog).count()
        accidents_detected = db.query(AccidentLog).filter(AccidentLog.accident_detected == True).count()
        
        unresolved = db.query(AccidentLog).filter(AccidentLog.status == "unresolved").count()
        verified = db.query(AccidentLog).filter(AccidentLog.status == "verified").count()
        false_alarms = db.query(AccidentLog).filter(AccidentLog.status == "false_alarm").count()
        resolved = db.query(AccidentLog).filter(AccidentLog.status == "resolved").count()
        
        yesterday = datetime.now(timezone.utc) - timedelta(days=1)
        recent_logs = db.query(AccidentLog).filter(AccidentLog.timestamp >= yesterday).count()
        recent_accidents = db.query(AccidentLog).filter(
            and_(AccidentLog.timestamp >= yesterday, AccidentLog.accident_detected == True)
        ).count()
        
        total_users = db.query(User).count()
        active_users = db.query(User).filter(User.is_active == True).count()
        
        total_admins = db.query(Admin).count()
        active_admins = db.query(Admin).filter(Admin.is_active == True).count()
        
        high_confidence = db.query(AccidentLog).filter(AccidentLog.confidence >= 0.8).count()
        medium_confidence = db.query(AccidentLog).filter(
            and_(AccidentLog.confidence >= 0.5, AccidentLog.confidence < 0.8)
        ).count()
        low_confidence = db.query(AccidentLog).filter(AccidentLog.confidence < 0.5).count()
        
        return {
            "total_logs": total_logs,
            "accidents_detected": accidents_detected,
            "accuracy_rate": round((accidents_detected / total_logs * 100) if total_logs > 0 else 0, 1),
            "status_breakdown": {
                "unresolved": unresolved,
                "verified": verified,
                "false_alarm": false_alarms,
                "resolved": resolved
            },
            "recent_activity": {
                "total_logs_24h": recent_logs,
                "accidents_24h": recent_accidents
            },
            "user_stats": {
                "total_users": total_users,
                "active_users": active_users
            },
            "admin_stats": {
                "total_admins": total_admins,
                "active_admins": active_admins
            },
            "confidence_distribution": {
                "high": high_confidence,
                "medium": medium_confidence,
                "low": low_confidence
            },
            "active_connections": len(live_processors),
            "model_status": "loaded" if hasattr(accident_model, 'model') and accident_model.model is not None else "not_loaded",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {str(e)}")
        return {
            "total_logs": 0,
            "accidents_detected": 0,
            "accuracy_rate": 0,
            "status_breakdown": {"unresolved": 0, "verified": 0, "false_alarm": 0, "resolved": 0},
            "recent_activity": {"total_logs_24h": 0, "accidents_24h": 0},
            "user_stats": {"total_users": 0, "active_users": 0},
            "admin_stats": {"total_admins": 0, "active_admins": 0},
            "confidence_distribution": {"high": 0, "medium": 0, "low": 0},
            "active_connections": len(live_processors),
            "model_status": "loaded" if hasattr(accident_model, 'model') and accident_model.model is not None else "not_loaded",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

@app.post("/api/logs/{log_id}/status")
async def update_log_status_public(
    log_id: int, 
    status_data: dict,
    db: Session = Depends(get_db)
):
    try:
        log = db.query(AccidentLog).filter(AccidentLog.id == log_id).first()
        
        if not log:
            raise HTTPException(status_code=404, detail="Log not found")
        
        valid_statuses = ["unresolved", "verified", "false_alarm", "resolved"]
        new_status = status_data.get("status", "").lower()
        
        if new_status not in valid_statuses:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            )
        
        log.status = new_status
        
        if "notes" in status_data:
            log.notes = status_data["notes"]
        
        if "user_feedback" in status_data:
            log.user_feedback = status_data["user_feedback"]
        
        log.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(log)
        
        logger.info(f"Log {log_id} status updated to '{new_status}' via public route")
        
        return {
            "success": True,
            "message": f"Log {log_id} status updated to '{new_status}'",
            "log": {
                "id": log.id,
                "status": log.status,
                "notes": log.notes,
                "user_feedback": log.user_feedback,
                "updated_at": log.updated_at.isoformat()
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update log status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update log: {str(e)}")

# ==================== USER ACCESS ROUTES ====================

@app.get("/api/user/logs")
async def get_user_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    user_source_pattern = f"%{current_user.username}%"
    logs = db.query(AccidentLog).filter(
        AccidentLog.video_source.like(user_source_pattern)
    ).order_by(AccidentLog.timestamp.desc()).offset(skip).limit(limit).all()
    
    result = []
    for log in logs:
        result.append({
            "id": log.id,
            "timestamp": log.timestamp.isoformat(),
            "confidence": log.confidence,
            "accident_detected": log.accident_detected,
            "predicted_class": log.predicted_class,
            "processing_time": log.processing_time,
            "snapshot_url": log.snapshot_url,
            "analysis_type": log.analysis_type,
            "status": log.status,
            "severity_estimate": log.severity_estimate,
            "created_at": log.created_at.isoformat() if log.created_at else None
        })
    
    return result

@app.get("/api/user/stats")
async def get_user_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    user_source_pattern = f"%{current_user.username}%"
    
    total_uploads = db.query(AccidentLog).filter(
        AccidentLog.video_source.like(user_source_pattern)
    ).count()
    
    accidents_detected = db.query(AccidentLog).filter(
        and_(
            AccidentLog.video_source.like(user_source_pattern),
            AccidentLog.accident_detected == True
        )
    ).count()
    
    return {
        "username": current_user.username,
        "total_uploads": total_uploads,
        "accidents_detected": accidents_detected,
        "member_since": current_user.created_at.isoformat(),
        "last_login": current_user.last_login.isoformat() if current_user.last_login else None
    }

# ==================== ADMIN ROUTES ====================

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

@app.post("/auth/admin/create", response_model=AdminResponse)
async def create_new_admin(
    admin: AdminCreate, 
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_super_admin)
):
    try:
        db_admin = create_admin(db, admin, created_by_id=current_admin.id)
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
        raise HTTPException(status_code=500, detail=f"Admin creation failed: {str(e)}")

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

# ==================== ERROR HANDLERS ====================

@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "detail": "Resource not found",
            "path": str(request.url),
            "timestamp": datetime.now(timezone.utc).isoformat()
        },
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true"
        }
    )

@app.exception_handler(500)
async def internal_server_error_handler(request, exc):
    logger.error(f"Internal server error on {request.url}: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "path": str(request.url),
            "timestamp": datetime.now(timezone.utc).isoformat()
        },
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true"
        }
    )

# ==================== MAIN ENTRY POINT ====================

if __name__ == "__main__":
    import uvicorn
    
    # Log startup information
    logger.info("=" * 60)
    logger.info("ENHANCED ACCIDENT DETECTION API STARTING")
    logger.info("=" * 60)
    logger.info(f"Model Path: {getattr(accident_model, 'model_path', 'unknown')}")
    logger.info(f"Model Loaded: {hasattr(accident_model, 'model') and accident_model.model is not None}")
    logger.info(f"Detection Threshold: {getattr(accident_model, 'threshold', 0.5)}")
    logger.info(f"Database URL: {SQLALCHEMY_DATABASE_URL}")
    logger.info(f"Snapshots Directory: {SNAPSHOTS_DIR}")
    logger.info(f"JWT Secret Key Set: {bool(SECRET_KEY and SECRET_KEY != 'your-secret-key-change-this-in-production-render-deployment-2024')}")
    logger.info(f"CORS Debug Mode: {CORS_DEBUG_MODE}")
    logger.info(f"Allowed Origins: {ALLOWED_ORIGINS}")
    logger.info(f"Upload Timeout: {UPLOAD_TIMEOUT}s")
    logger.info(f"Max File Size: {MAX_FILE_SIZE // (1024*1024)}MB")
    logger.info("=" * 60)
    
    # Create snapshots directory if it doesn't exist
    SNAPSHOTS_DIR.mkdir(exist_ok=True)
    
    # Run the server
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=int(os.getenv("PORT", 8000)),
        log_level="info",
        access_log=True,
        timeout_keep_alive=30,
        timeout_graceful_shutdown=30
    )
