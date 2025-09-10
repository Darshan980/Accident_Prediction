# services/analysis.py - Real-time analysis with database integration
import cv2
import numpy as np
import time
import asyncio
import logging
from PIL import Image
import io
from typing import Dict, Optional
from concurrent.futures import ThreadPoolExecutor
from sqlalchemy.orm import Session
from datetime import datetime
import uuid
import os

from config.settings import MAX_PREDICTION_TIME, THREAD_POOL_SIZE
from models.database import SessionLocal, AccidentLog

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

def save_snapshot(frame: np.ndarray, frame_id: str) -> Optional[str]:
    """Save frame snapshot to disk and return the file path"""
    try:
        # Create snapshots directory if it doesn't exist
        snapshots_dir = "static/snapshots"
        os.makedirs(snapshots_dir, exist_ok=True)
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"snapshot_{frame_id}_{timestamp}.jpg"
        filepath = os.path.join(snapshots_dir, filename)
        
        # Save the frame
        success = cv2.imwrite(filepath, frame)
        
        if success:
            # Return URL path for web access
            snapshot_url = f"/static/snapshots/{filename}"
            logger.info(f"Snapshot saved: {snapshot_url}")
            return snapshot_url
        else:
            logger.error(f"Failed to save snapshot: {filepath}")
            return None
            
    except Exception as e:
        logger.error(f"Error saving snapshot: {str(e)}")
        return None

