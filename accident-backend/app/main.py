# Enhanced main.py with COMPREHENSIVE LOGGING and WebSocket fixes
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

# ENHANCED LOGGING CONFIGURATION
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('accident_detection.log', mode='a')
    ]
)
logger = logging.getLogger(__name__)

# Create separate loggers for different components
websocket_logger = logging.getLogger('websocket')
detection_logger = logging.getLogger('detection')
database_logger = logging.getLogger('database')

# Set specific log levels
websocket_logger.setLevel(logging.INFO)
detection_logger.setLevel(logging.INFO)
database_logger.setLevel(logging.INFO)

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

# ==================== UTILITY FUNCTIONS ====================

BASE_DIR = Path(__file__).parent
SNAPSHOTS_DIR = BASE_DIR / "snapshots"
live_processors = {}
websocket_connections = {}

def save_snapshot(frame: np.ndarray, detection_data: dict) -> tuple[str, str]:
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        frame_id = detection_data.get('frame_id', 'unknown')
        filename = f"accident_{timestamp}_{frame_id}_{uuid.uuid4().hex[:8]}.jpg"
        
        filepath = SNAPSHOTS_DIR / filename
        cv2.imwrite(str(filepath), frame)
        url_path = f"/snapshots/{filename}"
        
        logger.info(f"📸 Snapshot saved: {filename}")
        return filename, url_path
        
    except Exception as e:
        logger.error(f"❌ Failed to save snapshot: {str(e)}")
        return None, None

