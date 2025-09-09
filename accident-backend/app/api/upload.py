# api/upload.py - Fixed with CORS support
import time
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from config.settings import ALLOWED_FILE_TYPES, MAX_FILE_SIZE
from models.database import get_db, User
from auth.dependencies import get_current_active_user
from services.analysis import analyze_frame_with_logging
from services.database import log_accident_detection

router = APIRouter()
logger = logging.getLogger('api')

# CORS headers for all responses
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "3600"
}

# OPTIONS handlers for preflight requests
@router.options("/upload")
@router.options("/upload/")
async def upload_options():
    """Handle preflight OPTIONS request for upload endpoint"""
    return JSONResponse(
        status_code=200,
        content={"message": "OK"},
        headers=CORS_HEADERS
    )

@router.options("/analyze-url")
@router.options("/analyze-url/")
async def analyze_url_options():
    """Handle preflight OPTIONS request for analyze-url endpoint"""
    return JSONResponse(
        status_code=200,
        content={"message": "OK"},
        headers=CORS_HEADERS
    )

def create_cors_response(content: dict, status_code: int = 200):
    """Helper function to create response with CORS headers"""
    return JSONResponse(
        status_code=status_code,
        content=content,
        headers=CORS_HEADERS
    )

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
            return create_cors_response(
                {
                    "detail": f"Invalid file type. Supported types: {', '.join(ALLOWED_FILE_TYPES)}",
                    "error": "Invalid file type"
                },
                status_code=400
            )
        
        # Validate file size
        if file.size > MAX_FILE_SIZE:
            return create_cors_response(
                {
                    "detail": f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB.",
                    "error": "File too large"
                },
                status_code=413
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
            "analysis_type": "file_upload",
            "success": True
        })
        
        return create_cors_response(result)
        
    except HTTPException as e:
        return create_cors_response(
            {
                "detail": e.detail,
                "error": "HTTP Exception"
            },
            status_code=e.status_code
        )
    except Exception as e:
        logger.error(f"Upload processing error: {str(e)}")
        return create_cors_response(
            {
                "detail": f"Upload failed: {str(e)}",
                "error": "Internal server error"
            },
            status_code=500
        )

@router.post("/analyze-url")
async def analyze_url(
    url: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Analyze an image from URL"""
    try:
        import requests
        from urllib.parse import urlparse
        
        # Validate URL
        parsed_url = urlparse(url)
        if not parsed_url.scheme or not parsed_url.netloc:
            return create_cors_response(
                {
                    "detail": "Invalid URL format",
                    "error": "Invalid URL"
                },
                status_code=400
            )
        
        # Download image
        try:
            response = requests.get(url, timeout=30, stream=True)
            response.raise_for_status()
            
            # Check content type
            content_type = response.headers.get('content-type', '')
            if not any(allowed_type in content_type for allowed_type in ALLOWED_FILE_TYPES):
                return create_cors_response(
                    {
                        "detail": f"Invalid content type: {content_type}",
                        "error": "Invalid content type"
                    },
                    status_code=400
                )
            
            # Check content length
            content_length = int(response.headers.get('content-length', 0))
            if content_length > MAX_FILE_SIZE:
                return create_cors_response(
                    {
                        "detail": f"File too large: {content_length} bytes",
                        "error": "File too large"
                    },
                    status_code=413
                )
            
            # Read content
            file_content = response.content
            
        except requests.RequestException as e:
            return create_cors_response(
                {
                    "detail": f"Failed to download image: {str(e)}",
                    "error": "Download failed"
                },
                status_code=400
            )
        
        # Analyze the content
        result = await analyze_frame_with_logging(
            frame_bytes=file_content,
            source=f"url_analysis_{current_user.username}",
            frame_id=f"url_{int(time.time() * 1000)}"
        )
        
        # Log to database if accident detected
        try:
            if result.get('accident_detected', False):
                log_entry = log_accident_detection(
                    db=db,
                    detection_data=result,
                    frame=None,
                    source=f"url_analysis_{current_user.username}",
                    analysis_type="url_analysis"
                )
                if log_entry:
                    result["log_id"] = log_entry.id
                    result["snapshot_url"] = log_entry.snapshot_url
        except Exception as e:
            logger.warning(f"Database logging failed: {e}")
        
        # Add metadata
        result.update({
            "source_url": url,
            "content_type": content_type,
            "content_size": len(file_content),
            "user_id": current_user.id,
            "username": current_user.username,
            "analysis_timestamp": time.time(),
            "analysis_type": "url_analysis",
            "success": True
        })
        
        return create_cors_response(result)
        
    except HTTPException as e:
        return create_cors_response(
            {
                "detail": e.detail,
                "error": "HTTP Exception"
            },
            status_code=e.status_code
        )
    except Exception as e:
        logger.error(f"URL analysis error: {str(e)}")
        return create_cors_response(
            {
                "detail": f"URL analysis failed: {str(e)}",
                "error": "Internal server error"
            },
            status_code=500
        )

# Additional endpoints with CORS support
@router.post("/configure")
async def configure_model(config: dict, current_user: User = Depends(get_current_active_user)):
    """Configure model parameters (e.g., threshold)"""
    try:
        if "threshold" in config:
            threshold = config["threshold"]
            # Add your threshold update logic here
            return create_cors_response({
                "message": f"Threshold updated to {threshold}",
                "success": True
            })
        
        return create_cors_response({
            "message": "No valid configuration provided",
            "success": False
        })
        
    except Exception as e:
        logger.error(f"Error configuring model: {str(e)}")
        return create_cors_response(
            {
                "detail": f"Configuration error: {str(e)}",
                "error": "Configuration failed"
            },
            status_code=500
        )

@router.get("/model-info")
async def get_model_info():
    """Get information about the loaded model"""
    try:
        # Add your model info logic here
        model_info = {
            "model_loaded": True,  # Replace with actual check
            "model_path": "models/accident_detection_model",
            "input_size": (224, 224),
            "threshold": 0.5,
            "class_names": ["no_accident", "accident"]
        }
        
        return create_cors_response(model_info)
        
    except Exception as e:
        logger.error(f"Error getting model info: {str(e)}")
        return create_cors_response(
            {
                "detail": f"Model info error: {str(e)}",
                "error": "Model info failed"
            },
            status_code=500
        )
