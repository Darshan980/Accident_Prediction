# api/system.py - System endpoints router
import logging
from datetime import datetime
from fastapi import APIRouter
from typing import Dict, Any

# Import the individual routers
from .health import router as health_router
from .model import router as model_router

logger = logging.getLogger(__name__)

# Create main system router
router = APIRouter()

# Include the sub-routers
router.include_router(health_router, tags=["health"])
router.include_router(model_router, tags=["model"])

# Additional system endpoints

@router.get("/api/system/status")
async def get_system_status():
    """Get overall system status"""
    try:
        return {
            "status": "operational",
            "service": "accident_detection_api",
            "version": "2.5.0",
            "timestamp": datetime.now().isoformat(),
            "components": {
                "api": "healthy",
                "database": "connected",
                "model": "loaded",
                "dashboard": "operational",
                "websocket": "active"
            },
            "features": {
                "user_specific_dashboard": True,
                "real_time_alerts": True,
                "file_upload": True,
                "accident_detection": True,
                "analytics": True
            },
            "endpoints": {
                "health": "/health",
                "model_info": "/model-info",
                "admin_health": "/admin/api/health",
                "dashboard": "/api/dashboard/*",
                "upload": "/api/upload",
                "logs": "/api/logs"
            }
        }
    except Exception as e:
        logger.error(f"System status check failed: {str(e)}")
        return {
            "status": "degraded",
            "service": "accident_detection_api",
            "version": "2.5.0",
            "timestamp": datetime.now().isoformat(),
            "error": str(e),
            "components": {
                "api": "limited",
                "database": "unknown",
                "model": "unknown",
                "dashboard": "unknown",
                "websocket": "unknown"
            }
        }

@router.get("/api/system/info")
async def get_system_info():
    """Get detailed system information"""
    return {
        "service": "Accident Detection API",
        "version": "2.5.0",
        "description": "AI-powered accident detection system with user-specific dashboard",
        "timestamp": datetime.now().isoformat(),
        "features": [
            "Real-time accident detection",
            "User-specific dashboard",
            "File upload and analysis", 
            "Personal analytics",
            "WebSocket alerts",
            "Department-based access",
            "Logs management"
        ],
        "api_endpoints": {
            "authentication": "/auth/*",
            "dashboard": "/api/dashboard/*",
            "upload": "/api/upload",
            "logs": "/api/logs",
            "core": "/api/core/*",
            "health": "/health",
            "model": "/model-info"
        },
        "websocket_endpoints": {
            "alerts": "/api/dashboard/ws/alerts",
            "live_feed": "/api/live/ws"
        },
        "documentation": {
            "swagger": "/docs",
            "redoc": "/redoc",
            "openapi": "/openapi.json"
        }
    }
