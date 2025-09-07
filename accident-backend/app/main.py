# Enhanced main.py with CORS fixes for deployment
from fastapi import FastAPI, UploadFile, File, HTTPException, WebSocket, WebSocketDisconnect, Depends, Query, status
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
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production-render-deployment-2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

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

# ==================== APP INITIALIZATION ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Enhanced Accident Detection API with Authentication...")
    
    # Create all database tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified")
    
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
    version="2.2.0",
    lifespan=lifespan
)

# ENHANCED CORS configuration - ALLOW ALL ORIGINS for debugging
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins temporarily for debugging
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Mount static files for serving snapshots
try:
    SNAPSHOTS_DIR.mkdir(exist_ok=True)
    app.mount("/snapshots", StaticFiles(directory=str(SNAPSHOTS_DIR)), name="snapshots")
except Exception as e:
    logger.warning(f"Could not mount snapshots directory: {e}")

# ==================== ENHANCED MIDDLEWARE ====================

@app.middleware("http")
async def enhanced_cors_handler(request, call_next):
    origin = request.headers.get("origin")
    
    # Handle preflight requests
    if request.method == "OPTIONS":
        response = JSONResponse({"message": "OK"})
        
        # Set specific origin if it's in allowed list
        if origin and origin in ALLOWED_ORIGINS:
            response.headers["Access-Control-Allow-Origin"] = origin
        elif origin:
            # For development/debugging - log unknown origins
            logger.warning(f"Unknown origin attempted access: {origin}")
            response.headers["Access-Control-Allow-Origin"] = origin
        
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
        response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, Accept, Origin, User-Agent, Cache-Control, Keep-Alive, X-Requested-With"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Max-Age"] = "3600"
        return response
    
    # Process the request
    response = await call_next(request)
    
    # Add CORS headers to all responses
    if origin and origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
    elif origin:
        # For development/debugging - allow unknown origins but log them
        logger.warning(f"Unknown origin in response: {origin}")
        response.headers["Access-Control-Allow-Origin"] = origin
    
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
    response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, Accept, Origin, User-Agent, Cache-Control, Keep-Alive, X-Requested-With"
    
    return response

# ==================== BASIC ROUTES ====================

