# app/routers/upload.py - Router for handling file uploads and accident detection
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from services.detection import analyze_image
import logging

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
        
        # Analyze for accidents
        result = await analyze_image(file_contents, file.content_type)
        
        logger.info(f"Analyzed file: {file.filename}, Result: {result}")
        
        return JSONResponse(content={
            "filename": file.filename,
            "accident_detected": result["accident_detected"],
            "confidence": result["confidence"],
            "details": result.get("details", ""),
            "processing_time": result.get("processing_time", 0)
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing file {file.filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

# Add endpoint to update model threshold
@router.post("/configure")
async def configure_model(config: dict):
    """
    Configure model parameters (e.g., threshold)
    """
    try:
        if "threshold" in config:
            threshold = config["threshold"]
            success = accident_model.update_threshold(threshold)
            if success:
                return {"message": f"Threshold updated to {threshold}", "success": True}
            else:
                raise HTTPException(status_code=400, detail="Invalid threshold value")
        
        return {"message": "No valid configuration provided", "success": False}
        
    except Exception as e:
        logger.error(f"Error configuring model: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Configuration error: {str(e)}")

@router.get("/model-info")
async def get_model_info():
    """
    Get information about the loaded model
    """
    return {
        "model_loaded": accident_model.model is not None,
        "model_path": accident_model.model_path,
        "input_size": accident_model.input_size,
        "threshold": accident_model.threshold,
        "class_names": accident_model.class_names
    }

