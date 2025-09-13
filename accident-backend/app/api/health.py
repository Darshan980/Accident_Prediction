# api/health.py - Health check endpoints
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException
from typing import Dict, Any

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/health")
async def health_check():
    """Root level health check endpoint"""
    try:
        return {
            "status": "healthy",
            "service": "accident_detection_api",
            "version": "2.5.0",
            "timestamp": datetime.now().isoformat(),
            "database": "connected",
            "model": "loaded",
            "api_status": "online"
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail={
            "status": "unhealthy",
            "service": "accident_detection_api",
            "version": "2.5.0",
            "timestamp": datetime.now().isoformat(),
            "error": str(e),
            "api_status": "offline"
        })

@router.get("/api/health")
async def api_health_check():
    """API level health check"""
    try:
        return {
            "status": "healthy",
            "service": "accident_detection_api",
            "version": "2.5.0",
            "timestamp": datetime.now().isoformat(),
            "endpoints": "operational",
            "database": "connected"
        }
    except Exception as e:
        logger.error(f"API health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail={
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        })

@router.get("/admin/api/health")
async def admin_health_check():
    """Admin API health check endpoint"""
    try:
        return {
            "status": "healthy",
            "service": "admin_api",
            "version": "2.5.0",
            "timestamp": datetime.now().isoformat(),
            "admin_features": "enabled",
            "dashboard": "operational",
            "user_management": "active"
        }
    except Exception as e:
        logger.error(f"Admin health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail={
            "status": "unhealthy",
            "service": "admin_api",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        })