def log_accident_detection(
    db: Session, 
    detection_data: dict, 
    frame: np.ndarray = None,
    source: str = "unknown",
    analysis_type: str = "unknown"
) -> AccidentLog:
    try:
        database_logger.info(f"🗄️ Logging detection to database...")
        
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
        
        # ENHANCED LOGGING
        database_logger.info(f"✅ Detection logged to database successfully:")
        database_logger.info(f"   📋 Log ID: {log_entry.id}")
        database_logger.info(f"   🚨 Accident Detected: {log_entry.accident_detected}")
        database_logger.info(f"   📊 Confidence: {log_entry.confidence:.3f}")
        database_logger.info(f"   🏷️ Predicted Class: {log_entry.predicted_class}")
        database_logger.info(f"   ⏱️ Processing Time: {log_entry.processing_time:.3f}s")
        database_logger.info(f"   📍 Source: {source}")
        database_logger.info(f"   🔧 Analysis Type: {analysis_type}")
        database_logger.info(f"   📸 Snapshot: {snapshot_filename or 'None'}")
        
        return log_entry
        
    except Exception as e:
        database_logger.error(f"❌ Failed to log accident detection to database: {str(e)}")
        database_logger.error(f"   🔍 Detection data: {detection_data}")
        database_logger.error(f"   📍 Source: {source}")
        database_logger.error(f"   🔧 Analysis type: {analysis_type}")
        try:
            db.rollback()
            database_logger.info("🔄 Database transaction rolled back")
        except:
            database_logger.error("❌ Failed to rollback database transaction")
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
        detection_logger.info(f"🔍 Starting frame analysis...")
        detection_logger.info(f"   📊 Frame size: {len(frame_bytes)} bytes")
        detection_logger.info(f"   🏷️ Frame ID: {frame_id}")
        detection_logger.info(f"   📍 Source: {source}")
        
        # Decode frame
        nparr = np.frombuffer(frame_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            try:
                image = Image.open(io.BytesIO(frame_bytes))
                frame = np.array(image.convert('RGB'))
                frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
                detection_logger.info("✅ Frame decoded using PIL fallback")
            except Exception as pil_error:
                detection_logger.error(f"❌ PIL fallback failed: {str(pil_error)}")
                raise ValueError("Could not decode frame data")
        else:
            detection_logger.info(f"✅ Frame decoded successfully: {frame.shape}")
        
        # Make prediction
        detection_logger.info("🤖 Running AI prediction...")
        result = accident_model.predict(frame)
        result["processing_time"] = time.time() - start_time
        result["frame_id"] = frame_id or f"frame_{int(time.time() * 1000)}"
        
        # DETAILED PREDICTION LOGGING
        detection_logger.info(f"🎯 AI Prediction Results:")
        detection_logger.info(f"   🚨 Accident Detected: {result.get('accident_detected', False)}")
        detection_logger.info(f"   📊 Confidence: {result.get('confidence', 0.0):.3f}")
        detection_logger.info(f"   🏷️ Predicted Class: {result.get('predicted_class', 'Unknown')}")
        detection_logger.info(f"   ⏱️ Processing Time: {result.get('processing_time', 0.0):.3f}s")
        detection_logger.info(f"   🎯 Threshold: {result.get('threshold', 0.5)}")
        detection_logger.info(f"   📝 Details: {result.get('details', 'No details')}")
        
        # Log to database
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
            detection_logger.info(f"✅ Database logging successful, Log ID: {log_entry.id}")
        else:
            detection_logger.error("❌ Database logging failed")
        
        return result
        
    except Exception as e:
        error_time = time.time() - start_time
        detection_logger.error(f"❌ Frame analysis error: {str(e)}")
        detection_logger.error(f"   ⏱️ Error occurred after: {error_time:.3f}s")
        detection_logger.error(f"   📊 Frame bytes length: {len(frame_bytes) if frame_bytes else 0}")
        detection_logger.error(f"   🏷️ Frame ID: {frame_id}")
        detection_logger.error(f"   📍 Source: {source}")
        
        return {
            "accident_detected": False,
            "confidence": 0.0,
            "details": f"Frame analysis error: {str(e)}",
            "processing_time": error_time,
            "error": True
        }

# ==================== APP INITIALIZATION ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("=" * 80)
    logger.info("🚀 STARTING ENHANCED ACCIDENT DETECTION API WITH COMPREHENSIVE LOGGING")
    logger.info("=" * 80)
    
    # Create all database tables
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Database tables created/verified")
    
    if accident_model.model is None:
        logger.warning("⚠️ Model not loaded during startup")
    else:
        logger.info("✅ AI Model loaded successfully")
        logger.info(f"   📍 Model path: {accident_model.model_path}")
        logger.info(f"   🎯 Threshold: {accident_model.threshold}")
        logger.info(f"   📐 Input size: {accident_model.input_size}")
    
    SNAPSHOTS_DIR.mkdir(exist_ok=True)
    logger.info(f"✅ Snapshots directory ready: {SNAPSHOTS_DIR}")
    
    # Create default super admin if none exists
    db = SessionLocal()
    try:
        create_default_super_admin(db)
    finally:
        db.close()
    
    logger.info("✅ Application startup complete")
    logger.info("=" * 80)
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down Enhanced Accident Detection API...")
    
    for client_id, processor in live_processors.items():
        try:
            if hasattr(processor, 'cleanup'):
                processor.cleanup()
        except Exception as e:
            logger.error(f"Error cleaning up processor {client_id}: {str(e)}")
    
    live_processors.clear()
    websocket_connections.clear()
    logger.info("✅ Shutdown complete")

# Create FastAPI instance with lifespan
app = FastAPI(
    title="Enhanced Accident Detection API with Authentication",
    description="AI-powered accident detection system with user/admin authentication and comprehensive logging",
    version="2.2.0",
    lifespan=lifespan
)

# ==================== CORS SETUP ====================

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
            "https://accident-prediction-1-mpm0.onrender.com"
        ]
    
    if os.getenv("ENVIRONMENT", "development") == "development":
        origins = ["*"]
    
    return origins

cors_origins = get_cors_origins()
logger.info(f"🌐 CORS origins configured: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600
)

# Mount static files for serving snapshots
app.mount("/snapshots", StaticFiles(directory="snapshots"), name="snapshots")

# ==================== ENHANCED WEBSOCKET ENDPOINT ====================

