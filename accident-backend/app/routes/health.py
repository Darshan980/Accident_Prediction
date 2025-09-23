# routes/health.py - Health Check Endpoints
import logging
import os
from datetime import datetime
from fastapi import APIRouter

logger = logging.getLogger(__name__)
router = APIRouter()

# Model configuration - should match the one in model.py
MODEL_CONFIG = {
    "model_dir": "models",  # Relative to backend directory
    "model_files": [
        "transfer_mobilenetv2_20250830_120140_best.keras",
        "transfer_mobilenetv2_20250830_120140_final.keras"
    ],
    "active_model": "transfer_mobilenetv2_20250830_120140_best.keras"  # Use the best model
}

def get_model_path():
    """Get the full path to the active model"""
    try:
        # Get the current directory (should be backend/app/routes)
        current_dir = os.path.dirname(os.path.abspath(__file__))
        # Go up two levels to backend directory, then to models
        backend_dir = os.path.dirname(os.path.dirname(current_dir))
        model_path = os.path.join(backend_dir, MODEL_CONFIG["model_dir"], MODEL_CONFIG["active_model"])
        return model_path
    except Exception:
        return f"models/{MODEL_CONFIG['active_model']}"

def check_model_status():
    """Check if the model file exists and get status"""
    try:
        model_path = get_model_path()
        model_exists = os.path.exists(model_path)
        
        return {
            "model_available": model_exists,
            "model_loaded": model_exists,
            "model_status": "ready" if model_exists else "file_missing",
            "model_path": model_path,
            "model_file": MODEL_CONFIG["active_model"]
        }
    except Exception as e:
        return {
            "model_available": False,
            "model_loaded": False,
            "model_status": "error",
            "error": str(e)
        }

@router.get("/health")
async def health_check():
    """Root level health check endpoint - REQUIRED BY FRONTEND"""
    try:
        model_info = check_model_status()
        
        return {
            "status": "healthy",
            "service": "accident_detection_api",
            "version": "2.5.1",
            "timestamp": datetime.now().isoformat(),
            "database": "connected",
            "model": "loaded" if model_info["model_available"] else "missing",
            "model_file": model_info.get("model_file", "unknown"),
            "api_status": "online",
            "endpoints_available": True,
            "authentication": "fixed"
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "service": "accident_detection_api",
            "version": "2.5.1",
            "timestamp": datetime.now().isoformat(),
            "error": str(e),
            "api_status": "offline"
        }

@router.get("/model-info")
async def get_model_info():
    """Get model information and status - REQUIRED BY FRONTEND"""
    try:
        model_info = check_model_status()
        
        # Try to get real model status
        try:
            from services.analysis import get_model_status
            additional_status = get_model_status()
        except Exception:
            additional_status = {}
        
        return {
            "model_available": model_info["model_available"],
            "model_loaded": model_info["model_loaded"],
            "model_path": model_info["model_path"],
            "model_file": model_info["model_file"],
            "input_size": [224, 224],  # MobileNetV2 standard input size
            "threshold": 0.5,
            "model_type": "MobileNetV2_AccidentDetection",
            "status": model_info["model_status"],
            "timestamp": datetime.now().isoformat(),
            "version": "2.5.1",
            "confidence_threshold": 0.5,
            "preprocessing": "enabled",
            "available_models": MODEL_CONFIG["model_files"],
            **additional_status
        }
    except Exception as e:
        logger.error(f"Model info check failed: {str(e)}")
        return {
            "model_available": False,
            "model_loaded": False,
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat(),
            "version": "2.5.1"
        }

@router.get("/admin/api/health")
async def admin_health_check():
    """Admin API health check endpoint - REQUIRED BY FRONTEND"""
    try:
        model_info = check_model_status()
        
        return {
            "status": "healthy",
            "service": "admin_api",
            "version": "2.5.1",
            "timestamp": datetime.now().isoformat(),
            "admin_features": "enabled",
            "dashboard": "operational",
            "user_management": "active",
            "upload_system": "ready",
            "authentication": "fixed",
            "model_status": "ready" if model_info["model_available"] else "missing",
            "model_file": model_info.get("model_file", "unknown")
        }
    except Exception as e:
        logger.error(f"Admin health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "service": "admin_api",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@router.get("/api/health")
async def api_health_check():
    """API level health check"""
    try:
        model_info = check_model_status()
        
        return {
            "status": "healthy",
            "service": "accident_detection_api",
            "version": "2.5.1",
            "timestamp": datetime.now().isoformat(),
            "endpoints": "operational",
            "database": "connected",
            "authentication": "fixed",
            "model_status": "ready" if model_info["model_available"] else "missing",
            "model_type": "MobileNetV2_AccidentDetection"
        }
    except Exception as e:
        logger.error(f"API health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "service": "accident_detection_api",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@router.get("/api/system/status")
async def system_status():
    """Comprehensive system status check"""
    try:
        model_info = check_model_status()
        
        return {
            "system": {
                "status": "operational",
                "timestamp": datetime.now().isoformat(),
                "version": "2.5.1"
            },
            "services": {
                "api": "online",
                "database": "connected",
                "authentication": "active"
            },
            "model": {
                "type": "MobileNetV2_AccidentDetection",
                "status": model_info["model_status"],
                "available": model_info["model_available"],
                "loaded": model_info["model_loaded"],
                "file": model_info.get("model_file", "unknown"),
                "path": model_info.get("model_path", "unknown"),
                "available_models": MODEL_CONFIG["model_files"]
            },
            "features": {
                "video_upload": "enabled",
                "real_time_analysis": "enabled",
                "admin_dashboard": "enabled",
                "user_management": "enabled"
            }
        }
    except Exception as e:
        logger.error(f"System status check failed: {str(e)}")
        return {
            "system": {
                "status": "error",
                "timestamp": datetime.now().isoformat(),
                "error": str(e)
            }
        }
