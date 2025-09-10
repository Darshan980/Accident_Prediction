# main.py - UPDATED to include missing dashboard routes
import os
import sys
import signal
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

# Import from config/settings
from config.settings import SNAPSHOTS_DIR, PORT, HOST, get_cors_origins, is_allowed_origin

# Import models and database
from models.database import create_tables, SessionLocal
from auth.handlers import create_default_super_admin

# Import routers
from auth.routes import router as auth_router
from api.core import router as core_router
from api.upload import router as upload_router
from api.websocket import websocket_endpoint

# NEW: Import the missing dashboard routes
from api.dashboard_routes import router as dashboard_router

# Import services
from services.analysis import warmup_model, cleanup_thread_pool

# Setup logging
from utils.logging import setup_logging

# Initialize logging
logger_dict = setup_logging()
logger = logging.getLogger(__name__)

class CustomCORSMiddleware(BaseHTTPMiddleware):
    """Custom CORS middleware that handles dynamic Vercel URLs"""
    
    def __init__(self, app, **kwargs):
        super().__init__(app)
        self.allow_credentials = True
        self.allow_methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]
        self.allow_headers = [
            "Accept", "Accept-Language", "Content-Language", "Content-Type",
            "Authorization", "X-Requested-With", "X-CSRFToken", "X-Custom-Header",
            "Origin", "User-Agent", "DNT", "Cache-Control", "X-Mx-ReqToken",
            "Keep-Alive", "If-Modified-Since"
        ]
        self.expose_headers = [
            "Content-Length", "Content-Type", "Content-Disposition",
            "X-Total-Count", "X-Page-Count"
        ]
        self.max_age = 86400
    
    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin")
        
        # Handle preflight requests
        if request.method == "OPTIONS":
            if origin and is_allowed_origin(origin):
                response = Response()
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Methods"] = ", ".join(self.allow_methods)
                response.headers["Access-Control-Allow-Headers"] = ", ".join(self.allow_headers)
                response.headers["Access-Control-Max-Age"] = str(self.max_age)
                logger.info(f"✅ CORS preflight allowed for origin: {origin}")
                return response
            else:
                logger.warning(f"❌ CORS preflight rejected for origin: {origin}")
                return Response(status_code=400)
        
        # Handle actual requests
        response = await call_next(request)
        
        if origin and is_allowed_origin(origin):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Expose-Headers"] = ", ".join(self.expose_headers)
            logger.debug(f"✅ CORS headers added for origin: {origin}")
        
        return response

def run_migration():
    """Add department column to users table if it doesn't exist"""
    try:
        database_url = None
        database_url = os.getenv("DATABASE_URL")
        
        if not database_url:
            try:
                from config.settings import DATABASE_URL as SETTINGS_DB_URL
                database_url = SETTINGS_DB_URL
            except ImportError:
                pass
        
        if not database_url:
            database_url = "sqlite:///./accident_detection.db"
            
        logger.info(f"Using database URL: {database_url.split('://')[0]}://...")
        
        engine = create_engine(database_url)
        
        with engine.connect() as connection:
            try:
                result = connection.execute(text("SELECT department FROM users LIMIT 1"))
                logger.info("Department column already exists")
                return
            except OperationalError:
                logger.info("Adding department column to users table...")
                
                if "sqlite" in database_url.lower():
                    connection.execute(text("ALTER TABLE users ADD COLUMN department VARCHAR DEFAULT 'General'"))
                else:
                    connection.execute(text("ALTER TABLE users ADD COLUMN department VARCHAR(255) DEFAULT 'General'"))
                
                connection.execute(text("UPDATE users SET department = 'General' WHERE department IS NULL"))
                connection.commit()
                logger.info("Department column added successfully")
                
    except Exception as e:
        logger.error(f"Migration failed: {str(e)}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("=" * 80)
    logger.info("STARTING ACCIDENT DETECTION API v2.3.0 - CUSTOM CORS")
    logger.info("=" * 80)
    
    try:
        create_tables()
        logger.info("Database tables created/verified")
        
        run_migration()
        
        db = SessionLocal()
        try:
            create_default_super_admin(db)
            logger.info("Default admin user verified")
        except Exception as e:
            logger.warning(f"Admin creation issue: {e}")
        finally:
            db.close()
        
        try:
            warmup_result = await warmup_model()
            logger.info(f"Model initialization: {warmup_result.get('status', 'unknown')}")
        except Exception as e:
            logger.error(f"Model warmup failed: {e}")
        
        SNAPSHOTS_DIR.mkdir(exist_ok=True)
        logger.info(f"Snapshots directory ready: {SNAPSHOTS_DIR}")
        
        logger.info("Application startup complete")
        logger.info("=" * 80)
        
        yield
        
    except Exception as e:
        logger.error(f"Startup failed: {str(e)}")
        raise
    
    # Shutdown
    logger.info("Shutting down API...")
    try:
        cleanup_thread_pool()
    except Exception as e:
        logger.error(f"Cleanup error: {e}")
    logger.info("Shutdown complete")

# Create FastAPI app
app = FastAPI(
    title="Accident Detection API with Custom CORS",
    description="AI-powered accident detection system with dynamic CORS support",
    version="2.3.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Add custom CORS middleware FIRST
app.add_middleware(CustomCORSMiddleware)

# Log CORS configuration
cors_origins = get_cors_origins()
logger.info(f"🌐 CORS origins configured: {cors_origins}")
logger.info("🔧 Using custom CORS middleware for dynamic origin handling")

# Add trusted host middleware for production
if os.getenv("ENVIRONMENT") == "production":
    app.add_middleware(
        TrustedHostMiddleware, 
        allowed_hosts=[
            "accident-prediction-1-mpm0.onrender.com",
            "*.vercel.app",
            "*.onrender.com",
            "localhost"
        ]
    )

# Mount static files for snapshots
try:
    app.mount("/snapshots", StaticFiles(directory="snapshots"), name="snapshots")
    logger.info("Snapshots static files mounted")
except Exception as e:
    logger.warning(f"Could not mount snapshots directory: {str(e)}")

# Include routers - UPDATED to include dashboard router
app.include_router(core_router, prefix="/api", tags=["core"])
app.include_router(auth_router, prefix="/auth", tags=["authentication"])  
app.include_router(upload_router, prefix="/api", tags=["upload"])
app.include_router(dashboard_router, prefix="/api", tags=["dashboard"])  # NEW: Add dashboard routes

# WebSocket endpoints
app.websocket("/api/live/ws")(websocket_endpoint)
# NEW: Add the alerts WebSocket from dashboard_router 
# Note: The /ws/alerts endpoint is now handled in dashboard_routes.py

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Accident Detection API is running",
        "version": "2.3.0",
        "status": "operational",
        "cors": "custom_middleware_enabled",
        "docs": "/docs",
        "health": "/api/health"
    }

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "error": "HTTP Exception"}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception on {request.url}: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error", 
            "error": str(exc),
            "path": str(request.url)
        }
    )

# Signal handlers
def signal_handler(signum, frame):
    """Handle shutdown signals gracefully"""
    logger.info(f"Received signal {signum}, starting graceful shutdown...")
    try:
        cleanup_thread_pool()
    except Exception as e:
        logger.error(f"Error during cleanup: {e}")
    logger.info("Graceful shutdown completed")
    sys.exit(0)

signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)

# Development server
if __name__ == "__main__":
    import uvicorn
    
    print("=" * 80)
    print("🚀 ACCIDENT DETECTION API v2.3.0 - CUSTOM CORS")
    print("=" * 80)
    print(f"📍 Server URL: http://{HOST}:{PORT}")
    print(f"📍 Production URL: https://accident-prediction-1-mpm0.onrender.com")
    print(f"🌐 CORS Origins: {cors_origins}")
    print("🔧 Custom CORS Middleware: ENABLED")
    print("=" * 80)
    
    uvicorn.run(
        app, 
        host=HOST, 
        port=PORT,
        log_level="info",
        access_log=True
    )
