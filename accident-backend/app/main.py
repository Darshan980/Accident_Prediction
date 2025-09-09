# Complete Optimized main.py - Performance and Timeout Fixes v2.3.0
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
import threading
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
import signal
import sys

# Database imports
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, Text, and_, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.sql import func
from pydantic import BaseModel

# Import detection service with fallback
try:
    from services.detection import accident_model, analyze_image, LiveStreamProcessor
except ImportError:
    # Fallback mock model for testing/deployment
    class MockModel:
        def __init__(self):
            self.model = None
            self.threshold = 0.5
            self.input_size = (128, 128)
            self.model_path = "mock_model"
        
        def predict(self, frame):
            import random
            return {
                "accident_detected": random.random() > 0.8,
                "confidence": random.random(),
                "predicted_class": "mock_prediction",
                "processing_time": 0.1
            }
    
    accident_model = MockModel()
    
    class LiveStreamProcessor:
        def __init__(self):
            pass
        def cleanup(self):
            pass

# LOGGING CONFIGURATION
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('accident_detection.log', mode='a')
    ]
)
logger = logging.getLogger(__name__)
websocket_logger = logging.getLogger('websocket')
detection_logger = logging.getLogger('detection')
database_logger = logging.getLogger('database')
performance_logger = logging.getLogger('performance')

# RENDER-OPTIMIZED CONFIGURATION
WORKER_TIMEOUT = 300
MAX_PREDICTION_TIME = 25
THREAD_POOL_SIZE = 2
WEBSOCKET_TIMEOUT = 60
FRAME_PROCESSING_INTERVAL = 2.0

# Thread pool for ML operations
ml_thread_pool = ThreadPoolExecutor(max_workers=THREAD_POOL_SIZE, thread_name_prefix="ML_Worker")

# Database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./accident_detection.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False, "timeout": 20},
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=5,
    max_overflow=10
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Global state
BASE_DIR = Path(__file__).parent
SNAPSHOTS_DIR = BASE_DIR / "snapshots"
live_processors = {}
websocket_connections = {}

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

# ==================== ML PREDICTION FUNCTIONS ====================

def run_ml_prediction_sync(frame: np.ndarray) -> dict:
    try:
        start_time = time.time()
        
        if frame is None or frame.size == 0:
            return {"accident_detected": False, "confidence": 0.0, "predicted_class": "invalid_input", "processing_time": 0.0, "error": "Invalid frame"}
        
        if not hasattr(accident_model, 'model') or accident_model.model is None:
            return {"accident_detected": False, "confidence": 0.0, "predicted_class": "model_not_loaded", "processing_time": 0.0, "error": "Model not loaded"}
        
        # Resize frame for efficiency
        try:
            target_size = getattr(accident_model, 'input_size', (128, 128))
            if isinstance(target_size, tuple) and len(target_size) == 2:
                frame = cv2.resize(frame, target_size)
        except Exception:
            frame = cv2.resize(frame, (128, 128))
        
        result = accident_model.predict(frame)
        processing_time = time.time() - start_time
        
        if not isinstance(result, dict):
            result = {"accident_detected": False, "confidence": 0.0, "predicted_class": "unknown"}
        
        result["processing_time"] = processing_time
        return result
        
    except Exception as e:
        processing_time = time.time() - start_time if 'start_time' in locals() else 0.0
        return {
            "accident_detected": False,
            "confidence": 0.0,
            "predicted_class": "error",
            "processing_time": processing_time,
            "error": str(e)
        }

async def run_ml_prediction_async(frame: np.ndarray) -> dict:
    loop = asyncio.get_event_loop()
    try:
        future = loop.run_in_executor(ml_thread_pool, run_ml_prediction_sync, frame)
        result = await asyncio.wait_for(future, timeout=MAX_PREDICTION_TIME)
        return result
    except asyncio.TimeoutError:
        return {
            "accident_detected": False,
            "confidence": 0.0,
            "predicted_class": "timeout",
            "processing_time": MAX_PREDICTION_TIME,
            "error": f"Prediction timed out after {MAX_PREDICTION_TIME} seconds"
        }
    except Exception as e:
        return {
            "accident_detected": False,
            "confidence": 0.0,
            "predicted_class": "error",
            "processing_time": 0.0,
            "error": str(e)
        }

# ==================== AUTH FUNCTIONS ====================

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
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
        return {"username": username, "user_id": payload.get("user_id")}
    except JWTError:
        return None

# ==================== DATABASE FUNCTIONS ====================

def get_user_by_username(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username).first()

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()

def create_user(db: Session, user: UserCreate) -> User:
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
    user = get_user_by_username(db, username)
    if not user or not verify_password(password, user.hashed_password):
        return None
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    return user

