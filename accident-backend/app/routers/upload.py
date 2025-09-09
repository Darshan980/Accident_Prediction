# app/routers/upload.py - Fixed Router for handling file uploads and accident detection
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import logging
import time

# Import from the correct services
from services.analysis import analyze_frame_with_logging, get_model_info

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Upload an image/video file for accident detection
    """
    try:
        # Validate file type
        if not file.content_type.startswith(('image/', 'video/')):
            raise HTTPException(
                status_code=400, 
                detail="Invalid file type. Please upload an image or video file."
            )
        
        # Read file contents
        file_contents = await file.read()
        
        # Analyze using the correct analysis service
        result = await analyze_frame_with_logging(
            frame_bytes=file_contents,
            source=f"upload_{file.filename}",
            frame_id=f"upload_{int(time.time() * 1000)}"
        )
        
        logger.info(f"Analyzed file: {file.filename}, Result: {result}")
        
        return JSONResponse(content={
            "filename": file.filename,
            "accident_detected": result.get("accident_detected", False),
            "confidence": result.get("confidence", 0.0),
            "predicted_class": result.get("predicted_class", "unknown"),
            "processing_time": result.get("processing_time", 0),
            "total_processing_time": result.get("total_processing_time", 0),
            "frame_id": result.get("frame_id"),
            "timestamp": result.get("timestamp"),
            "error": result.get("error"),
            "success": not result.get("error")
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing file {file.filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@router.post("/configure")
async def configure_model(config: dict):
    """
    Configure model parameters (e.g., threshold)
    """
    try:
        if "threshold" in config:
            threshold = config["threshold"]
            # Since we're using the analysis service, we need to update the model through it
            # For now, we'll just return success - you may need to implement threshold updates
            # in your actual model service
            return {
                "message": f"Threshold update requested: {threshold}", 
                "success": True,
                "note": "Threshold update needs to be implemented in the model service"
            }
        
        return {"message": "No valid configuration provided", "success": False}
        
    except Exception as e:
        logger.error(f"Error configuring model: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Configuration error: {str(e)}")

@router.get("/model-info")
async def get_model_info_endpoint():
    """
    Get information about the loaded model
    """
    try:
        model_info = get_model_info()
        return model_info
    except Exception as e:
        logger.error(f"Error getting model info: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Model info error: {str(e)}")

@router.get("/health")
async def health_check():
    """
    Health check endpoint for the upload service
    """
    try:
        from services.analysis import model_health_check
        health_status = model_health_check()
        return health_status
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }
