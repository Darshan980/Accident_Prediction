# main.py - FIXED with proper imports
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

# FIXED: Import get_cors_origins function
from config.settings import get_cors_origins, SNAPSHOTS_DIR, PORT, HOST

# Import models and database
from models.database import create_tables, SessionLocal
from auth.handlers import create_default_super_admin

# Import routers
from auth.routes import router as auth_router
from api.core import router as core_router
from api.upload import router as upload_router
from api.websocket import websocket_endpoint

# Import services
from services.analysis import warmup_model, cleanup_thread_pool

# Setup logging
from utils.logging import setup_logging

# Initialize logging
logger_dict = setup_logging()
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager with enhanced error handling"""
    # Startup
    logger.info("=" * 80)
    logger.info("STARTING RENDER-OPTIMIZED ACCIDENT DETECTION API v2.3.0")
    logger.info("=" * 80)
    
    try:
        # Create database tables
        create_tables()
        logger.info("Database tables created/verified")
        
        # Create default admin
        db = SessionLocal()
        try:
            create_default_super_admin(db)
            logger.info("Default admin user verified")
        except Exception as e:
            logger.warning(f"Admin creation issue (non-critical): {e}")
        finally:
            db.close()
        
        # Pre-warm ML model
        try:
            warmup_result = await warmup_model()
            logger.info(f"Model initialization: {warmup_result.get('status', 'unknown')}")
        except Exception as e:
            logger.error(f"Model warmup failed: {e}")
        
        # Ensure snapshots directory
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
    title="Render-Optimized Accident Detection API",
    description="AI-powered accident detection system optimized for Render deployment",
    version="2.3.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Get CORS origins AFTER importing the function
cors_origins = get_cors_origins()
logger.info(f"CORS origins configured: {cors_origins}")

# FIXED CORS Configuration - NO wildcards with credentials
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,  # Specific origins only, no wildcards
    allow_credentials=True,      # Keep this for authenticated requests
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=[
        "Accept",
        "Accept-Language",
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "X-CSRFToken",
        "X-Custom-Header",
        "Origin",
        "User-Agent",
        "DNT",
        "Cache-Control",
        "X-Mx-ReqToken",
        "Keep-Alive",
        "If-Modified-Since"
    ],
    expose_headers=[
        "Content-Length",
        "Content-Type",
        "Content-Disposition",
        "X-Total-Count",
        "X-Page-Count"
    ],
    max_age=86400  # 24 hours
)

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

# Include routers
app.include_router(core_router, prefix="/api", tags=["core"])
app.include_router(auth_router, prefix="/auth", tags=["authentication"])  
app.include_router(upload_router, prefix="/api", tags=["upload"])

# WebSocket endpoint
app.websocket("/api/live/ws")(websocket_endpoint)

# Root endpoint for health checks
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Accident Detection API is running",
        "version": "2.3.0",
        "status": "operational",
        "docs": "/docs",
        "health": "/api/health"
    }

# REMOVED: Manual OPTIONS handler - FastAPI CORS middleware handles this automatically

# FIXED error handlers - let CORS middleware handle headers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with CORS headers"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "error": "HTTP Exception"}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions with CORS headers"""
    logger.error(f"Unhandled exception on {request.url}: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error", 
            "error": str(exc),
            "path": str(request.url)
        }
    )

# Signal handlers for graceful shutdown
def signal_handler(signum, frame):
    """Handle shutdown signals gracefully"""
    logger.info(f"Received signal {signum}, starting graceful shutdown...")
    try:
        cleanup_thread_pool()
    except Exception as e:
        logger.error(f"Error during cleanup: {e}")
    logger.info("Graceful shutdown completed")
    sys.exit(0)

# Register signal handlers
signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)

# Development server
if __name__ == "__main__":
    import uvicorn
    
    print("=" * 80)
    print("🚀 RENDER-OPTIMIZED ACCIDENT DETECTION API v2.3.0 STARTING")
    print("=" * 80)
    print(f"📍 Server URL: http://{HOST}:{PORT}")
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
    
    uvicorn.run(
        app, 
        host=HOST, 
        port=PORT,
        log_level="info",
        access_log=True
    )
