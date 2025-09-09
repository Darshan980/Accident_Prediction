# services/database.py
import logging
from datetime import datetime
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from sqlalchemy import and_

from models.database import AccidentLog
from utils.snapshots import save_snapshot

logger = logging.getLogger(__name__)

def log_accident_detection(
    db: Session, 
    detection_data: dict, 
    frame = None, 
    source: str = "unknown", 
    analysis_type: str = "unknown"
) -> Optional[AccidentLog]:
    """Log accident detection to database"""
    try:
        snapshot_filename = None
        snapshot_url = None
        
        # Save snapshot if frame is provided and accident detected
        if frame is not None and detection_data.get('accident_detected', False):
            snapshot_filename, snapshot_url = save_snapshot(frame, detection_data)
        
        confidence = detection_data.get('confidence', 0.0)
        severity = 'high' if confidence >= 0.9 else 'medium' if confidence >= 0.7 else 'low'
        
        log_entry = AccidentLog(
            video_source=source,
            confidence=confidence,
            accident_detected=detection_data.get('accident_detected', False),
            predicted_class=detection_data.get('predicted_class', 'unknown'),
            processing_time=detection_data.get('processing_time', 0.0),
            snapshot_filename=snapshot_filename,
            snapshot_url=snapshot_url,
            frame_id=str(detection_data.get('frame_id', '')),
            analysis_type=analysis_type,
            severity_estimate=severity,
            location=detection_data.get('location', 'Unknown'),
            weather_conditions=detection_data.get('weather_conditions', 'Unknown')
        )
        
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry
    except Exception as e:
        logger.error(f"Failed to log detection: {str(e)}")
        try:
            db.rollback()
        except:
            pass
        return None

def get_logs(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    accident_only: bool = False,
    status: Optional[str] = None,
    source: Optional[str] = None
) -> List[Dict]:
    """Get accident logs with filtering"""
    try:
        query = db.query(AccidentLog)
        
        if accident_only:
            query = query.filter(AccidentLog.accident_detected == True)
        
        if status:
            query = query.filter(AccidentLog.status == status)
            
        if source:
            query = query.filter(AccidentLog.video_source.like(f"%{source}%"))
        
        logs = query.order_by(AccidentLog.timestamp.desc()).offset(skip).limit(limit).all()
        
        result = []
        for log in logs:
            result.append({
                "id": log.id,
                "timestamp": log.timestamp.isoformat(),
                "video_source": log.video_source,
                "confidence": log.confidence,
                "accident_detected": log.accident_detected,
                "predicted_class": log.predicted_class,
                "processing_time": log.processing_time,
                "analysis_type": log.analysis_type,
                "status": log.status,
                "severity_estimate": log.severity_estimate,
                "location": log.location,
                "snapshot_url": log.snapshot_url,
                "created_at": log.created_at.isoformat() if log.created_at else None
            })
        
        return result
        
    except Exception as e:
        logger.error(f"Error fetching logs: {str(e)}")
        return []

def get_dashboard_stats(db: Session) -> Dict:
    """Get dashboard statistics"""
    try:
        total_logs = db.query(AccidentLog).count()
        accidents_detected = db.query(AccidentLog).filter(AccidentLog.accident_detected == True).count()
        
        return {
            "total_logs": total_logs,
            "accidents_detected": accidents_detected,
            "accuracy_rate": round((accidents_detected / total_logs * 100) if total_logs > 0 else 0, 1),
            "recent_logs": total_logs  # Could add time-based filtering
        }
    except Exception as e:
        logger.error(f"Error getting dashboard stats: {str(e)}")
        return {
            "total_logs": 0,
            "accidents_detected": 0,
            "accuracy_rate": 0,
            "recent_logs": 0,
            "error": str(e)
        }

def update_log_status(db: Session, log_id: int, status: str, notes: Optional[str] = None) -> bool:
    """Update log status"""
    try:
        log_entry = db.query(AccidentLog).filter(AccidentLog.id == log_id).first()
        if log_entry:
            log_entry.status = status
            if notes:
                log_entry.notes = notes
            log_entry.updated_at = datetime.now()
            db.commit()
            return True
        return False
    except Exception as e:
        logger.error(f"Error updating log status: {str(e)}")
        try:
            db.rollback()
        except:
            pass
        return False

def delete_log(db: Session, log_id: int) -> bool:
    """Delete a log entry"""
    try:
        log_entry = db.query(AccidentLog).filter(AccidentLog.id == log_id).first()
        if log_entry:
            db.delete(log_entry)
            db.commit()
            return True
        return False
    except Exception as e:
        logger.error(f"Error deleting log: {str(e)}")
        try:
            db.rollback()
        except:
            pass
        return False

def get_log_by_id(db: Session, log_id: int) -> Optional[Dict]:
    """Get a specific log entry by ID"""
    try:
        log = db.query(AccidentLog).filter(AccidentLog.id == log_id).first()
        if log:
            return {
                "id": log.id,
                "timestamp": log.timestamp.isoformat(),
                "video_source": log.video_source,
                "confidence": log.confidence,
                "accident_detected": log.accident_detected,
                "predicted_class": log.predicted_class,
                "processing_time": log.processing_time,
                "analysis_type": log.analysis_type,
                "status": log.status,
                "severity_estimate": log.severity_estimate,
                "location": log.location,
                "weather_conditions": log.weather_conditions,
                "snapshot_url": log.snapshot_url,
                "snapshot_filename": log.snapshot_filename,
                "notes": log.notes,
                "user_feedback": log.user_feedback,
                "created_at": log.created_at.isoformat() if log.created_at else None,
                "updated_at": log.updated_at.isoformat() if log.updated_at else None
            }
        return None
    except Exception as e:
        logger.error(f"Error getting log by ID: {str(e)}")
        return None