def get_admin_by_username(db: Session, username: str) -> Optional[Admin]:
    return db.query(Admin).filter(Admin.username == username).first()

def create_admin(db: Session, admin: AdminCreate) -> Admin:
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
    admin = get_admin_by_username(db, username)
    if not admin or not verify_password(password, admin.hashed_password):
        return None
    admin.last_login = datetime.now(timezone.utc)
    db.commit()
    return admin

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
    except Exception as e:
        logger.error(f"Error creating default super admin: {str(e)}")

# ==================== DEPENDENCY FUNCTIONS ====================

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> User:
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

def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> Admin:
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

def save_snapshot(frame: np.ndarray, detection_data: dict) -> tuple[str, str]:
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        frame_id = detection_data.get('frame_id', 'unknown')
        filename = f"accident_{timestamp}_{frame_id}_{uuid.uuid4().hex[:8]}.jpg"
        filepath = SNAPSHOTS_DIR / filename
        cv2.imwrite(str(filepath), frame)
        url_path = f"/snapshots/{filename}"
        return filename, url_path
    except Exception as e:
        logger.error(f"Failed to save snapshot: {str(e)}")
        return None, None

def log_accident_detection(db: Session, detection_data: dict, frame: np.ndarray = None, source: str = "unknown", analysis_type: str = "unknown") -> AccidentLog:
    try:
        snapshot_filename = None
        snapshot_url = None
        
        if frame is not None and detection_data.get('accident_detected', False):
            snapshot_filename, snapshot_url = save_snapshot(frame, detection_data)
        
        confidence = detection_data.get('confidence', 0.0)
        severity = 'high' if confidence >= 0.9 else 'medium' if confidence >= 0.7 else 'low'
        
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
        return log_entry
    except Exception as e:
        logger.error(f"Failed to log detection: {str(e)}")
        try:
            db.rollback()
        except:
            pass
        return None

async def analyze_frame_with_logging(frame_bytes: bytes, db: Session, source: str = "live_camera", frame_id: str = None) -> dict:
    overall_start_time = time.time()
    frame = None
    
    try:
        # Decode frame
        decode_start = time.time()
        nparr = np.frombuffer(frame_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            try:
                image = Image.open(io.BytesIO(frame_bytes))
                frame = np.array(image.convert('RGB'))
                frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
            except Exception:
                raise ValueError("Could not decode frame data")
        
        decode_time = time.time() - decode_start
        
        # Run ML prediction
        result = await run_ml_prediction_async(frame)
        
        # Add timing metadata
        total_time = time.time() - overall_start_time
        result["total_processing_time"] = total_time
        result["decode_time"] = decode_time
        result["frame_id"] = frame_id or f"frame_{int(time.time() * 1000)}"
        
        # Log to database
        try:
            log_entry = log_accident_detection(db=db, detection_data=result, frame=frame, source=source, analysis_type="optimized_live")
            if log_entry:
                result["log_id"] = log_entry.id
                result["snapshot_url"] = log_entry.snapshot_url
        except Exception:
            pass  # Don't fail request due to DB issues
        
        return result
        
    except Exception as e:
        error_time = time.time() - overall_start_time
        return {
            "accident_detected": False,
            "confidence": 0.0,
            "predicted_class": "error",
            "processing_time": 0.0,
            "total_processing_time": error_time,
            "details": f"Frame analysis error: {str(e)}",
            "error": True
        }

# ==================== APP INITIALIZATION ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("=" * 80)
    logger.info("STARTING RENDER-OPTIMIZED ACCIDENT DETECTION API v2.3.0")
    logger.info("=" * 80)
    
    # Create database tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified")
    
    # Pre-warm ML model
    try:
        if hasattr(accident_model, 'model') and accident_model.model is not None:
            dummy_frame = np.zeros((128, 128, 3), dtype=np.uint8)
            warmup_result = await run_ml_prediction_async(dummy_frame)
            logger.info(f"Model pre-warmed in {warmup_result.get('processing_time', 0):.3f}s")
        else:
            logger.warning("Model not loaded - using mock predictions")
    except Exception as e:
        logger.error(f"Model pre-warming failed: {str(e)}")
    
    SNAPSHOTS_DIR.mkdir(exist_ok=True)
    logger.info(f"Snapshots directory ready: {SNAPSHOTS_DIR}")
    
    # Create default admin
    db = SessionLocal()
    try:
        create_default_super_admin(db)
    finally:
        db.close()
    
    logger.info("Application startup complete")
    logger.info("=" * 80)
    
    yield
    
    # Shutdown
    logger.info("Shutting down API...")
    ml_thread_pool.shutdown(wait=True, timeout=10)
    
    for client_id, processor in live_processors.items():
        try:
            if hasattr(processor, 'cleanup'):
                processor.cleanup()
        except:
            pass
    
    live_processors.clear()
    websocket_connections.clear()
    logger.info("Shutdown complete")

# Create FastAPI app
app = FastAPI(
    title="Render-Optimized Accident Detection API",
    description="AI-powered accident detection system optimized for Render deployment",
    version="2.3.0",
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
            "https://accident-prediction-1-mpm0.onrender.com",
            "https://accident-prediction-7wnp-git-main-darshan-ss-projects-39372c06.vercel.app",
            "https://*.vercel.app",
            "https://*.onrender.com"
        ]
    
    if os.getenv("ENVIRONMENT", "development") == "development":
        origins = ["*"]
    
    return origins

cors_origins = get_cors_origins()
logger.info(f"CORS origins configured: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600
)

# Mount static files
try:
    app.mount("/snapshots", StaticFiles(directory="snapshots"), name="snapshots")
except Exception as e:
    logger.warning(f"Could not mount snapshots directory: {str(e)}")

# ==================== WEBSOCKET ENDPOINT ====================

@app.websocket("/api/live/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    client_id = f"client_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}"
    websocket_connections[client_id] = websocket
    
    frames_processed = 0
    total_processing_time = 0
    connection_start_time = time.time()
    last_frame_time = 0
    
    try:
        # Send connection message
        await websocket.send_json({
            "type": "connection_established",
            "client_id": client_id,
            "message": "Connected to Render-optimized live detection service",
            "timestamp": time.time(),
            "server_info": {
                "model_loaded": hasattr(accident_model, 'model') and accident_model.model is not None,
                "threshold": getattr(accident_model, 'threshold', 0.5),
                "version": "2.3.0-render-optimized",
                "max_prediction_time": MAX_PREDICTION_TIME,
                "thread_pool_size": THREAD_POOL_SIZE,
                "frame_interval": FRAME_PROCESSING_INTERVAL
            }
        })
        
        # Initialize processor
        live_processors[client_id] = LiveStreamProcessor()
        db = SessionLocal()
        
        while True:
            try:
                message = await asyncio.wait_for(websocket.receive_text(), timeout=WEBSOCKET_TIMEOUT)
                data = json.loads(message)
                
                # Handle ping
                if data.get("type") == "ping":
                    await websocket.send_json({
                        "type": "pong", 
                        "timestamp": time.time(),
                        "server_stats": {
                            "frames_processed": frames_processed,
                            "avg_processing_time": total_processing_time / max(frames_processed, 1),
                            "connection_uptime": time.time() - connection_start_time,
                            "active_connections": len(websocket_connections)
                        }
                    })
                    continue
                
                # Handle frame processing with rate limiting
                if "frame" in data:
                    current_time = time.time()
                    
                    # Rate limiting
                    if current_time - last_frame_time < FRAME_PROCESSING_INTERVAL:
                        continue
                    
                    last_frame_time = current_time
                    frame_start_time = current_time
                    frames_processed += 1
                    
                    try:
                        frame_data = data["frame"]
                        frame_id = data.get("frame_id", f"frame_{int(time.time() * 1000)}")
                        
                        # Decode frame
                        try:
                            frame_bytes = base64.b64decode(frame_data)
                        except Exception as decode_error:
                            await websocket.send_json({
                                "error": f"Frame decode failed: {str(decode_error)}",
                                "type": "error",
                                "frame_id": frame_id
                            })
                            continue
                        
                        # Analyze frame
                        result = await analyze_frame_with_logging(
                            frame_bytes=frame_bytes,
                            db=db,
                            source=f"live_websocket_optimized_{client_id}",
                            frame_id=frame_id
                        )
                        
                        # Update performance tracking
                        frame_processing_time = time.time() - frame_start_time
                        total_processing_time += frame_processing_time
                        
                        # Add metadata
                        result.update({
                            "client_id": client_id,
                            "received_timestamp": data.get("timestamp", time.time()),
                            "analysis_timestamp": time.time(),
                            "type": "detection_result",
                            "frame_number": frames_processed,
                            "optimization_level": "render-optimized",
                            "session_stats": {
                                "total_frames": frames_processed,
                                "avg_processing_time": total_processing_time / frames_processed,
                                "connection_uptime": time.time() - connection_start_time,
                                "rate_limited": True
                            }
                        })
                        
                        # Send result
                        await websocket.send_json(result)
                        
                    except Exception as analysis_error:
                        await websocket.send_json({
                            "error": f"Analysis failed: {str(analysis_error)}",
                            "type": "error",
                            "frame_id": data.get("frame_id", "unknown"),
                            "client_id": client_id
                        })
                
            except asyncio.TimeoutError:
                await websocket.send_json({
                    "type": "ping",
                    "timestamp": time.time(),
                    "server_stats": {
                        "render_optimized": True,
                        "active_connections": len(websocket_connections)
                    }
                })
                
            except WebSocketDisconnect:
                break
                
            except Exception as e:
                try:
                    await websocket.send_json({
                        "error": f"WebSocket error: {str(e)}",
                        "type": "error",
                        "client_id": client_id
                    })
                except:
                    break
    
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"Unexpected WebSocket error for {client_id}: {str(e)}")
    finally:
        # Cleanup
        websocket_connections.pop(client_id, None)
        processor = live_processors.pop(client_id, None)
        if processor and hasattr(processor, 'cleanup'):
            try:
                processor.cleanup()
            except:
                pass
        
        try:
            db.close()
        except:
            pass

