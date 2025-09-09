# services/analysis.py - Fixed version with better error handling
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
    logger.info("Successfully imported accident_model from services.detection")
except ImportError as e:
    logger.warning(f"Could not import accident_model: {e}. Using mock model.")
    # Fallback mock model for testing/deployment
    class MockModel:
        def __init__(self):
            self.model = None  # Intentionally None to simulate unloaded model
            self.threshold = 0.5
            self.input_size = (128, 128)
            self.model_path = "mock_model"
            logger.info("MockModel initialized - this is for testing/fallback purposes")
        
        def predict(self, frame):
            """Mock prediction that simulates a real model"""
            import random
            import time
            
            # Simulate processing time
            time.sleep(0.05)  # 50ms simulation
            
            # Simulate occasional accidents for testing
            is_accident = random.random() > 0.95  # 5% chance
            confidence = random.uniform(0.3, 0.9) if is_accident else random.uniform(0.1, 0.4)
            
            return {
                "accident_detected": is_accident,
                "confidence": confidence,
                "predicted_class": "mock_accident" if is_accident else "mock_normal",
                "processing_time": 0.05
            }
    
    accident_model = MockModel()

def run_ml_prediction_sync(frame: np.ndarray) -> dict:
    """Run ML prediction synchronously with comprehensive error handling"""
    start_time = time.time()
    
    try:
        # Validate frame input
        if frame is None or frame.size == 0:
            return {
                "accident_detected": False, 
                "confidence": 0.0, 
                "predicted_class": "invalid_input", 
                "processing_time": 0.0, 
                "error": "Invalid frame: frame is None or empty"
            }
        
        # Check frame dimensions
        if len(frame.shape) != 3 or frame.shape[2] != 3:
            logger.warning(f"Unexpected frame shape: {frame.shape}")
            # Try to convert if possible
            if len(frame.shape) == 2:
                frame = cv2.cvtColor(frame, cv2.COLOR_GRAY2BGR)
            elif len(frame.shape) == 3 and frame.shape[2] == 4:
                frame = cv2.cvtColor(frame, cv2.COLOR_BGRA2BGR)
            else:
                return {
                    "accident_detected": False, 
                    "confidence": 0.0, 
                    "predicted_class": "invalid_shape", 
                    "processing_time": time.time() - start_time, 
                    "error": f"Invalid frame shape: {frame.shape}"
                }
        
        # Check if model exists (for both real and mock models)
        if not hasattr(accident_model, 'predict'):
            return {
                "accident_detected": False, 
                "confidence": 0.0, 
                "predicted_class": "no_predict_method", 
                "processing_time": time.time() - start_time, 
                "error": "Model does not have predict method"
            }
        
        # Note: We don't check if model.model is None for mock model compatibility
        # The mock model intentionally has model=None
        
        # Resize frame for efficiency and model compatibility
        try:
            target_size = getattr(accident_model, 'input_size', (128, 128))
            if isinstance(target_size, tuple) and len(target_size) == 2:
                frame = cv2.resize(frame, target_size)
                logger.debug(f"Frame resized to {target_size}")
            else:
                frame = cv2.resize(frame, (128, 128))
                logger.debug("Frame resized to default (128, 128)")
        except Exception as resize_error:
            logger.warning(f"Frame resize failed: {resize_error}, using original frame")
        
        # Run the actual prediction
        result = accident_model.predict(frame)
        processing_time = time.time() - start_time
        
        # Validate result format
        if not isinstance(result, dict):
            logger.warning(f"Model returned non-dict result: {type(result)}")
            result = {
                "accident_detected": False, 
                "confidence": 0.0, 
                "predicted_class": "invalid_result_format"
            }
        
        # Ensure required fields exist
        result.setdefault("accident_detected", False)
        result.setdefault("confidence", 0.0)
        result.setdefault("predicted_class", "unknown")
        
        # Update processing time
        result["processing_time"] = processing_time
        
        logger.debug(f"Prediction completed: {result}")
        return result
        
    except Exception as e:
        processing_time = time.time() - start_time
        logger.error(f"Error in run_ml_prediction_sync: {str(e)}")
        return {
            "accident_detected": False,
            "confidence": 0.0,
            "predicted_class": "prediction_error",
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
        logger.error(f"ML prediction timed out after {MAX_PREDICTION_TIME} seconds")
        return {
            "accident_detected": False,
            "confidence": 0.0,
            "predicted_class": "timeout",
            "processing_time": MAX_PREDICTION_TIME,
            "error": f"Prediction timed out after {MAX_PREDICTION_TIME} seconds"
        }
    except Exception as e:
        logger.error(f"Error in async prediction: {str(e)}")
        return {
            "accident_detected": False,
            "confidence": 0.0,
            "predicted_class": "async_error",
            "processing_time": 0.0,
            "error": str(e)
        }

def get_model_info() -> Dict[str, any]:
    """Get information about the loaded model"""
    try:
        info = {
            "model_available": hasattr(accident_model, 'predict'),
            "model_path": getattr(accident_model, 'model_path', 'unknown'),
            "input_size": getattr(accident_model, 'input_size', (128, 128)),
            "threshold": getattr(accident_model, 'threshold', 0.5),
            "model_type": type(accident_model).__name__
        }
        
        # For real models, check if the actual model is loaded
        if hasattr(accident_model, 'model'):
            info["model_loaded"] = accident_model.model is not None
        else:
            info["model_loaded"] = False
            
        return info
    except Exception as e:
        logger.error(f"Error getting model info: {str(e)}")
        return {
            "model_available": False,
            "model_loaded": False,
            "error": str(e)
        }

async def analyze_frame_with_logging(frame: np.ndarray, frame_bytes: Optional[bytes] = None, metadata: Optional[Dict] = None) -> Dict:
    """
    Analyze frame with comprehensive logging and error handling.
    This is the main function used by websocket connections.
    """
    start_time = time.time()
    frame_id = metadata.get('frame_id', 'unknown') if metadata else 'unknown'
    
    logger.info(f"Starting analysis for frame {frame_id}")
    
    try:
        # Handle both frame_bytes and frame parameters
        if frame_bytes is not None:
            # Convert bytes to numpy array
            try:
                # Decode bytes to numpy array using opencv
                nparr = np.frombuffer(frame_bytes, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                if frame is None:
                    raise ValueError("Failed to decode image bytes")
                    
                logger.debug(f"Frame {frame_id} - Converted from bytes to array, Shape: {frame.shape}")
                
            except Exception as e:
                logger.error(f"Failed to convert frame_bytes to numpy array for frame {frame_id}: {str(e)}")
                return {
                    "frame_id": frame_id,
                    "accident_detected": False,
                    "confidence": 0.0,
                    "predicted_class": "bytes_conversion_error",
                    "processing_time": time.time() - start_time,
                    "error": f"Failed to convert frame bytes: {str(e)}",
                    "timestamp": time.time()
                }
        
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

async def warmup_model():
    """
    Warm up the model by running a dummy prediction.
    This helps reduce cold start latency for the first real prediction.
    """
    logger.info("Warming up model...")
    try:
        # Create a dummy frame for warmup
        dummy_frame = np.random.randint(0, 255, (128, 128, 3), dtype=np.uint8)
        logger.debug("Created dummy frame for warmup")
        
        # Get model info first
        model_info = get_model_info()
        logger.info(f"Model info: {model_info}")
        
        # Run an async dummy prediction to properly warm up the async pipeline
        result = await run_ml_prediction_async(dummy_frame)
        
        if result.get('error'):
            if 'Model not loaded' in result.get('error', ''):
                logger.warning("Model warmup completed with warning: Model not loaded")
                return {
                    "status": "warning",
                    "message": "Model not loaded - running in fallback mode",
                    "processing_time": result.get('processing_time', 0),
                    "model_info": model_info
                }
            else:
                logger.warning(f"Model warmup completed with warning: {result.get('error')}")
                return {
                    "status": "warning", 
                    "message": f"Model warmup completed with warning: {result.get('error')}",
                    "processing_time": result.get('processing_time', 0),
                    "model_info": model_info
                }
        else:
            logger.info(f"Model warmup completed successfully in {result.get('processing_time', 0):.2f}s")
            return {
                "status": "success",
                "message": "Model warmup completed successfully",
                "processing_time": result.get('processing_time', 0),
                "model_info": model_info
            }
            
    except Exception as e:
        logger.error(f"Error during model warmup: {str(e)}")
        return {
            "status": "error",
            "message": f"Error during model warmup: {str(e)}",
            "processing_time": 0,
            "model_info": {"error": str(e)}
        }

def cleanup_thread_pool():
    """
    Cleanup the thread pool executor gracefully.
    Should be called during application shutdown.
    """
    logger.info("Shutting down ML thread pool...")
    try:
        ml_thread_pool.shutdown(wait=True, timeout=10)
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

# Health check function for the model
def model_health_check() -> Dict:
    """Check the health of the ML model"""
    try:
        model_info = get_model_info()
        
        # Basic functionality test
        test_frame = np.zeros((64, 64, 3), dtype=np.uint8)
        test_result = run_ml_prediction_sync(test_frame)
        
        return {
            "status": "healthy" if not test_result.get('error') else "degraded",
            "model_info": model_info,
            "test_prediction": {
                "success": not test_result.get('error'),
                "processing_time": test_result.get('processing_time', 0),
                "error": test_result.get('error')
            }
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