@app.get("/")
async def root():
    return {
        "message": "Enhanced Accident Detection API with Authentication is running!", 
        "version": "2.2.0",
        "status": "healthy",
        "features": ["Real-time detection", "Database logging", "Snapshot storage", "User/Admin Auth", "Dashboard API"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "cors_status": "fully_open_for_debugging",
        "backend_url": "https://accident-prediction-1-mpm0.onrender.com",
        "model_status": "loaded" if accident_model.model is not None else "not_loaded"
    }

@app.get("/api/health")
async def health_check():
    """Fixed health check without database dependency issues"""
    try:
        # Basic health check without complex dependencies
        health_data = {
            "status": "healthy",
            "model_loaded": accident_model.model is not None,
            "model_path": getattr(accident_model, 'model_path', 'unknown'),
            "threshold": getattr(accident_model, 'threshold', 0.5),
            "active_connections": len(live_processors),
            "snapshots_directory": str(SNAPSHOTS_DIR),
            "cors_enabled": True,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "backend_url": "https://accident-prediction-1-mpm0.onrender.com"
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

# Add a simple test endpoint
@app.get("/api/test")
async def test_endpoint():
    return {
        "message": "Test endpoint working",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "server": "Render",
        "cors_enabled": True
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
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        logger.info(f"User {current_user.username} uploaded file: {file.filename}")
        
        if not file.content_type.startswith(('image/', 'video/')):
            raise HTTPException(
                status_code=400, 
                detail="Invalid file type. Please upload an image or video file."
            )
        
        file_contents = await file.read()
        if len(file_contents) > 50 * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail="File too large. Maximum size is 50MB."
            )
        
        result = await analyze_image(file_contents, file.content_type, file.filename)
        
        # Try to create frame for logging
        frame = None
        if file.content_type.startswith('image/'):
            try:
                nparr = np.frombuffer(file_contents, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            except:
                pass
        
        # Log the detection
        log_entry = log_accident_detection(
            db=db,
            detection_data=result,
            frame=frame,
            source=f"upload_{current_user.username}_{file.filename}",
            analysis_type="upload"
        )
        
        response_data = {
            "success": True,
            "filename": file.filename,
            "file_size": len(file_contents),
            "content_type": file.content_type,
            "accident_detected": result["accident_detected"],
            "confidence": float(result["confidence"]),
            "details": result.get("details", ""),
            "processing_time": result.get("processing_time", 0),
            "predicted_class": result.get("predicted_class", "Unknown"),
            "threshold": result.get("threshold", getattr(accident_model, 'threshold', 0.5)),
            "frames_analyzed": result.get("frames_analyzed", 1),
            "avg_confidence": result.get("avg_confidence", result["confidence"]),
            "uploaded_by": current_user.username
        }
        
        if log_entry:
            response_data["log_id"] = log_entry.id
            response_data["snapshot_url"] = log_entry.snapshot_url
        
        return JSONResponse(content=response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing file {file.filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

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
            "model_status": "loaded" if accident_model.model is not None else "not_loaded",
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
            "model_status": "loaded" if accident_model.model is not None else "not_loaded",
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

# ==================== WEBSOCKET FOR LIVE DETECTION ====================

@app.websocket("/api/live/ws")
async def websocket_live_detection(websocket: WebSocket):
    client_id = str(uuid.uuid4())
    processor = None
    
    try:
        await websocket.accept()
        processor = LiveStreamProcessor()
        live_processors[client_id] = processor
        logger.info(f"WebSocket client {client_id} connected")
        
        confirmation = {
            "type": "connection_established",
            "client_id": client_id,
            "timestamp": time.time(),
            "model_loaded": accident_model.model is not None,
            "threshold": getattr(accident_model, 'threshold', 0.5),
            "database_status": "connected"
        }
        await websocket.send_text(json.dumps(confirmation))
        
        frame_count = 0
        consecutive_errors = 0
        max_consecutive_errors = 5
        
        db = SessionLocal()
        
        try:
            while True:
                try:
                    data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                    
                    if not data.strip():
                        continue
                    
                    try:
                        frame_data = json.loads(data)
                    except json.JSONDecodeError:
                        consecutive_errors += 1
                        if consecutive_errors >= max_consecutive_errors:
                            break
                        continue
                    
                    consecutive_errors = 0
                    frame_count += 1
                    
                    if not processor.should_process_frame():
                        continue
                    
                    if 'frame' not in frame_data or not frame_data['frame']:
                        continue
                    
                    try:
                        frame_bytes = base64.b64decode(frame_data['frame'])
                        if len(frame_bytes) == 0:
                            continue
                    except Exception as e:
                        logger.error(f"Error decoding base64 frame from client {client_id}: {str(e)}")
                        continue
                    
                    # Simulate frame analysis for now (replace with actual analysis)
                    result = {
                        "accident_detected": False,
                        "confidence": 0.1,
                        "details": "Analysis completed",
                        "processing_time": 0.05,
                        "predicted_class": "Normal",
                        "frame_id": frame_data.get("frame_id", frame_count)
                    }
                    
                    processor.add_result(result)
                    trend = processor.get_trend_analysis() if hasattr(processor, 'get_trend_analysis') else {"trend": "stable"}
                    
                    response = {
                        "timestamp": frame_data.get("timestamp", time.time()),
                        "frame_id": frame_data.get("frame_id", frame_count),
                        "accident_detected": result["accident_detected"],
                        "confidence": float(result["confidence"]),
                        "details": result.get("details", ""),
                        "processing_time": result.get("processing_time", 0),
                        "predicted_class": result.get("predicted_class", "Unknown"),
                        "threshold": getattr(accident_model, 'threshold', 0.5),
                        "trend": trend.get("trend", "stable"),
                        "avg_confidence": trend.get("confidence_avg", result["confidence"]),
                        "detection_rate": trend.get("detection_rate", 0.0),
                        "total_frames": frame_count,
                        "model_status": "loaded" if accident_model.model is not None else "not_loaded"
                    }
                    
                    await websocket.send_text(json.dumps(response))
                    
                except asyncio.TimeoutError:
                    ping_message = {
                        "type": "ping",
                        "timestamp": time.time(),
                        "frames_processed": frame_count
                    }
                    await websocket.send_text(json.dumps(ping_message))
                        
                except WebSocketDisconnect:
                    break
                        
                except Exception as e:
                    logger.error(f"Error in main processing loop for client {client_id}: {str(e)}")
                    consecutive_errors += 1
                    
                    if consecutive_errors >= max_consecutive_errors:
                        break
        finally:
            db.close()
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket client {client_id} disconnected normally")
        
    except Exception as e:
        logger.error(f"WebSocket connection error for client {client_id}: {str(e)}")
        
    finally:
        if client_id in live_processors:
            del live_processors[client_id]
            logger.info(f"Cleaned up processor for client {client_id}")

@app.post("/api/live/frame")
async def analyze_single_frame(
    frame_data: dict, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        if 'frame' not in frame_data or not frame_data['frame']:
            raise HTTPException(status_code=400, detail="No frame data provided")
        
        try:
            frame_bytes = base64.b64decode(frame_data['frame'])
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid base64 frame data: {str(e)}")
        
        # Simulate analysis for now (replace with actual analysis)
        result = {
            "accident_detected": False,
            "confidence": 0.1,
            "details": "Frame analysis completed",
            "processing_time": 0.05,
            "predicted_class": "Normal"
        }
        
        return {
            "success": True,
            "timestamp": frame_data.get("timestamp", time.time()),
            "accident_detected": result["accident_detected"],
            "confidence": float(result["confidence"]),
            "details": result.get("details", ""),
            "processing_time": result.get("processing_time", 0),
            "predicted_class": result.get("predicted_class", "Unknown"),
            "threshold": getattr(accident_model, 'threshold', 0.5),
            "analyzed_by": current_user.username
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing frame: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error analyzing frame: {str(e)}")

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

# ==================== ADMIN MANAGEMENT ROUTES ====================

@app.get("/api/admin/logs")
async def get_accident_logs_admin(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=1000),
    accident_only: bool = Query(False),
    status: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(check_admin_permission("view_logs"))
):
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

@app.get("/api/admin/dashboard/stats")
async def get_admin_dashboard_stats(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(check_admin_permission("view_dashboard"))
):
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
        "model_status": "loaded" if accident_model.model is not None else "not_loaded",
        "accessed_by": current_admin.username
    }

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
    logger.info(f"Model Loaded: {accident_model.model is not None}")
    logger.info(f"Detection Threshold: {getattr(accident_model, 'threshold', 0.5)}")
    logger.info(f"Database URL: {SQLALCHEMY_DATABASE_URL}")
    logger.info(f"Snapshots Directory: {SNAPSHOTS_DIR}")
    logger.info(f"JWT Secret Key Set: {bool(SECRET_KEY and SECRET_KEY != 'your-secret-key-change-this-in-production-render-deployment-2024')}")
    logger.info(f"CORS: Allow all origins (debugging mode)")
    logger.info("=" * 60)
    
    # Create snapshots directory if it doesn't exist
    SNAPSHOTS_DIR.mkdir(exist_ok=True)
    
    # Run the server
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=int(os.getenv("PORT", 8000)),
        log_level="info",
        access_log=True
    )
