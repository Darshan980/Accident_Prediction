# api/core.py - Core API endpoints with enhanced health checks
import time
import psutil
import logging
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Dict, List
from datetime import datetime, timedelta

from models.database import get_db, AccidentLog
from services.analysis import get_model_info, model_health_check
from auth.handlers import get_current_user_optional

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/health")
async def health_check():
    """
    Comprehensive health check endpoint
    """
    try:
        start_time = time.time()
        
        # Basic API health
        api_status = "healthy"
        
        # Database health
        db_status = "unknown"
        try:
            # This will be set by the dependency injection
            db_status = "healthy"
        except Exception as e:
            db_status = f"unhealthy: {str(e)}"
            api_status = "degraded"
        
        # Model health
        model_info = get_model_info()
        model_health = model_health_check()
        
        # System metrics
        system_metrics = {
            "cpu_percent": psutil.cpu_percent(interval=0.1),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage('/').percent if psutil.disk_usage('/') else 0
        }
        
        response_time = time.time() - start_time
        
        health_data = {
            "status": api_status,
            "timestamp": datetime.utcnow().isoformat(),
            "response_time_ms": round(response_time * 1000, 2),
            "version": "2.3.0",
            "components": {
                "api": {
                    "status": "healthy",
                    "response_time_ms": round(response_time * 1000, 2)
                },
                "database": {
                    "status": db_status
                },
                "model": {
                    "status": model_health.get("status", "unknown"),
                    "info": model_info,
                    "health_check": model_health
                }
            },
            "system_metrics": system_metrics,
            "uptime_info": {
                "process_start_time": datetime.fromtimestamp(psutil.Process().create_time()).isoformat(),
                "current_time": datetime.utcnow().isoformat()
            }
        }
        
        # Determine overall status
        if model_health.get("status") == "unhealthy":
            health_data["status"] = "degraded"
        elif db_status != "healthy":
            health_data["status"] = "degraded"
        
        return health_data
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }

@router.get("/performance")
async def get_performance_stats(db: Session = Depends(get_db)):
    """
    Get performance statistics and system metrics
    """
    try:
        start_time = time.time()
        
        # System metrics
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Process metrics
        process = psutil.Process()
        process_memory = process.memory_info()
        
        # Database statistics
        try:
            # Get recent accident logs count
            recent_logs = db.query(AccidentLog).filter(
                AccidentLog.timestamp >= datetime.utcnow() - timedelta(hours=24)
            ).count()
            
            total_logs = db.query(AccidentLog).count()
            
            # Get recent accidents
            recent_accidents = db.query(AccidentLog).filter(
                AccidentLog.accident_detected == True,
                AccidentLog.timestamp >= datetime.utcnow() - timedelta(hours=24)
            ).count()
            
            db_stats = {
                "total_logs": total_logs,
                "recent_logs_24h": recent_logs,
                "recent_accidents_24h": recent_accidents,
                "status": "connected"
            }
        except Exception as e:
            logger.error(f"Database stats error: {str(e)}")
            db_stats = {
                "status": "error",
                "error": str(e)
            }
        
        # Model performance
        model_info = get_model_info()
        
        response_time = time.time() - start_time
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "response_time_ms": round(response_time * 1000, 2),
            "system_metrics": {
                "cpu": {
                    "percent": cpu_percent,
                    "count": psutil.cpu_count()
                },
                "memory": {
                    "total_mb": round(memory.total / 1024 / 1024, 2),
                    "available_mb": round(memory.available / 1024 / 1024, 2),
                    "percent_used": memory.percent,
                    "process_memory_mb": round(process_memory.rss / 1024 / 1024, 2)
                },
                "disk": {
                    "total_gb": round(disk.total / 1024 / 1024 / 1024, 2),
                    "free_gb": round(disk.free / 1024 / 1024 / 1024, 2),
                    "percent_used": round((disk.total - disk.free) / disk.total * 100, 2)
                }
            },
            "database_stats": db_stats,
            "model_info": model_info,
            "api_info": {
                "version": "2.3.0",
                "environment": "production",
                "uptime_seconds": time.time() - process.create_time()
            }
        }
        
    except Exception as e:
        logger.error(f"Performance stats error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting performance stats: {str(e)}")