@app.websocket("/api/live/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for live detection with COMPREHENSIVE LOGGING"""
    await websocket.accept()
    
    client_id = f"client_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}"
    websocket_logger.info("=" * 60)
    websocket_logger.info(f"🔗 NEW WEBSOCKET CONNECTION")
    websocket_logger.info(f"   🆔 Client ID: {client_id}")
    websocket_logger.info(f"   🌐 Client IP: {websocket.client}")
    websocket_logger.info(f"   ⏰ Connection time: {datetime.now().isoformat()}")
    websocket_logger.info("=" * 60)
    
    # Store connection
    websocket_connections[client_id] = websocket
    
    try:
        # Send connection established message
        connection_message = {
            "type": "connection_established",
            "client_id": client_id,
            "message": "Connected to live detection service",
            "timestamp": time.time(),
            "server_info": {
                "model_loaded": accident_model.model is not None,
                "threshold": accident_model.threshold,
                "version": "2.2.0"
            }
        }
        
        await websocket.send_json(connection_message)
        websocket_logger.info(f"✅ Connection established message sent to {client_id}")
        
        # Initialize processor for this client
        live_processors[client_id] = LiveStreamProcessor()
        websocket_logger.info(f"🤖 Live processor initialized for {client_id}")
        
        # Get database session
        db = SessionLocal()
        database_logger.info(f"🗄️ Database session created for {client_id}")
        
        frame_count = 0
        
        # Message handling loop
        while True:
            try:
                # Wait for message with timeout
                message = await asyncio.wait_for(websocket.receive_text(), timeout=60.0)
                
                try:
                    data = json.loads(message)
                except json.JSONDecodeError as json_error:
                    websocket_logger.error(f"❌ Invalid JSON from {client_id}: {json_error}")
                    await websocket.send_json({
                        "error": "Invalid JSON format",
                        "type": "error"
                    })
                    continue
                
                # Handle ping messages
                if data.get("type") == "ping":
                    websocket_logger.info(f"🏓 Ping received from {client_id}")
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": time.time()
                    })
                    continue
                
                # Handle frame data for analysis
                if "frame" in data:
                    frame_count += 1
                    
                    websocket_logger.info("🎬" + "=" * 50)
                    websocket_logger.info(f"📸 PROCESSING FRAME #{frame_count} FROM {client_id}")
                    
                    try:
                        frame_data = data["frame"]
                        frame_id = data.get("frame_id", f"frame_{int(time.time() * 1000)}")
                        timestamp = data.get("timestamp", time.time())
                        
                        websocket_logger.info(f"   🏷️ Frame ID: {frame_id}")
                        websocket_logger.info(f"   ⏰ Timestamp: {timestamp}")
                        websocket_logger.info(f"   📊 Frame data length: {len(frame_data)} characters")
                        
                        # Decode base64 frame
                        websocket_logger.info("🔓 Decoding base64 frame data...")
                        frame_bytes = base64.b64decode(frame_data)
                        websocket_logger.info(f"✅ Frame decoded: {len(frame_bytes)} bytes")
                        
                        # Analyze the frame
                        websocket_logger.info("🤖 Starting AI analysis...")
                        result = await analyze_frame_with_logging(
                            frame_bytes=frame_bytes,
                            db=db,
                            source=f"live_websocket_{client_id}",
                            frame_id=frame_id
                        )
                        
                        # COMPREHENSIVE RESULT LOGGING
                        websocket_logger.info("🎯 AI ANALYSIS COMPLETE:")
                        websocket_logger.info(f"   🚨 ACCIDENT DETECTED: {result.get('accident_detected', False)}")
                        websocket_logger.info(f"   📊 CONFIDENCE: {result.get('confidence', 0.0):.3f}")
                        websocket_logger.info(f"   🏷️ PREDICTED CLASS: {result.get('predicted_class', 'Unknown')}")
                        websocket_logger.info(f"   ⏱️ PROCESSING TIME: {result.get('processing_time', 0.0):.3f}s")
                        websocket_logger.info(f"   🆔 LOG ID: {result.get('log_id', 'Not logged')}")
                        
                        if result.get('accident_detected', False):
                            websocket_logger.warning("🚨" * 20)
                            websocket_logger.warning("🚨 ACCIDENT DETECTED! ALERT CONDITION!")
                            websocket_logger.warning(f"🚨 Confidence: {result.get('confidence', 0.0):.1%}")
                            websocket_logger.warning(f"🚨 Frame: {frame_id}")
                            websocket_logger.warning(f"🚨 Client: {client_id}")
                            websocket_logger.warning("🚨" * 20)
                        else:
                            websocket_logger.info(f"✅ Normal traffic detected (confidence: {result.get('confidence', 0.0):.3f})")
                        
                        # Add metadata
                        result.update({
                            "client_id": client_id,
                            "received_timestamp": timestamp,
                            "analysis_timestamp": time.time(),
                            "type": "detection_result",
                            "frame_number": frame_count
                        })
                        
                        # Send result back to client
                        websocket_logger.info(f"📤 Sending result back to {client_id}")
                        await websocket.send_json(result)
                        websocket_logger.info(f"✅ Result sent successfully to {client_id}")
                        
                        # Additional logging for database verification
                        if result.get('log_id'):
                            websocket_logger.info(f"🗄️ Result saved to database with Log ID: {result['log_id']}")
                        else:
                            websocket_logger.warning(f"⚠️ Result was NOT saved to database!")
                        
                        websocket_logger.info("🎬" + "=" * 50)
                        
                    except Exception as analysis_error:
                        websocket_logger.error("❌" + "=" * 50)
                        websocket_logger.error(f"❌ FRAME ANALYSIS ERROR FOR {client_id}")
                        websocket_logger.error(f"   🔍 Error: {str(analysis_error)}")
                        websocket_logger.error(f"   🏷️ Frame ID: {data.get('frame_id', 'unknown')}")
                        websocket_logger.error(f"   📊 Frame data length: {len(data.get('frame', ''))}")
                        websocket_logger.error("❌" + "=" * 50)
                        
                        await websocket.send_json({
                            "error": f"Analysis failed: {str(analysis_error)}",
                            "type": "error",
                            "frame_id": data.get("frame_id", "unknown"),
                            "client_id": client_id
                        })
                
            except asyncio.TimeoutError:
                # Send ping to keep connection alive
                websocket_logger.info(f"⏰ Connection timeout - sending keepalive ping to {client_id}")
                await websocket.send_json({
                    "type": "ping",
                    "timestamp": time.time()
                })
                
            except WebSocketDisconnect:
                websocket_logger.info(f"🔌 WebSocket client {client_id} disconnected normally")
                break
                
            except Exception as e:
                websocket_logger.error(f"❌ WebSocket error for {client_id}: {str(e)}")
                await websocket.send_json({
                    "error": f"WebSocket error: {str(e)}",
                    "type": "error",
                    "client_id": client_id
                })
    
    except WebSocketDisconnect:
        websocket_logger.info(f"🔌 WebSocket client {client_id} disconnected")
    except Exception as e:
        websocket_logger.error(f"❌ Unexpected WebSocket error for {client_id}: {str(e)}")
    finally:
        # Clean up
        websocket_logger.info("🧹" + "=" * 50)
        websocket_logger.info(f"🧹 CLEANING UP CONNECTION {client_id}")
        
        if client_id in websocket_connections:
            del websocket_connections[client_id]
            websocket_logger.info(f"✅ Removed {client_id} from connections")
            
        if client_id in live_processors:
            try:
                if hasattr(live_processors[client_id], 'cleanup'):
                    live_processors[client_id].cleanup()
                del live_processors[client_id]
                websocket_logger.info(f"✅ Cleaned up processor for {client_id}")
            except Exception as e:
                websocket_logger.error(f"❌ Error cleaning up processor {client_id}: {str(e)}")
        
        try:
            db.close()
            websocket_logger.info(f"✅ Database session closed for {client_id}")
        except Exception as db_error:
            websocket_logger.error(f"❌ Error closing database for {client_id}: {str(db_error)}")
            
        websocket_logger.info(f"🧹 CONNECTION CLEANUP COMPLETE FOR {client_id}")
        websocket_logger.info("🧹" + "=" * 50)

