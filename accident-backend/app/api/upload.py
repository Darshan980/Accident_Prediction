# api/upload.py - FULLY UPDATED with Admin Support
import time
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Union

from config.settings import ALLOWED_FILE_TYPES, MAX_FILE_SIZE
from models.database import get_db, User, Admin
from auth.dependencies import get_current_user_or_admin  # CHANGED: Use combined dependency
from services.analysis import analyze_frame_with_logging, get_model_info
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

def get_user_info(current_user: Union[User, Admin]):
    """Extract user information from User or Admin object"""
    if hasattr(current_user, 'admin_id'):  # It's an Admin
        return {
            'id': current_user.admin_id,
            'username': current_user.username,
            'is_admin': True,
            'user_type': 'admin'
        }
    else:  # It's a User
        return {
            'id': current_user.id,
            'username': current_user.username,
            'is_admin': getattr(current_user, 'is_admin', False),
            'user_type': 'user'
        }

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...), 
    current_user: Union[User, Admin] = Depends(get_current_user_or_admin),  # CHANGED: Accept both
    db: Session = Depends(get_db)
):
    """Upload and analyze a file - Works for both users and admins"""
    try:
        # Get user information
        user_info = get_user_info(current_user)
        is_admin_upload = user_info['is_admin']
        
        logger.info(f"File upload by {user_info['user_type']}: {user_info['username']} (ID: {user_info['id']})")
        logger.info(f"File details: {file.filename}, Size: {file.size}, Type: {file.content_type}")
        
        # Validate file type - Admin gets more types
        allowed_types = ALLOWED_FILE_TYPES.copy()
        if is_admin_upload:
            # Admin gets additional file types
            allowed_types.extend([
                'video/webm', 'image/tiff', 'image/bmp', 'video/mkv'
            ])
        
        if file.content_type not in allowed_types:
            return create_cors_response(
                {
                    "detail": f"Invalid file type for {user_info['user_type']}. Supported types: {', '.join(allowed_types)}",
                    "error": "Invalid file type"
                },
                status_code=400
            )
        
        # Validate file size - Admin gets higher limit
        max_size = 100 * 1024 * 1024 if is_admin_upload else MAX_FILE_SIZE  # 100MB for admin
        if file.size > max_size:
            return create_cors_response(
                {
                    "detail": f"File too large for {user_info['user_type']}. Maximum size is {max_size // (1024*1024)}MB.",
                    "error": "File too large"
                },
                status_code=413
            )
        
        # Read file content
        file_content = await file.read()
        
        # Analyze the file using the correct service
        result = await analyze_frame_with_logging(
            frame_bytes=file_content,
            source=f"{user_info['user_type']}_upload_{user_info['username']}",
            frame_id=f"upload_{int(time.time() * 1000)}"
        )
        
        # Log to database if accident detected
        try:
            if result.get('accident_detected', False):
                log_entry = log_accident_detection(
                    db=db,
                    detection_data=result,
                    frame=None,  # Frame will be decoded again in log_accident_detection if needed
                    source=f"{user_info['user_type']}_upload_{user_info['username']}",
                    analysis_type="file_upload"
                )
                if log_entry:
                    # Add user tracking to log entry
                    try:
                        log_entry.user_id = user_info['id']
                        log_entry.created_by = user_info['username']
                        db.commit()
                        logger.info(f"Added user tracking to log entry {log_entry.id}")
                    except Exception as e:
                        logger.warning(f"Failed to add user tracking: {e}")
                    
                    result["log_id"] = log_entry.id
                    result["snapshot_url"] = log_entry.snapshot_url
        except Exception as e:
            logger.warning(f"Database logging failed: {e}")
        
        # Add file metadata to result
        result.update({
            "filename": file.filename,
            "file_size": file.size,
            "content_type": file.content_type,
            "user_id": user_info['id'],
            "username": user_info['username'],
            "user_type": user_info['user_type'],
            "is_admin_upload": is_admin_upload,
            "upload_timestamp": time.time(),
            "analysis_type": "file_upload",
            "max_file_size_mb": max_size // (1024*1024),
            "allowed_types": len(allowed_types),
            "success": not result.get('error')
        })
        
        logger.info(f"Upload successful for {user_info['user_type']} {user_info['username']}: {file.filename}")
        return create_cors_response(result)
        
    except HTTPException as e:
        logger.error(f"HTTP Exception in upload: {e.detail}")
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
    request: Request,
    current_user: Union[User, Admin] = Depends(get_current_user_or_admin),  # CHANGED: Accept both
    db: Session = Depends(get_db)
):
    """Analyze an image from URL - Works for both users and admins"""
    try:
        # Get request body
        body = await request.json()
        url = body.get('url')
        
        if not url:
            return create_cors_response(
                {
                    "detail": "URL is required",
                    "error": "Missing URL"
                },
                status_code=400
            )
        
        import requests
        from urllib.parse import urlparse
        
        # Get user information
        user_info = get_user_info(current_user)
        is_admin_upload = user_info['is_admin']
        
        logger.info(f"URL analysis by {user_info['user_type']}: {user_info['username']} - {url}")
        
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
            
            # Admin gets more file types
            allowed_types = ALLOWED_FILE_TYPES.copy()
            if is_admin_upload:
                allowed_types.extend([
                    'video/webm', 'image/tiff', 'image/bmp', 'video/mkv'
                ])
            
            if not any(allowed_type in content_type for allowed_type in allowed_types):
                return create_cors_response(
                    {
                        "detail": f"Invalid content type for {user_info['user_type']}: {content_type}",
                        "error": "Invalid content type"
                    },
                    status_code=400
                )
            
            # Check content length - Admin gets higher limit
            max_size = 100 * 1024 * 1024 if is_admin_upload else MAX_FILE_SIZE
            content_length = int(response.headers.get('content-length', 0))
            if content_length > max_size:
                return create_cors_response(
                    {
                        "detail": f"File too large for {user_info['user_type']}: {content_length} bytes",
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
        
        # Analyze the content using the correct service
        result = await analyze_frame_with_logging(
            frame_bytes=file_content,
            source=f"url_analysis_{user_info['username']}",
            frame_id=f"url_{int(time.time() * 1000)}"
        )
        
        # Log to database if accident detected
        try:
            if result.get('accident_detected', False):
                log_entry = log_accident_detection(
                    db=db,
                    detection_data=result,
                    frame=None,
                    source=f"url_analysis_{user_info['username']}",
                    analysis_type="url_analysis"
                )
                if log_entry:
                    # Add user tracking to log entry
                    try:
                        log_entry.user_id = user_info['id']
                        log_entry.created_by = user_info['username']
                        db.commit()
                    except Exception as e:
                        logger.warning(f"Failed to add user tracking: {e}")
                    
                    result["log_id"] = log_entry.id
                    result["snapshot_url"] = log_entry.snapshot_url
        except Exception as e:
            logger.warning(f"Database logging failed: {e}")
        
        # Add metadata
        result.update({
            "source_url": url,
            "content_type": content_type,
            "content_size": len(file_content),
            "user_id": user_info['id'],
            "username": user_info['username'],
            "user_type": user_info['user_type'],
            "is_admin_upload": is_admin_upload,
            "analysis_timestamp": time.time(),
            "analysis_type": "url_analysis",
            "success": not result.get('error')
        })
        
        logger.info(f"URL analysis successful for {user_info['user_type']} {user_info['username']}")
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

@router.post("/configure")
async def configure_model(
    config: dict, 
    current_user: Union[User, Admin] = Depends(get_current_user_or_admin)  # CHANGED: Accept both
):
    """Configure model parameters (e.g., threshold) - Works for both users and admins"""
    try:
        user_info = get_user_info(current_user)
        logger.info(f"Model configuration by {user_info['user_type']}: {user_info['username']}")
        
        if "threshold" in config:
            threshold = config["threshold"]
            # Add your threshold update logic here if needed
            return create_cors_response({
                "message": f"Threshold update requested by {user_info['user_type']} {user_info['username']}: {threshold}",
                "success": True,
                "user_type": user_info['user_type'],
                "username": user_info['username'],
                "note": "Threshold update needs to be implemented in the model service"
            })
        
        return create_cors_response({
            "message": "No valid configuration provided",
            "success": False,
            "user_type": user_info['user_type'],
            "username": user_info['username']
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
async def get_model_info_endpoint():
    """Get information about the loaded model"""
    try:
        model_info = get_model_info()
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