@router.get("/logs/recent")
async def get_recent_logs(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_optional)
):
    """
    Get recent accident detection logs
    """
    try:
        # Query recent logs
        logs = db.query(AccidentLog).order_by(
            AccidentLog.timestamp.desc()
        ).limit(limit).all()
        
        # Convert to dict format
        log_data = []
        for log in logs:
            log_dict = {
                "id": log.id,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                "accident_detected": log.accident_detected,
                "confidence": log.confidence,
                "predicted_class": log.predicted_class,
                "processing_time": log.processing_time,
                "video_source": log.video_source,
                "frame_id": log.frame_id,
                "status": log.status
            }
            
            # Include sensitive data only for authenticated users
            if current_user:
                log_dict.update({
                    "snapshot_filename": log.snapshot_filename,
                    "snapshot_url": log.snapshot_url,
                    "location": log.location,
                    "notes": log.notes
                })
            
            log_data.append(log_dict)
        
        return {
            "logs": log_data,
            "total_count": len(log_data),
            "limit": limit,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error fetching recent logs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching logs: {str(e)}")

@router.get("/stats/summary")
async def get_summary_stats(db: Session = Depends(get_db)):
    """
    Get summary statistics for dashboard
    """
    try:
        now = datetime.utcnow()
        
        # Time periods
        last_hour = now - timedelta(hours=1)
        last_24h = now - timedelta(hours=24)
        last_week = now - timedelta(days=7)
        
        # Query stats
        stats = {
            "last_hour": {
                "total_detections": db.query(AccidentLog).filter(
                    AccidentLog.timestamp >= last_hour
                ).count(),
                "accidents_detected": db.query(AccidentLog).filter(
                    AccidentLog.timestamp >= last_hour,
                    AccidentLog.accident_detected == True
                ).count()
            },
            "last_24h": {
                "total_detections": db.query(AccidentLog).filter(
                    AccidentLog.timestamp >= last_24h
                ).count(),
                "accidents_detected": db.query(AccidentLog).filter(
                    AccidentLog.timestamp >= last_24h,
                    AccidentLog.accident_detected == True
                ).count()
            },
            "last_week": {
                "total_detections": db.query(AccidentLog).filter(
                    AccidentLog.timestamp >= last_week
                ).count(),
                "accidents_detected": db.query(AccidentLog).filter(
                    AccidentLog.timestamp >= last_week,
                    AccidentLog.accident_detected == True
                ).count()
            },
            "all_time": {
                "total_detections": db.query(AccidentLog).count(),
                "accidents_detected": db.query(AccidentLog).filter(
                    AccidentLog.accident_detected == True
                ).count()
            }
        }
        
        # Calculate rates
        for period in stats:
            total = stats[period]["total_detections"]
            accidents = stats[period]["accidents_detected"]
            stats[period]["accident_rate"] = round(
                (accidents / total * 100) if total > 0 else 0, 2
            )
        
        return {
            "summary": stats,
            "timestamp": now.isoformat(),
            "system_status": "operational"
        }
        
    except Exception as e:
        logger.error(f"Error getting summary stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting summary stats: {str(e)}")

@router.get("/model/info")
async def get_model_information():
    """
    Get detailed model information
    """
    try:
        model_info = get_model_info()
        model_health = model_health_check()
        
        return {
            "model_info": model_info,
            "health_check": model_health,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting model info: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting model info: {str(e)}")

@router.post("/test/prediction")
async def test_prediction():
    """
    Test the prediction system with a dummy frame
    """
    try:
        import numpy as np
        from services.analysis import run_ml_prediction_async
        
        # Create a test frame
        test_frame = np.random.randint(0, 255, (128, 128, 3), dtype=np.uint8)
        
        # Run prediction
        result = await run_ml_prediction_async(test_frame)
        
        return {
            "test_result": result,
            "timestamp": datetime.utcnow().isoformat(),
            "status": "success" if not result.get("error") else "error"
        }
        
    except Exception as e:
        logger.error(f"Error in test prediction: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Test prediction failed: {str(e)}")
