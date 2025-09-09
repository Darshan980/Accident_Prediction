# api/core.py
import time
import logging
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from models.database import get_db, User, Admin, AccidentLog
from services.database import get_logs, get_dashboard_stats
from services.analysis import get_model_info
from api.websocket import websocket_connections, live_processors
from config.settings import get_cors_origins, MAX_PREDICTION_TIME, THREAD_POOL_SIZE, WEBSOCKET_TIMEOUT, FRAME_PROCESSING_INTERVAL

router = APIRouter()
logger = logging.getLogger('api')

@router.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Render-Optimized Accident Detection API v2.3.0 is running!", 
        "version": "2.3.0",
        "features": [
            "Real-time detection", 
            "Database logging", 
            "Snapshot storage", 
            "User/Admin Auth", 
            "Performance Optimization", 
            "Render Deployment"
        ],
        "cors_status": "enabled",
        "cors_origins": get_cors_origins(),
        "active_websocket_connections": len(websocket_connections),
        "active_processors": len(live_processors),
        "model_info": get_model_info(),
        "performance_config": {
            "max_prediction_time": MAX_PREDICTION_TIME,
            "thread_pool_size": THREAD_POOL_SIZE,
            "websocket_timeout": WEBSOCKET_TIMEOUT,
            "frame_interval": FRAME_PROCESSING_INTERVAL
        }
    }

@router.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """Health check endpoint"""
    try:
        # Test database connection
        total_logs = db.query(AccidentLog).count()
        accidents_detected = db.query(AccidentLog).filter(AccidentLog.accident_detected == True).count()
        total_users = db.query(User).count()
        total_admins = db.query(Admin).count()
        
        model_info = get_model_info()
        
        health_data = {
            "status": "healthy",
            "database_status": "connected",
            "total_logs": total_logs,
            "accidents_detected": accidents_detected,
            "total_users": total_users,
            "total_admins": total_admins,
            "active_websocket_connections": len(websocket_connections),
            "active_processors": len(live_processors),
            "timestamp": time.time(),
            "cors_status": "enabled",
            "cors_origins": get_cors_origins(),
            "version": "2.3.0-render-optimized",
            "model_info": model_info,
            "performance_config": {
                "max_prediction_time": MAX_PREDICTION_TIME,
                "thread_pool_size": THREAD_POOL_SIZE,
                "websocket_timeout": WEBSOCKET_TIMEOUT,
                "frame_interval": FRAME_PROCESSING_INTERVAL
            }
        }
        
        return health_data
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "model_info": get_model_info(),
            "cors_status": "enabled",
            "active_websocket_connections": len(websocket_connections),
            "active_processors": len(live_processors),
            "version": "2.3.0-render-optimized"
        }

@router.get("/performance")
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
                "model_info": get_model_info()
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

@router.get("/dashboard/stats")
async def get_dashboard_stats_endpoint(db: Session = Depends(get_db)):
    """Get dashboard statistics"""
    try:
        stats = get_dashboard_stats(db)
        stats.update({
            "active_connections": len(websocket_connections),
            "active_processors": len(live_processors),
            "model_info": get_model_info()
        })
        return stats
        
    except Exception as e:
        logger.error(f"Dashboard stats error: {str(e)}")
        return {
            "total_logs": 0,
            "accidents_detected": 0,
            "accuracy_rate": 0,
            "active_connections": len(websocket_connections),
            "active_processors": len(live_processors),
            "model_status": "error",
            "error": str(e)
        }

@router.get("/logs")
async def get_logs_endpoint(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=500),
    accident_only: bool = Query(False),
    status: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get accident logs with filtering"""
    try:
        logs = get_logs(
            db=db,
            skip=skip,
            limit=limit,
            accident_only=accident_only,
            status=status,
            source=source
        )
        return logs
        
    except Exception as e:
        logger.error(f"Error fetching logs: {str(e)}")
        return []

@router.get("/model/info")
async def get_model_info_endpoint():
    """Get model information"""
    try:
        return get_model_info()
    except Exception as e:
        return {
            "error": str(e),
            "model_loaded": False
        }

@router.get("/system/status")
async def get_system_status(db: Session = Depends(get_db)):
    """Get comprehensive system status"""
    try:
        # Database stats
        db_stats = get_dashboard_stats(db)
        
        # Model info
        model_info = get_model_info()
        
        # Connection stats
        connection_stats = {
            "websocket_connections": len(websocket_connections),
            "active_processors": len(live_processors)
        }
        
        return {
            "status": "operational",
            "version": "2.3.0-render-optimized",
            "timestamp": time.time(),
            "database": db_stats,
            "model": model_info,
            "connections": connection_stats,
            "performance": {
                "max_prediction_time": MAX_PREDICTION_TIME,
                "thread_pool_size": THREAD_POOL_SIZE,
                "websocket_timeout": WEBSOCKET_TIMEOUT,
                "frame_interval": FRAME_PROCESSING_INTERVAL
            },
            "cors": {
                "enabled": True,
                "origins": get_cors_origins()
            }
        }
        
    except Exception as e:
        logger.error(f"System status error: {str(e)}")
        return {
            "status": "error",
            "error": str(e),
            "version": "2.3.0-render-optimized",
            "timestamp": time.time()
        }
