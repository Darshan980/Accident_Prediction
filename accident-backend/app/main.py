# main.py - Simplified FastAPI Application
import os
import sys
import signal
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

# Import configuration
from config.settings import get_cors_origins, SNAPSHOTS_DIR

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
    """Application lifespan manager"""
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
        finally:
            db.close()
        
        # Pre-warm ML model
        warmup_result = await warmup_model()
        logger.info(f"Model initialization: {warmup_result.get('status', 'unknown')}")
        
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
    cleanup_thread_pool()
    logger.info("Shutdown complete")

# Create FastAPI app
app = FastAPI(
    title="Render-Optimized Accident Detection API",
    description="AI-powered accident detection system optimized for Render deployment",
    version="2.3.0",
    lifespan=lifespan
)

# CORS Configuration
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

# Mount static files for snapshots
try:
    app.mount("/snapshots", StaticFiles(directory="snapshots"), name="snapshots")
    logger.info("Snapshots static files mounted")
except Exception as e:
    logger.warning(f"Could not mount snapshots directory: {str(e)}")

# Include routers
app.include_router(core_router, prefix="/api")
app.include_router(auth_router, prefix="/auth")  
app.include_router(upload_router, prefix="/api")

# WebSocket endpoint
app.websocket("/api/live/ws")(websocket_endpoint)

# Error handlers
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

# Signal handlers for graceful shutdown
def signal_handler(signum, frame):
    """Handle shutdown signals gracefully"""
    logger.info(f"Received signal {signum}, starting graceful shutdown...")
    cleanup_thread_pool()
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
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=int(os.getenv("PORT", 8000)),
        log_level="info",
        access_log=True
    )