# ==================== UPLOAD ENDPOINT ====================

@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload and analyze a file for accident detection with comprehensive logging"""
    try:
        logger.info("📤" + "=" * 60)
        logger.info(f"📤 FILE UPLOAD INITIATED")
        logger.info(f"   👤 User: {current_user.username} (ID: {current_user.id})")
        logger.info(f"   📁 Filename: {file.filename}")
        logger.info(f"   📊 Size: {file.size} bytes")
        logger.info(f"   🏷️ Content Type: {file.content_type}")
        logger.info("📤" + "=" * 60)
        
        # Validate file type
        allowed_types = {
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/avi', 'video/mov', 'video/quicktime', 'video/x-msvideo'
        }
        
        if file.content_type not in allowed_types:
            logger.warning(f"❌ Invalid file type: {file.content_type}")
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid file type. Supported types: {', '.join(allowed_types)}"
            )
        
        # Validate file size (50MB limit)
        if file.size > 50 * 1024 * 1024:
            logger.warning(f"❌ File too large: {file.size} bytes")
            raise HTTPException(status_code=400, detail="File too large. Maximum size is 50MB.")
        
        # Read file content
        logger.info("📖 Reading file content...")
        file_content = await file.read()
        logger.info(f"✅ File content read: {len(file_content)} bytes")
        
        # Analyze the file
        start_time = time.time()
        logger.info("🤖 Starting file analysis...")
        
        try:
            # Convert file content to frame for analysis
            result = await analyze_frame_with_logging(
                frame_bytes=file_content,
                db=db,
                source=f"user_upload_{current_user.username}",
                frame_id=f"upload_{int(time.time() * 1000)}"
            )
            
            # Add file metadata to result
            result.update({
                "filename": file.filename,
                "file_size": file.size,
                "content_type": file.content_type,
                "user_id": current_user.id,
                "username": current_user.username,
                "upload_timestamp": time.time(),
                "analysis_type": "file_upload"
            })
            
            processing_time = time.time() - start_time
            result["total_processing_time"] = processing_time
            
            # COMPREHENSIVE UPLOAD RESULT LOGGING
            logger.info("🎯 FILE ANALYSIS COMPLETE:")
            logger.info(f"   📁 File: {file.filename}")
            logger.info(f"   👤 User: {current_user.username}")
            logger.info(f"   🚨 Accident Detected: {result.get('accident_detected', False)}")
            logger.info(f"   📊 Confidence: {result.get('confidence', 0.0):.3f}")
            logger.info(f"   🏷️ Predicted Class: {result.get('predicted_class', 'Unknown')}")
            logger.info(f"   ⏱️ Total Processing Time: {processing_time:.3f}s")
            logger.info(f"   🆔 Log ID: {result.get('log_id', 'Not logged')}")
            
            if result.get('accident_detected', False):
                logger.warning("🚨" * 15)
                logger.warning("🚨 ACCIDENT DETECTED IN UPLOADED FILE!")
                logger.warning(f"🚨 File: {file.filename}")
                logger.warning(f"🚨 User: {current_user.username}")
                logger.warning(f"🚨 Confidence: {result.get('confidence', 0.0):.1%}")
                logger.warning("🚨" * 15)
            
            logger.info("📤" + "=" * 60)
            
            return result
            
        except Exception as analysis_error:
            logger.error("❌" + "=" * 60)
            logger.error(f"❌ FILE ANALYSIS FAILED")
            logger.error(f"   📁 File: {file.filename}")
            logger.error(f"   👤 User: {current_user.username}")
            logger.error(f"   🔍 Error: {str(analysis_error)}")
            logger.error("❌" + "=" * 60)
            
            raise HTTPException(
                status_code=500, 
                detail=f"Analysis failed: {str(analysis_error)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Upload failed for user {current_user.username}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# ==================== BASIC ROUTES ====================

@app.get("/")
async def root():
    return {
        "message": "Enhanced Accident Detection API with Authentication and Comprehensive Logging is running!", 
        "version": "2.2.0",
        "features": ["Real-time detection", "Database logging", "Snapshot storage", "User/Admin Auth", "Dashboard API", "Comprehensive Logging"],
        "cors_status": "enabled",
        "cors_origins": cors_origins,
        "active_websocket_connections": len(websocket_connections),
        "active_processors": len(live_processors),
        "model_status": "loaded" if accident_model.model is not None else "not_loaded"
    }

@app.get("/api/health")
async def health_check(db: Session = Depends(get_db)):
    try:
        logger.info("🔍 Health check requested")
        
        total_logs = db.query(AccidentLog).count()
        accidents_detected = db.query(AccidentLog).filter(AccidentLog.accident_detected == True).count()
        total_users = db.query(User).count()
        total_admins = db.query(Admin).count()
        
        health_data = {
            "status": "healthy",
            "model_loaded": accident_model.model is not None,
            "model_path": accident_model.model_path if hasattr(accident_model, 'model_path') else 'unknown',
            "threshold": accident_model.threshold if hasattr(accident_model, 'threshold') else 0.5,
            "active_websocket_connections": len(websocket_connections),
            "active_processors": len(live_processors),
            "database_status": "connected",
            "total_logs": total_logs,
            "accidents_detected": accidents_detected,
            "total_users": total_users,
            "total_admins": total_admins,
            "snapshots_directory": str(SNAPSHOTS_DIR),
            "timestamp": time.time(),
            "cors_status": "enabled",
            "cors_origins": cors_origins,
            "version": "2.2.0"
        }
        
        logger.info(f"✅ Health check successful: {accidents_detected}/{total_logs} accidents detected")
        return health_data
        
    except Exception as e:
        logger.error(f"❌ Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "model_loaded": accident_model.model is not None if accident_model else False,
            "cors_status": "enabled",
            "active_websocket_connections": len(websocket_connections),
            "active_processors": len(live_processors),
            "version": "2.2.0"
        }

@app.get("/api/dashboard/stats")
async def get_dashboard_stats_public(db: Session = Depends(get_db)):
    """Get dashboard statistics with logging"""
    try:
        logger.info("📊 Dashboard stats requested")
        
        total_logs = db.query(AccidentLog).count()
        accidents_detected = db.query(AccidentLog).filter(AccidentLog.accident_detected == True).count()
        
        stats = {
            "total_logs": total_logs,
            "accidents_detected": accidents_detected,
            "accuracy_rate": round((accidents_detected / total_logs * 100) if total_logs > 0 else 0, 1),
            "active_connections": len(websocket_connections),
            "active_processors": len(live_processors),
            "model_status": "loaded" if accident_model.model is not None else "not_loaded"
        }
        
        logger.info(f"📊 Dashboard stats: {accidents_detected}/{total_logs} accidents, {len(websocket_connections)} active connections")
        return stats
        
    except Exception as e:
        logger.error(f"❌ Error fetching dashboard stats: {str(e)}")
        return {
            "total_logs": 0,
            "accidents_detected": 0,
            "accuracy_rate": 0,
            "active_connections": len(websocket_connections),
            "active_processors": len(live_processors),
            "model_status": "not_loaded"
        }

@app.get("/api/logs")
async def get_logs_public(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=500),
    accident_only: bool = Query(False),
    status: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get accident logs with filtering and logging"""
    try:
        logger.info(f"📋 Logs requested: skip={skip}, limit={limit}, accident_only={accident_only}")
        
        query = db.query(AccidentLog)
        
        if accident_only:
            query = query.filter(AccidentLog.accident_detected == True)
        
        if status:
            query = query.filter(AccidentLog.status == status)
            
        if source:
            query = query.filter(AccidentLog.video_source.like(f"%{source}%"))
        
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
                "analysis_type": log.analysis_type,
                "status": log.status,
                "severity_estimate": log.severity_estimate,
                "location": log.location,
                "snapshot_url": log.snapshot_url,
                "created_at": log.created_at.isoformat() if log.created_at else None
            })
        
        logger.info(f"📋 Returned {len(result)} logs")
        return result
        
    except Exception as e:
        logger.error(f"❌ Error fetching logs: {str(e)}")
        return []

# ==================== AUTHENTICATION ROUTES ====================

@app.post("/auth/register", response_model=UserResponse)
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    try:
        logger.info(f"👤 User registration attempt: {user.username}")
        db_user = create_user(db, user)
        logger.info(f"✅ User registered successfully: {user.username} (ID: {db_user.id})")
        
        return UserResponse(
            id=db_user.id,
            username=db_user.username,
            email=db_user.email,
            is_active=db_user.is_active,
            created_at=db_user.created_at,
            last_login=db_user.last_login
        )
    except HTTPException:
        logger.warning(f"❌ User registration failed: {user.username}")
        raise
    except Exception as e:
        logger.error(f"❌ User registration error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@app.post("/auth/login", response_model=Token)
async def login_user(user_credentials: UserLogin, db: Session = Depends(get_db)):
    logger.info(f"🔐 Login attempt: {user_credentials.username}")
    
    user = authenticate_user(db, user_credentials.username, user_credentials.password)
    if not user:
        logger.warning(f"❌ Login failed: {user_credentials.username}")
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
    
    logger.info(f"✅ Login successful: {user_credentials.username}")
    
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
    logger.info(f"🔐 Admin login attempt: {admin_credentials.username}")
    
    admin = authenticate_admin(db, admin_credentials.username, admin_credentials.password)
    if not admin:
        logger.warning(f"❌ Admin login failed: {admin_credentials.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect admin credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_admin_access_token(admin)
    
    logger.info(f"✅ Admin login successful: {admin_credentials.username}")
    
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

# ==================== ERROR HANDLERS ====================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with CORS headers and logging"""
    logger.error(f"❌ HTTP Exception: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true"
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions with logging"""
    logger.error(f"❌ Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true"
        }
    )

# ==================== STARTUP CONFIGURATION ====================

if __name__ == "__main__":
    import uvicorn
    
    print("=" * 80)
    print("🚀 ACCIDENT DETECTION API STARTING WITH COMPREHENSIVE LOGGING")
    print("=" * 80)
    print(f"📍 Server URL: http://0.0.0.0:8000")
    print(f"📍 Production URL: https://accident-prediction-1-mpm0.onrender.com")
    print(f"🔌 WebSocket URL: wss://accident-prediction-1-mpm0.onrender.com/api/live/ws")
    print(f"📋 API Docs: /docs")
    print(f"🔍 Health Check: /api/health")
    print(f"🌐 CORS Origins: {cors_origins}")
    print("=" * 80)
    print("🔐 Default Admin Credentials:")
    print("   Username: superadmin")
    print("   Password: admin123")
    print("   ⚠️  CHANGE THESE IN PRODUCTION!")
    print("=" * 80)
    print("📝 Logging Features:")
    print("   ✅ WebSocket connections and disconnections")
    print("   ✅ Frame processing and AI predictions")
    print("   ✅ Database operations and errors")
    print("   ✅ File uploads and analysis")
    print("   ✅ Authentication attempts")
    print("   ✅ Accident detection alerts")
    print("=" * 80)
    print("✅ WebSocket Authentication: DISABLED (Public Access)")
    print("✅ File Upload: Requires User Authentication")
    print("✅ Dashboard/Logs: Public Access")
    print("=" * 80)
    
    # Run the server with production settings
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=int(os.getenv("PORT", 8000)),
        log_level="info"
    )
