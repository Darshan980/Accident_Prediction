# utils/snapshots.py
import cv2
import uuid
import logging
from datetime import datetime
from pathlib import Path
from typing import Tuple, Optional
import numpy as np

from config.settings import SNAPSHOTS_DIR

logger = logging.getLogger(__name__)

def ensure_snapshots_directory():
    """Ensure snapshots directory exists"""
    try:
        SNAPSHOTS_DIR.mkdir(exist_ok=True)
        return True
    except Exception as e:
        logger.error(f"Failed to create snapshots directory: {str(e)}")
        return False

def save_snapshot(frame: np.ndarray, detection_data: dict) -> Tuple[Optional[str], Optional[str]]:
    """Save accident detection snapshot"""
    try:
        if not ensure_snapshots_directory():
            return None, None
            
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        frame_id = detection_data.get('frame_id', 'unknown')
        confidence = detection_data.get('confidence', 0.0)
        
        filename = f"accident_{timestamp}_{frame_id}_{confidence:.2f}_{uuid.uuid4().hex[:8]}.jpg"
        filepath = SNAPSHOTS_DIR / filename
        
        # Save the image
        success = cv2.imwrite(str(filepath), frame)
        
        if success:
            url_path = f"/snapshots/{filename}"
            logger.info(f"Snapshot saved: {filename}")
            return filename, url_path
        else:
            logger.error("Failed to save snapshot - cv2.imwrite returned False")
            return None, None
            
    except Exception as e:
        logger.error(f"Failed to save snapshot: {str(e)}")
        return None, None

def get_snapshot_path(filename: str) -> Optional[Path]:
    """Get full path to a snapshot file"""
    try:
        filepath = SNAPSHOTS_DIR / filename
        if filepath.exists():
            return filepath
        return None
    except Exception as e:
        logger.error(f"Error getting snapshot path: {str(e)}")
        return None

def delete_snapshot(filename: str) -> bool:
    """Delete a snapshot file"""
    try:
        filepath = SNAPSHOTS_DIR / filename
        if filepath.exists():
            filepath.unlink()
            logger.info(f"Deleted snapshot: {filename}")
            return True
        return False
    except Exception as e:
        logger.error(f"Failed to delete snapshot: {str(e)}")
        return False

def list_snapshots() -> list:
    """List all snapshot files"""
    try:
        if not SNAPSHOTS_DIR.exists():
            return []
        
        snapshots = []
        for file in SNAPSHOTS_DIR.glob("*.jpg"):
            snapshots.append({
                "filename": file.name,
                "path": str(file),
                "size": file.stat().st_size,
                "created": datetime.fromtimestamp(file.stat().st_ctime)
            })
        
        return sorted(snapshots, key=lambda x: x["created"], reverse=True)
    except Exception as e:
        logger.error(f"Error listing snapshots: {str(e)}")
        return []

def cleanup_old_snapshots(days: int = 30) -> int:
    """Clean up snapshots older than specified days"""
    try:
        if not SNAPSHOTS_DIR.exists():
            return 0
            
        cutoff_time = datetime.now().timestamp() - (days * 24 * 60 * 60)
        deleted_count = 0
        
        for file in SNAPSHOTS_DIR.glob("*.jpg"):
            if file.stat().st_ctime < cutoff_time:
                try:
                    file.unlink()
                    deleted_count += 1
                except Exception as e:
                    logger.error(f"Failed to delete old snapshot {file.name}: {str(e)}")
        
        logger.info(f"Cleaned up {deleted_count} old snapshots")
        return deleted_count
    except Exception as e:
        logger.error(f"Error during snapshot cleanup: {str(e)}")
        return 0
