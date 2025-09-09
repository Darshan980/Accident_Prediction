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
            "error": str(e)
        }

def get_model_info() -> Dict[str, any]:
    """Get information about the loaded model"""
    try:
        return {
            "model_loaded": hasattr(accident_model, 'model') and accident_model.model is not None,
            "model_path": getattr(accident_model, 'model_path', 'unknown'),
            "input_size": getattr(accident_model, 'input_size', (128, 128)),
            "threshold": getattr(accident_model, 'threshold', 0.5)
        }
    except Exception as e:
        return {
            "model_loaded": False,
            "error": str(e)
        }

async def analyze_frame_with_logging(frame: np.ndarray, metadata: Optional[Dict] = None) -> Dict:
    """
    Analyze frame with comprehensive logging and error handling.
    This is the main function used by websocket connections.
    """
    start_time = time.time()
    frame_id = metadata.get('frame_id', 'unknown') if metadata else 'unknown'
    
    logger.info(f"Starting analysis for frame {frame_id}")
    
    try:
        # Validate frame
        if frame is None or frame.size == 0:
            logger.warning(f"Invalid frame received for frame {frame_id}")
            return {
                "frame_id": frame_id,
                "accident_detected": False,
                "confidence": 0.0,
                "predicted_class": "invalid_frame",
                "processing_time": time.time() - start_time,
                "error": "Invalid or empty frame",
                "timestamp": time.time()
            }
        
        # Log frame info
        logger.debug(f"Frame {frame_id} - Shape: {frame.shape}, Type: {frame.dtype}")
        
        # Run prediction
        result = await run_ml_prediction_async(frame)
        
        # Add metadata
        result.update({
            "frame_id": frame_id,
            "timestamp": time.time(),
            "total_processing_time": time.time() - start_time
        })
        
        # Log results
        confidence = result.get('confidence', 0.0)
        accident_detected = result.get('accident_detected', False)
        
        if accident_detected:
            logger.warning(f"ACCIDENT DETECTED - Frame {frame_id}, Confidence: {confidence:.2f}")
        else:
            logger.debug(f"Frame {frame_id} - No accident detected, Confidence: {confidence:.2f}")
        
        logger.info(f"Completed analysis for frame {frame_id} in {result['total_processing_time']:.2f}s")
        
        return result
        
    except Exception as e:
        processing_time = time.time() - start_time
        logger.error(f"Error analyzing frame {frame_id}: {str(e)}")
        
        return {
            "frame_id": frame_id,
            "accident_detected": False,
            "confidence": 0.0,
            "predicted_class": "analysis_error",
            "processing_time": processing_time,
            "total_processing_time": processing_time,
            "error": str(e),
            "timestamp": time.time()
        }

def warmup_model():
    """
    Warm up the model by running a dummy prediction.
    This helps reduce cold start latency for the first real prediction.
    """
    logger.info("Warming up model...")
    try:
        # Create a dummy frame for warmup
        dummy_frame = np.zeros((128, 128, 3), dtype=np.uint8)
        
        # Run a dummy prediction
        result = run_ml_prediction_sync(dummy_frame)
        
        if result.get('error'):
            logger.warning(f"Model warmup completed with warning: {result.get('error')}")
        else:
            logger.info(f"Model warmup completed successfully in {result.get('processing_time', 0):.2f}s")
            
        return True
        
    except Exception as e:
        logger.error(f"Error during model warmup: {str(e)}")
        return False

def cleanup_thread_pool():
    """
    Cleanup the thread pool executor gracefully.
    Should be called during application shutdown.
    """
    logger.info("Shutting down ML thread pool...")
    try:
        ml_thread_pool.shutdown(wait=True)
        logger.info("ML thread pool shutdown completed")
    except Exception as e:
        logger.error(f"Error during thread pool cleanup: {str(e)}")

# Optional: Add a context manager for the thread pool
class MLThreadPoolManager:
    """Context manager for ML thread pool lifecycle"""
    
    def __enter__(self):
        logger.info("ML thread pool initialized")
        return ml_thread_pool
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        cleanup_thread_pool()