def save_to_database(
    analysis_result: dict, 
    frame_id: str, 
    source: str, 
    location: str = None,
    snapshot_url: str = None
) -> Optional[int]:
    """Save analysis result to database and return the log ID"""
    db = SessionLocal()
    try:
        # Determine severity based on confidence
        severity = None
        if analysis_result.get('accident_detected'):
            confidence = analysis_result.get('confidence', 0)
            if confidence >= 0.85:
                severity = "high"
            elif confidence >= 0.65:
                severity = "medium"
            else:
                severity = "low"
        
        # Create accident log entry
        accident_log = AccidentLog(
            timestamp=datetime.now(),
            video_source=source,
            confidence=analysis_result.get('confidence', 0.0),
            accident_detected=analysis_result.get('accident_detected', False),
            predicted_class=analysis_result.get('predicted_class', 'unknown'),
            processing_time=analysis_result.get('processing_time', 0.0),
            snapshot_url=snapshot_url,
            frame_id=frame_id,
            analysis_type=analysis_result.get('analysis_type', 'realtime'),
            status="new" if analysis_result.get('accident_detected') else "processed",
            location=location,
            severity_estimate=severity,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        db.add(accident_log)
        db.commit()
        db.refresh(accident_log)
        
        logger.info(f"Saved analysis result to database with ID: {accident_log.id}")
        
        # If it's a high-confidence accident, trigger real-time alert
        if analysis_result.get('accident_detected') and analysis_result.get('confidence', 0) >= 0.7:
            asyncio.create_task(trigger_realtime_alert(accident_log))
        
        return accident_log.id
        
    except Exception as e:
        logger.error(f"Error saving to database: {str(e)}")
        db.rollback()
        return None
    finally:
        db.close()

async def trigger_realtime_alert(accident_log: AccidentLog):
    """Trigger real-time alert through WebSocket"""
    try:
        # Import here to avoid circular imports
        from api.dashboard import broadcast_real_accident
        
        # Broadcast the accident to all connected WebSocket clients
        await broadcast_real_accident(accident_log)
        
        logger.info(f"Real-time alert triggered for accident log ID: {accident_log.id}")
        
    except Exception as e:
        logger.error(f"Error triggering real-time alert: {str(e)}")

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
        
        # Check if model exists
        if not hasattr(accident_model, 'predict'):
            return {
                "accident_detected": False, 
                "confidence": 0.0, 
                "predicted_class": "no_predict_method", 
                "processing_time": time.time() - start_time, 
                "error": "Model does not have predict method"
            }
        
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

async def analyze_frame_with_logging(
    frame: np.ndarray = None, 
    frame_bytes: Optional[bytes] = None, 
    metadata: Optional[Dict] = None,
    source: str = "webcam",
    frame_number: Optional[int] = None,
    session_id: Optional[str] = None,
    location: Optional[str] = None,
    save_to_db: bool = True,
    save_snapshot_on_accident: bool = True,
    **kwargs
) -> Dict:
    """
    Analyze frame with comprehensive logging, database storage, and real-time alerts.
    This is the main function used by websocket connections.
    """
    start_time = time.time()
    
    # Extract additional parameters from kwargs if not provided directly
    if frame_number is None:
        frame_number = kwargs.get('frame_number')
    if session_id is None:
        session_id = kwargs.get('session_id')
    if source == "webcam" and 'source' in kwargs:
        source = kwargs['source']
    if location is None:
        location = kwargs.get('location')
    
    # Generate unique frame ID
    if metadata and 'frame_id' in metadata:
        frame_id = metadata['frame_id']
    elif frame_number is not None:
        frame_id = f"{source}_{session_id or 'unknown'}_{frame_number}"
    else:
        frame_id = f"{source}_{session_id or 'unknown'}_{uuid.uuid4().hex[:8]}"
    
    logger.info(f"Starting analysis for frame {frame_id} from source: {source}")
    
    try:
        # Handle both frame_bytes and frame parameters
        if frame_bytes is not None:
            try:
                # Decode bytes to numpy array using opencv
                nparr = np.frombuffer(frame_bytes, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                if frame is None:
                    raise ValueError("Failed to decode image bytes")
                    
                logger.debug(f"Frame {frame_id} - Converted from bytes to array, Shape: {frame.shape}")
                
            except Exception as e:
                logger.error(f"Failed to convert frame_bytes to numpy array for frame {frame_id}: {str(e)}")
                return create_error_result(frame_id, source, frame_number, session_id, 
                                         "bytes_conversion_error", f"Failed to convert frame bytes: {str(e)}", start_time)
        
        # Validate frame
        if frame is None or frame.size == 0:
            logger.warning(f"Invalid frame received for frame {frame_id}")
            return create_error_result(frame_id, source, frame_number, session_id, 
                                     "invalid_frame", "Invalid or empty frame", start_time)
        
        # Log frame info
        logger.debug(f"Frame {frame_id} - Shape: {frame.shape}, Type: {frame.dtype}, Source: {source}")
        
        # Run prediction
        result = await run_ml_prediction_async(frame)
        
        # Save snapshot if accident detected and requested
        snapshot_url = None
        if save_snapshot_on_accident and result.get('accident_detected') and result.get('confidence', 0) >= 0.7:
            snapshot_url = save_snapshot(frame, frame_id)
            result['snapshot_url'] = snapshot_url
        
        # Add metadata to result
        result.update({
            "frame_id": frame_id,
            "source": source,
            "frame_number": frame_number,
            "session_id": session_id,
            "location": location,
            "timestamp": time.time(),
            "total_processing_time": time.time() - start_time,
            "analysis_type": "realtime_websocket"
        })
        
        # Save to database if requested
        if save_to_db:
            db_id = save_to_database(result, frame_id, source, location, snapshot_url)
            result['database_id'] = db_id
        
        # Log results
        confidence = result.get('confidence', 0.0)
        accident_detected = result.get('accident_detected', False)
        
        if accident_detected:
            logger.warning(f"ACCIDENT DETECTED - Frame {frame_id} from {source}, Confidence: {confidence:.2f}")
        else:
            logger.debug(f"Frame {frame_id} from {source} - No accident detected, Confidence: {confidence:.2f}")
        
        logger.info(f"Completed analysis for frame {frame_id} from {source} in {result['total_processing_time']:.2f}s")
        
        return result
        
    except Exception as e:
        processing_time = time.time() - start_time
        logger.error(f"Error analyzing frame {frame_id} from {source}: {str(e)}")
        
        return create_error_result(frame_id, source, frame_number, session_id, 
                                 "analysis_error", str(e), start_time)

def create_error_result(frame_id, source, frame_number, session_id, predicted_class, error, start_time):
    """Create standardized error result"""
    processing_time = time.time() - start_time
    return {
        "frame_id": frame_id,
        "source": source,
        "frame_number": frame_number,
        "session_id": session_id,
        "accident_detected": False,
        "confidence": 0.0,
        "predicted_class": predicted_class,
        "processing_time": processing_time,
        "total_processing_time": processing_time,
        "error": error,
        "timestamp": time.time()
    }

async def get_recent_analysis_stats(hours: int = 24) -> Dict:
    """Get recent analysis statistics from database"""
    db = SessionLocal()
    try:
        from datetime import datetime, timedelta
        
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        # Total analyses in period
        total_analyses = db.query(AccidentLog).filter(
            AccidentLog.created_at >= cutoff_time
        ).count()
        
        # Accident detections
        accidents_detected = db.query(AccidentLog).filter(
            AccidentLog.created_at >= cutoff_time,
            AccidentLog.accident_detected == True
        ).count()
        
        # High confidence detections
        high_confidence_accidents = db.query(AccidentLog).filter(
            AccidentLog.created_at >= cutoff_time,
            AccidentLog.accident_detected == True,
            AccidentLog.confidence >= 0.8
        ).count()
        
        # Average confidence
        from sqlalchemy import func
        avg_confidence = db.query(func.avg(AccidentLog.confidence)).filter(
            AccidentLog.created_at >= cutoff_time
        ).scalar() or 0
        
        # Average processing time
        avg_processing_time = db.query(func.avg(AccidentLog.processing_time)).filter(
            AccidentLog.created_at >= cutoff_time
        ).scalar() or 0
        
        return {
            "period_hours": hours,
            "total_analyses": total_analyses,
            "accidents_detected": accidents_detected,
            "high_confidence_accidents": high_confidence_accidents,
            "accident_rate": (accidents_detected / total_analyses * 100) if total_analyses > 0 else 0,
            "average_confidence": float(avg_confidence),
            "average_processing_time": float(avg_processing_time),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting analysis stats: {str(e)}")
        return {
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }
    finally:
        db.close()

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

async def warmup_model():
    """Warm up the model by running a dummy prediction"""
    logger.info("Warming up model...")
    try:
        # Create a dummy frame for warmup
        dummy_frame = np.random.randint(0, 255, (128, 128, 3), dtype=np.uint8)
        logger.debug("Created dummy frame for warmup")
        
        # Get model info first
        model_info = get_model_info()
        logger.info(f"Model info: {model_info}")
        
        # Run an async dummy prediction
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
    """Cleanup the thread pool executor gracefully"""
    logger.info("Shutting down ML thread pool...")
    try:
        ml_thread_pool.shutdown(wait=True, timeout=10)
        logger.info("ML thread pool shutdown completed")
    except Exception as e:
        logger.error(f"Error during thread pool cleanup: {str(e)}")

def model_health_check() -> Dict:
    """Check the health of the ML model and database connectivity"""
    try:
        model_info = get_model_info()
        
        # Basic functionality test
        test_frame = np.zeros((64, 64, 3), dtype=np.uint8)
        test_result = run_ml_prediction_sync(test_frame)
        
        # Database connectivity test
        db = SessionLocal()
        try:
            db.execute("SELECT 1")
            db_healthy = True
            db_error = None
        except Exception as e:
            db_healthy = False
            db_error = str(e)
        finally:
            db.close()
        
        return {
            "status": "healthy" if not test_result.get('error') and db_healthy else "degraded",
            "model_info": model_info,
            "test_prediction": {
                "success": not test_result.get('error'),
                "processing_time": test_result.get('processing_time', 0),
                "error": test_result.get('error')
            },
            "database": {
                "connected": db_healthy,
                "error": db_error
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

# Backward compatibility functions
def analyze_frame(frame_data, frame_number: int = None, session_id: str = None, source: str = "webcam"):
    """Synchronous wrapper for analyze_frame_with_logging for backward compatibility"""
    import asyncio
    
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(
        analyze_frame_with_logging(
            frame=frame_data,
            frame_number=frame_number,
            session_id=session_id,
            source=source
        )
    )

async def process_frame(frame, **kwargs):
    """Legacy function name - redirects to analyze_frame_with_logging"""
    return await analyze_frame_with_logging(frame=frame, **kwargs)

def process_frame_sync(frame, **kwargs):
    """Legacy synchronous function name"""
    return analyze_frame(frame, **kwargs)
