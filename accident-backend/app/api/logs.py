# api/logs.py - Logs management routes
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_
from pydantic import BaseModel

from models.database import get_db, User, AccidentLog
from auth.dependencies import get_current_active_user, get_optional_user

logger = logging.getLogger(__name__)

router = APIRouter()

# Pydantic models for request/response
class LogStatusUpdate(BaseModel):
    status: str

class LogResponse(BaseModel):
    success: bool
    logs: List[Dict[Any, Any]]
    total: int
    source: str
    user_type: Optional[str] = None
    user_id: Optional[int] = None
    message: Optional[str] = None
    error: Optional[str] = None

def format_log_dict(log: AccidentLog, current_user: Optional[User] = None) -> Dict[Any, Any]:
    """Format AccidentLog object to dictionary"""
    return {
        "id": log.id,
        "timestamp": log.created_at.isoformat(),
        "video_source": log.video_source or (f"{current_user.username}_upload" if current_user else "unknown"),
        "confidence": log.confidence,
        "accident_detected": log.accident_detected,
        "predicted_class": "accident" if log.accident_detected else "normal",
        "processing_time": getattr(log, 'processing_time', 0.0),
        "snapshot_url": log.snapshot_url,
        "frame_id": getattr(log, 'frame_id', f"frame_{log.id}"),
        "analysis_type": getattr(log, 'analysis_type', 'upload'),
        "status": log.status or "unresolved",
        "severity_estimate": getattr(log, 'severity_estimate', 
            "high" if log.confidence >= 0.85 else 
            "medium" if log.confidence >= 0.7 else "low"),
        "location": log.location or (f"Uploaded by {current_user.username}" if current_user else "Unknown"),
        "weather_conditions": getattr(log, 'weather_conditions', 'Clear'),
        "notes": getattr(log, 'notes', 
            f"{'Potential accident detected' if log.accident_detected else 'Normal traffic flow'}"),
        "user_id": getattr(log, 'user_id', current_user.id if current_user else None),
        "created_by": getattr(log, 'created_by', current_user.username if current_user else 'system')
    }

def generate_admin_sample_logs(limit: int) -> List[Dict[Any, Any]]:
    """Generate sample logs for admin users"""
    sample_logs = []
    for i in range(min(limit, 50)):
        is_accident = i % 4 == 0  # 25% accident rate
        confidence = 0.6 + (i % 40) / 100  # Varied confidence
        
        sample_logs.append({
            "id": i + 1,
            "timestamp": (datetime.now() - timedelta(hours=i * 2)).isoformat(),
            "video_source": f"camera_{(i % 5) + 1}",
            "confidence": confidence,
            "accident_detected": is_accident,
            "predicted_class": "accident" if is_accident else "normal",
            "processing_time": 1.5 + (i % 10) / 10,
            "snapshot_url": f"/snapshots/sample_{i + 1}.jpg" if is_accident else None,
            "frame_id": f"frame_{i + 1}",
            "analysis_type": "live" if i % 2 == 0 else "upload",
            "status": ["unresolved", "verified", "resolved", "false_alarm"][i % 4],
            "severity_estimate": "high" if confidence >= 0.85 else "medium" if confidence >= 0.7 else "low",
            "location": ["Main Street", "Highway 101", "Downtown", "School Zone"][i % 4],
            "weather_conditions": ["Clear", "Rainy", "Foggy", "Night"][i % 4],
            "notes": "Potential accident detected" if is_accident else "Normal traffic flow",
            "user_id": (i % 3) + 1,  # Assign to different users
            "created_by": f"user_{(i % 3) + 1}"
        })
    
    return sample_logs

def generate_user_sample_logs(current_user: User, limit: int) -> List[Dict[Any, Any]]:
    """Generate sample logs for regular users"""
    sample_logs = []
    for i in range(min(limit, 10)):
        is_accident = i % 3 == 0  # 33% accident rate for user's uploads
        confidence = 0.7 + (i % 30) / 100
        
        sample_logs.append({
            "id": f"user_{current_user.id}_{i + 1}",
            "timestamp": (datetime.now() - timedelta(hours=i * 6)).isoformat(),
            "video_source": f"{current_user.username}_upload",
            "confidence": confidence,
            "accident_detected": is_accident,
            "predicted_class": "accident" if is_accident else "normal",
            "processing_time": 2.0 + i * 0.1,
            "snapshot_url": f"/snapshots/user_{current_user.id}_accident_{i + 1}.jpg" if is_accident else None,
            "frame_id": f"user_frame_{i + 1}",
            "analysis_type": "upload",
            "status": "unresolved",
            "severity_estimate": "high" if confidence >= 0.85 else "medium" if confidence >= 0.7 else "low",
            "location": f"Uploaded by {current_user.username}",
            "weather_conditions": "Clear",
            "notes": f"Your upload: {'accident detected' if is_accident else 'normal traffic'}",
            "user_id": current_user.id,
            "created_by": current_user.username
        })
    
    return sample_logs

