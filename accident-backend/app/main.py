# main.py - Simplified Main Application Entry Point
import os
import sys
import signal
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.trustedhost import TrustedHostMiddleware

# Import configuration
from config.settings import SNAPSHOTS_DIR, PORT, HOST, get_cors_origins

# Import database setup
from models.database import create_tables, SessionLocal
from auth.handlers import create_default_super_admin

# Import services
from services.analysis import warmup_model, cleanup_thread_pool

# Import middleware
from middleware.cors import CustomCORSMiddleware

# Import routers
from routes.health import router as health_router
from routes.dashboard import router as dashboard_router
from routes.debug import router as debug_router
from auth.routes import router as auth_router
from api.core import router as core_router
from api.upload import router as upload_router
from api.logs import router as logs_router
from api.websocket import websocket_endpoint

# Import error handlers
from handlers.exceptions import setup_exception_handlers

# Setup logging
from utils.logging import setup_logging

# Initialize logging
logger_dict = setup_logging()
logger = logging.getLogger(__name__)

# Import lifespan and signal handlers
from handlers.lifecycle import lifespan, signal_handler

# Create FastAPI app
app = FastAPI(
    title="Accident Detection API - Fixed Authentication",
    description="AI-powered accident detection system with proper admin/user authentication",
    version="2.5.1",
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

# Include routers
app.include_router(health_router, tags=["health"])
app.include_router(dashboard_router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(debug_router, prefix="/debug", tags=["debug"])
app.include_router(auth_router, prefix="/auth", tags=["authentication"])
app.include_router(core_router, prefix="/api", tags=["core"])
app.include_router(upload_router, prefix="/api", tags=["upload"])
app.include_router(logs_router, prefix="/api", tags=["logs"])

# WebSocket endpoints
app.websocket("/api/live/ws")(websocket_endpoint)

# Setup error handlers
setup_exception_handlers(app)

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Accident Detection API with Fixed Authentication",
        "version": "2.5.1",
        "status": "operational",
        "dashboard_status": "user_specific_enabled",
        "cors": "custom_middleware_enabled",
        "authentication": "fixed",
        "docs": "/docs",
        "health": "/health",
        "debug": "/debug/auth-status",
        "dashboard_endpoints": {
            "user_alerts": "/api/dashboard/user/alerts",
            "user_stats": "/api/dashboard/user/stats",
            "user_profile": "/api/dashboard/user/profile",
            "websocket": "/api/dashboard/ws/alerts",
            "health": "/api/dashboard/health"
        },
        "api_endpoints": {
            "logs": "/api/logs",
            "logs_stats": "/api/logs/stats",
            "upload": "/api/upload",
            "analyze_url": "/api/analyze-url",
            "core": "/api/*"
        },
        "system_endpoints": {
            "health": "/health",
            "model_info": "/model-info",
            "admin_health": "/admin/api/health",
            "api_health": "/api/health"
        },
        "features": [
            "fixed_authentication",
            "admin_and_user_support",
            "user_specific_filtering",
            "personal_analytics", 
            "real_time_user_alerts",
            "department_based_access",
            "logs_management",
            "file_upload_analysis",
            "health_monitoring",
            "model_status_tracking"
        ]
    }

# Signal handlers
signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)

# Development server
if __name__ == "__main__":
    import uvicorn
    
    print("=" * 80)
    print("🚀 ACCIDENT DETECTION API v2.5.1 - FIXED AUTHENTICATION")
    print("=" * 80)
    print(f"📍 Server URL: http://{HOST}:{PORT}")
    print(f"📍 API Docs: http://{HOST}:{PORT}/docs")
    print(f"🔧 Debug Auth: http://{HOST}:{PORT}/debug/auth-status")
    print("🔧 Authentication: FIXED for admin/user tokens")
    print("📋 Main Dashboard Endpoints:")
    print("   - /api/dashboard/user/alerts (user-specific)")
    print("   - /api/dashboard/user/stats (user-specific)")
    print("   - /api/dashboard/user/profile")
    print("   - /api/dashboard/ws/alerts (user WebSocket)")
    print("   - /api/dashboard/health")
    print("📊 API Endpoints:")
    print("   - /api/upload (FIXED - works for admin & user)")
    print("   - /api/analyze-url (FIXED - works for admin & user)")
    print("   - /api/logs (logs management)")
    print("   - /api/core (core API functions)")
    print("🔧 System Endpoints:")
    print("   - /health (MAIN HEALTH CHECK)")
    print("   - /model-info (MODEL STATUS)")
    print("   - /admin/api/health (ADMIN HEALTH)")
    print("   - /api/health (API HEALTH)")
    print("🔒 Authentication: FIXED - supports both admin and user tokens")
    print("📊 Features: Fixed auth, admin & user support, personal analytics")
    print("=" * 80)
    
    uvicorn.run(
        app, 
        host=HOST, 
        port=PORT,
        log_level="info",
        access_log=True
    )
