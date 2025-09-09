# api/upload.py
import time
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session

from config.settings import ALLOWED_FILE_TYPES, MAX_FILE_SIZE
from models.database import get_db, User
from auth.dependencies import get_current_active_user
from services.analysis import analyze_frame_with_logging
from services.database import log_accident_detection

router = APIRouter()
logger = logging.getLogger('api')

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...), 
    current_user: User = Depends(get_current_active_user), 
    db: Session = Depends(get_db)
):
    """Upload and analyze a file"""
    try:
        # Validate file type
        if file.content_type not in ALLOWED_FILE_TYPES:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid file type. Supported types: {', '.join(ALLOWED_FILE_TYPES)}"
            )
        
        # Validate file size
        if file.size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400, 
                detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB."
            )
        
        # Read file content
        file_content = await file.read()
        
        # Analyze the file
        result = await analyze_frame_with_logging(
            frame_bytes=file_content,
            source=f"user_upload_{current_user.username}",
            frame_id=f"upload_{int(time.time() * 1000)}"
        )
        
        # Log to database if accident detected
        try:
            if result.get('accident_detected', False):
                log_entry = log_accident_detection(
                    db=db,
                    detection_data=result,
                    frame=None,  # Frame will be decoded again in log_accident_detection if needed
                    source=f"user_upload_{current_user.username}",
                    analysis_type="file_upload"
                )
                if log_entry:
                    result["log_id"] = log_entry.id
                    result["snapshot_url"] = log_entry.snapshot_url
        except Exception as e:
            logger.warning(f"Database logging failed: {e}")
        
        # Add file metadata to result
        result.update({
            "filename": file.filename,
            "file_size": file.size,
            "content_type": file.content_type,
            "user_id": current_user.id,
            "username": current_user.username,
            "upload_timestamp": time.time(),
            "analysis_type": "file_upload"
        })
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.post("/analyze