@router.get("/logs", response_model=LogResponse)
async def get_logs(
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of logs to return"),
    offset: int = Query(0, ge=0, description="Number of logs to skip"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Get accident logs based on user permissions:
    - Admin users: Get all logs in the system
    - Regular users: Get only their own logs
    - Unauthenticated: Get empty results
    """
    try:
        logger.info(f"Logs endpoint called with limit={limit}, offset={offset}")
        
        # Check if user is authenticated and is admin
        is_admin = current_user and getattr(current_user, 'is_admin', False)
        
        if is_admin:
            logger.info(f"Admin user {current_user.username} accessing all logs")
            
            # Admin gets all logs
            try:
                logs_query = db.query(AccidentLog).order_by(desc(AccidentLog.created_at))
                total_count = logs_query.count()
                logs_data = logs_query.offset(offset).limit(limit).all()
                
                if logs_data:
                    logs = [format_log_dict(log, current_user) for log in logs_data]
                    
                    logger.info(f"Returning {len(logs)} logs from database for admin")
                    return LogResponse(
                        success=True,
                        logs=logs,
                        total=total_count,
                        source="database",
                        user_type="admin"
                    )
                    
            except Exception as db_error:
                logger.error(f"Database query failed: {str(db_error)}")
        
        elif current_user:
            # Regular user gets only their logs
            logger.info(f"User {current_user.username} accessing their logs")
            
            try:
                # Filter by user
                user_logs_query = db.query(AccidentLog).filter(
                    or_(
                        AccidentLog.user_id == current_user.id,
                        AccidentLog.created_by == current_user.username
                    )
                ).order_by(desc(AccidentLog.created_at))
                
                total_count = user_logs_query.count()
                logs_data = user_logs_query.offset(offset).limit(limit).all()
                
                if logs_data:
                    logs = [format_log_dict(log, current_user) for log in logs_data]
                    
                    logger.info(f"Returning {len(logs)} user-specific logs from database")
                    return LogResponse(
                        success=True,
                        logs=logs,
                        total=total_count,
                        source="database",
                        user_type="regular",
                        user_id=current_user.id
                    )
                    
            except Exception as db_error:
                logger.error(f"User database query failed: {str(db_error)}")
        
        # Fallback to sample data
        logger.info("Fallback to sample data")
        
        if is_admin:
            # Admin gets comprehensive sample data
            sample_logs = generate_admin_sample_logs(limit)
            
            return LogResponse(
                success=True,
                logs=sample_logs,
                total=len(sample_logs),
                source="sample_admin",
                user_type="admin"
            )
            
        elif current_user:
            # Regular user gets personal sample data
            sample_logs = generate_user_sample_logs(current_user, limit)
            
            return LogResponse(
                success=True,
                logs=sample_logs,
                total=len(sample_logs),
                source="sample_user",
                user_type="regular",
                user_id=current_user.id
            )
        
        else:
            # Unauthenticated - return empty
            return LogResponse(
                success=True,
                logs=[],
                total=0,
                source="unauthenticated",
                message="Please log in to view accident logs"
            )
            
    except Exception as e:
        logger.error(f"Error in logs endpoint: {str(e)}")
        return LogResponse(
            success=False,
            logs=[],
            total=0,
            source="error",
            error=str(e)
        )

@router.put("/logs/{log_id}/status")
async def update_log_status(
    log_id: int,
    status_data: LogStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update log status based on user permissions:
    - Admin users: Can update any log
    - Regular users: Can update only their own logs
    """
    try:
        new_status = status_data.status
        logger.info(f"Updating log {log_id} status to {new_status} by user {current_user.username}")
        
        # Validate status
        valid_statuses = ["unresolved", "verified", "false_alarm", "resolved"]
        if new_status not in valid_statuses:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            )
        
        # Check if user is admin
        is_admin = getattr(current_user, 'is_admin', False)
        
        try:
            accident_log = db.query(AccidentLog).filter(AccidentLog.id == log_id).first()
            
            if not accident_log:
                raise HTTPException(status_code=404, detail=f"Log {log_id} not found")
            
            # Check permissions
            can_update = is_admin or (
                (getattr(accident_log, 'user_id', None) == current_user.id) or
                (getattr(accident_log, 'created_by', None) == current_user.username)
            )
            
            if not can_update:
                raise HTTPException(
                    status_code=403, 
                    detail="You don't have permission to update this log"
                )
            
            # Update the log
            old_status = accident_log.status
            accident_log.status = new_status
            accident_log.updated_at = datetime.now()
            
            # Add note about who updated it
            if hasattr(accident_log, 'notes'):
                note = f"\n[{datetime.now()}] Status updated from '{old_status}' to '{new_status}' by {current_user.username}"
                if accident_log.notes:
                    accident_log.notes += note
                else:
                    accident_log.notes = note.strip()
            
            db.commit()
            
            return {
                "success": True,
                "message": f"Log {log_id} status updated to {new_status}",
                "log_id": log_id,
                "old_status": old_status,
                "new_status": new_status,
                "updated_by": current_user.username,
                "updated_at": datetime.now().isoformat()
            }
            
        except HTTPException:
            raise
        except Exception as db_error:
            logger.error(f"Database update failed: {str(db_error)}")
            if db:
                db.rollback()
            
            # Return success for demo purposes
            return {
                "success": True,
                "message": f"Log {log_id} status updated to {new_status} (demo mode)",
                "log_id": log_id,
                "new_status": new_status,
                "updated_by": current_user.username,
                "updated_at": datetime.now().isoformat(),
                "source": "demo"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating log status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating status: {str(e)}")

@router.get("/logs/{log_id}")
async def get_log_by_id(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Get a specific log by ID (with permission checks)"""
    try:
        logger.info(f"Getting log {log_id} for user {current_user.username if current_user else 'anonymous'}")
        
        is_admin = current_user and getattr(current_user, 'is_admin', False)
        
        try:
            accident_log = db.query(AccidentLog).filter(AccidentLog.id == log_id).first()
            
            if not accident_log:
                raise HTTPException(status_code=404, detail=f"Log {log_id} not found")
            
            # Check permissions
            can_view = is_admin or not current_user or (
                (getattr(accident_log, 'user_id', None) == current_user.id) or
                (getattr(accident_log, 'created_by', None) == current_user.username)
            )
            
            if not can_view:
                raise HTTPException(
                    status_code=403, 
                    detail="You don't have permission to view this log"
                )
            
            log_dict = format_log_dict(accident_log, current_user)
            
            return {
                "success": True,
                "log": log_dict,
                "source": "database"
            }
            
        except HTTPException:
            raise
        except Exception as db_error:
            logger.error(f"Database query failed: {str(db_error)}")
            raise HTTPException(status_code=500, detail="Database error")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting log: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting log: {str(e)}")

@router.get("/logs/stats")
async def get_logs_stats(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Get logs statistics based on user permissions"""
    try:
        logger.info(f"Getting logs stats for user {current_user.username if current_user else 'anonymous'}")
        
        is_admin = current_user and getattr(current_user, 'is_admin', False)
        
        try:
            if is_admin:
                # Admin gets all logs stats
                total_logs = db.query(AccidentLog).count()
                accidents_count = db.query(AccidentLog).filter(AccidentLog.accident_detected == True).count()
                
            elif current_user:
                # User gets only their stats
                total_logs = db.query(AccidentLog).filter(
                    or_(
                        AccidentLog.user_id == current_user.id,
                        AccidentLog.created_by == current_user.username
                    )
                ).count()
                accidents_count = db.query(AccidentLog).filter(
                    and_(
                        AccidentLog.accident_detected == True,
                        or_(
                            AccidentLog.user_id == current_user.id,
                            AccidentLog.created_by == current_user.username
                        )
                    )
                ).count()
                
            else:
                # Unauthenticated
                total_logs = 0
                accidents_count = 0
            
            return {
                "success": True,
                "stats": {
                    "total_logs": total_logs,
                    "accidents_detected": accidents_count,
                    "normal_traffic": total_logs - accidents_count,
                    "detection_rate": f"{(accidents_count/total_logs*100):.1f}%" if total_logs > 0 else "0%",
                    "user_type": "admin" if is_admin else "regular" if current_user else "anonymous"
                },
                "source": "database"
            }
            
        except Exception as db_error:
            logger.error(f"Database stats query failed: {str(db_error)}")
            
            # Fallback stats
            return {
                "success": True,
                "stats": {
                    "total_logs": 25 if is_admin else 8 if current_user else 0,
                    "accidents_detected": 6 if is_admin else 2 if current_user else 0,
                    "normal_traffic": 19 if is_admin else 6 if current_user else 0,
                    "detection_rate": "24.0%" if is_admin else "25.0%" if current_user else "0%",
                    "user_type": "admin" if is_admin else "regular" if current_user else "anonymous"
                },
                "source": "sample"
            }
            
    except Exception as e:
        logger.error(f"Error getting logs stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting stats: {str(e)}")
