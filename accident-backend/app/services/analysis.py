# services/analysis.py
import cv2
import numpy as np
import time
import asyncio
import logging
from PIL import Image
import io
from typing import Dict, Optional
from concurrent.futures import ThreadPoolExecutor

from config.settings import MAX_PREDICTION_TIME, THREAD_POOL_SIZE

logger = logging.getLogger(__name__)

# Thread pool for ML operations
ml_thread_pool = ThreadPoolExecutor(max_workers=THREAD_POOL_SIZE, thread_name_prefix="ML_Worker")

# Import detection service with fallback
try:
    from services.detection import accident_model
except ImportError:
    # Fallback mock model for testing/deployment
    class MockModel:
        def __init__(self):
            self.model = None
            self.threshold = 0.5
            self.input_size = (128, 128)
            self.model_path = "mock_model"
        
        def predict(self, frame):
            import random
            return {
                "accident_detected": random.random() > 0.8,
                "confidence": random.random(),
                "predicted_class": "mock_prediction",
                "processing_time": 0.1
            }
    
    accident_model = MockModel()

def run_ml_prediction_sync(frame: np.ndarray) -> dict:
    """Run ML prediction synchronously"""
    try:
        start_time = time.time()
        
        if frame is None or frame.size == 0:
            return {
                "accident_detected": False, 
                "confidence": 0.0, 
                "predicted_class": "invalid_input", 
                "processing_time": 0.0, 
                "error": "Invalid frame"
            }
        
        if not hasattr(accident_model, 'model') or accident_model.model is None:
            return {
                "accident_detected": False, 
                "confidence": 0.0, 
                "predicted_class": "model_not_loaded", 
                "processing_time": 0.0, 
                "error": "Model not loaded"
            }
        
        # Resize frame for efficiency
        try:
            target_size = getattr(accident_model, 'input_size', (128, 128))
            if isinstance(target_size, tuple) and len(target_size) == 2:
                frame = cv2.resize(frame, target_size)
        except Exception:
            frame = cv2.resize(frame, (128, 128))
        
        result = accident_model.predict(frame)
        processing_time = time.time() - start_time
        
        if not isinstance(result, dict):
            result = {"accident_detected": False, "confidence": 0.0, "predicted_class": "unknown"}
        
        result["processing_time"] = processing_time
        return result
        
    except Exception as e:
        processing_time = time.time() - start_time if 'start_time' in locals() else 0.0
        return {
            "accident_detected": False,
            "confidence": 0.0,
            "predicted_class": "error",
            "processing_time": processing_time,
            "error": str(e)
        }

async def run_ml_prediction_async(frame: np.ndarray) -> dict:
    """Run ML prediction asynchronously with timeout"""
    loop = asyncio.get_event_loop()
    try:
        future = loop.run_in_executor(ml_thread_pool, run_ml_prediction_sync, frame)
        result = await asyncio.wait_for(future, timeout=MAX_PREDICTION_TIME)
        return result
    except asyncio.TimeoutError:
        return {
            "accident_detected": False,
            "confidence": 0.0,
            "predicted_class": "timeout",
            "processing_time": MAX_PREDICTION_TIME,
            "error": f"Prediction timed out after {MAX_PREDICTION_TIME} seconds"
        }
    except Exception as e:
        return {
            "accident_detected": False,
            "confidence": 0.0,
            "predicted_class": "error",
            "processing_time": 0.0,
            "error