# ==================== HTTP ENDPOINTS ====================

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...), current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    try:
        # Validate file
        allowed_types = {'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
                        'video/mp4', 'video/avi', 'video/mov', 'video/quicktime', 'video/x-msvideo'}
        
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail=f"Invalid file type. Supported types: {', '.join(allowed_types)}")
        
        # Validate file size (50MB limit)
        if file.size > 50 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large. Maximum size is 50MB.")
        
        # Read file content
        file_content = await file.read()
        
        # Analyze the file
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
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/")
async def root():
    return {
        "message": "Render-Optimized Accident Detection API v2.3.0 is running!", 
        "version": "2.3.0",
        "features": ["Real-time detection", "Database logging", "Snapshot storage", "User/Admin Auth", "Performance Optimization", "Render Deployment"],
        "cors_status": "enabled",
        "cors_origins": cors_origins,
        "active_websocket_connections": len(websocket_connections),
        "active_processors": len(live_processors),
        "model_status": "loaded" if hasattr(accident_model, 'model') and accident_model.model is not None else "mock_model",
        "performance_config": {
            "max_prediction_time": MAX_PREDICTION_TIME,
            "thread_pool_size": THREAD_POOL_SIZE,
            "websocket_timeout": WEBSOCKET_TIMEOUT,
            "frame_interval": FRAME_PROCESSING_INTERVAL
        }
    }

@app.get("/api/health")
async def health_check(db: Session = Depends(get_db)):
    try:
        total_logs = db.query(AccidentLog).count()
        accidents_detected = db.query(AccidentLog).filter(AccidentLog.accident_detected == True).count()
        total_users = db.query(User).count()
        total_admins = db.query(Admin).count()
        
        health_data = {
            "status": "healthy",
            "model_loaded": hasattr(accident_model, 'model') and accident_model.model is not None,
            "model_path": getattr(accident_model, 'model_path', 'mock_model'),
            "threshold": getattr(accident_model, 'threshold', 0.5),
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
            "version": "2.3.0-render-optimized",
            "performance_config": {
                "max_prediction_time": MAX_PREDICTION_TIME,
                "thread_pool_size": THREAD_POOL_SIZE,
                "websocket_timeout": WEBSOCKET_TIMEOUT,
                "frame_interval": FRAME_PROCESSING_INTERVAL
            },
            "current_stats": {
                "thread_pool": {
                    "active_threads": len([t for t in ml_thread_pool._threads if t.is_alive()]) if hasattr(ml_thread_pool, '_threads') else 0
                },
                "active_websocket_connections": len(websocket_connections),
                "model_loaded": hasattr(accident_model, 'model') and accident_model.model is not None
            }
        }
        
        return health_data
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "model_loaded": hasattr(accident_model, 'model') and accident_model.model is not None,
            "cors_status": "enabled",
            "active_websocket_connections": len(websocket_connections),
            "active_processors": len(live_processors),
            "version": "2.3.0-render-optimized"
        }

@app.get("/api/performance")
async def get_performance_stats():
    """Get current performance statistics"""
    try:
        return {
            "version": "2.3.0-render-optimized",
            "performance_config": {
                "max_prediction_time": MAX_PREDICTION_TIME,
                "thread_pool_size": THREAD_POOL_SIZE,
                "websocket_timeout": WEBSOCKET_TIMEOUT,
                "frame_interval": FRAME_PROCESSING_INTERVAL
            },
            "current_stats": {
                "active_websocket_connections": len(websocket_connections),
                "active_processors": len(live_processors),
                "thread_pool": {
                    "active_threads": len([t for t in ml_thread_pool._threads if t.is_alive()]) if hasattr(ml_thread_pool, '_threads') else 0,
                    "total_threads": THREAD_POOL_SIZE
                },
                "model_loaded": hasattr(accident_model, 'model') and accident_model.model is not None,
                "snapshots_directory_exists": SNAPSHOTS_DIR.exists()
            },
            "optimization_features": [
                "Rate-limited frame processing",
                "Async ML prediction with timeout",
                "Thread pool for ML operations", 
                "Memory-efficient frame handling",
                "Enhanced error handling",
                "Render deployment optimized"
            ]
        }
    except Exception as e:
        return {
            "error": str(e),
            "version": "2.3.0-render-optimized"
        }

@app.get("/api/dashboard/stats")
async def get_dashboard_stats_public(db: Session = Depends(get_db)):
    """Get dashboard statistics"""
    try:
        total_logs = db.query(AccidentLog).count()
        accidents_detected = db.query(AccidentLog).filter(AccidentLog.accident_detected == True).count()
        
        return {
            "total_logs": total_logs,
            "accidents_detected": accidents_detected,
            "accuracy_rate": round((accidents_detected / total_logs * 100) if total_logs > 0 else 0, 1),
            "active_connections": len(websocket_connections),
            "active_processors": len(live_processors),
            "model_status": "loaded" if hasattr(accident_model, 'model') and accident_model.model is not None else "mock_model"
        }
        
    except Exception as e:
        return {
            "total_logs": 0,
            "accidents_detected": 0,
            "accuracy_rate": 0,
            "active_connections": len(websocket_connections),
            "active_processors": len(live_processors),
            "model_status": "error",
            "error": str(e)
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
    """Get accident logs with filtering"""
    try:
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
        
        return result
        
    except Exception as e:
        logger.error(f"Error fetching logs: {str(e)}")
        return []

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
    """Handle HTTP exceptions with CORS headers"""
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
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true"
        }
    )

# ==================== SIGNAL HANDLERS FOR GRACEFUL SHUTDOWN ====================

def signal_handler(signum, frame):
    """Handle shutdown signals gracefully"""
    logger.info(f"Received signal {signum}, starting graceful shutdown...")
    
    # Close all WebSocket connections
    for client_id, websocket in list(websocket_connections.items()):
        try:
            asyncio.create_task(websocket.close())
        except Exception as e:
            logger.error(f"Error closing WebSocket {client_id}: {e}")
    
    # Shutdown thread pool
    ml_thread_pool.shutdown(wait=False, timeout=5)
    
    logger.info("Graceful shutdown completed")
    sys.exit(0)

# Register signal handlers
signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)

# ==================== STARTUP CONFIGURATION ====================

if __name__ == "__main__":
    import uvicorn
    
    print("=" * 80)
    print("🚀 RENDER-OPTIMIZED ACCIDENT DETECTION API v2.3.0 STARTING")
    print("=" * 80)
    print(f"📍 Server URL: http://0.0.0.0:8000")
    print(f"📍 Production URL: https://accident-prediction-1-mpm0.onrender.com")
    print(f"🔌 WebSocket URL: wss://accident-prediction-1-mpm0.onrender.com/api/live/ws")
    print(f"📋 API Docs: /docs")
    print(f"🔍 Health Check: /api/health")
    print(f"📊 Performance Stats: /api/performance")
    print(f"🌐 CORS Origins: {cors_origins}")
    print("=" * 80)
    print("🔐 Default Admin Credentials:")
    print("   Username: superadmin")
    print("   Password: admin123")
    print("   ⚠️  CHANGE THESE IN PRODUCTION!")
    print("=" * 80)
    print("⚡ Render Optimizations:")
    print(f"   🧵 Thread Pool Size: {THREAD_POOL_SIZE}")
    print(f"   ⏰ Max ML Prediction Time: {MAX_PREDICTION_TIME}s")
    print(f"   🔌 WebSocket Timeout: {WEBSOCKET_TIMEOUT}s")
    print(f"   🎬 Frame Processing Interval: {FRAME_PROCESSING_INTERVAL}s")
    print("=" * 80)
    print("✅ WebSocket Authentication: DISABLED (Public Access)")
    print("✅ File Upload: Requires User Authentication")
    print("✅ Dashboard/Logs: Public Access")
    print("✅ Performance Monitoring: Enabled")
    print("✅ Graceful Shutdown: Enabled")
    print("=" * 80)
    
    # Run the server with optimized settings for Render
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=int(os.getenv("PORT", 8000)),
        log_level="info",
        access_log=True
    )
