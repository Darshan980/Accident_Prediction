# services/detection.py - AI logic with fixed video handling
import cv2
import numpy as np
from PIL import Image
import io
import asyncio
import time
import tempfile
import os
from typing import Dict, Any
import logging
import tensorflow as tf
from pathlib import Path

logger = logging.getLogger(__name__)

class AccidentDetectionModel:
    """
    Wrapper for the MobileNetV2 accident detection model
    """
    def __init__(self):
        self.model = None
        self.model_path = None
        self.input_size = (128, 128)  # Your model's input size
        self.threshold = 0.5  # Confidence threshold for accident detection
        self.class_names = ['No Accident', 'Accident']  # Adjust based on your model
        self.load_model()
    
    def load_model(self):
        """
        Load the pre-trained MobileNetV2 accident detection model
        """
        try:
            # Define possible model paths
            model_paths = [
                "../models/transfer_mobilenetv2_20250830_120140_best.keras",  # Try best model first
                "../models/transfer_mobilenetv2_20250830_120140_final.keras",  # Fallback to final
                "models/transfer_mobilenetv2_20250830_120140_best.keras",  # In current directory
                "models/transfer_mobilenetv2_20250830_120140_final.keras"
            ]
            
            # Try to load model from available paths
            for path in model_paths:
                if os.path.exists(path):
                    logger.info(f"Loading model from: {path}")
                    self.model = tf.keras.models.load_model(path)
                    self.model_path = path
                    logger.info(f"Model loaded successfully from {path}")
                    logger.info(f"Model input shape: {self.model.input_shape}")
                    logger.info(f"Model output shape: {self.model.output_shape}")
                    break
            
            if self.model is None:
                logger.error("No model file found. Please ensure model files are in the correct location.")
                logger.info("Expected paths: " + ", ".join(model_paths))
                
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            self.model = None
    
    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """
        Preprocess image for 128x128 input model
        """
        try:
            # Convert BGR to RGB if needed
            if len(image.shape) == 3 and image.shape[2] == 3:
                # Check if it's likely BGR (OpenCV format)
                image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            else:
                image_rgb = image
            
            # Resize to model input size (128x128)
            image_resized = cv2.resize(image_rgb, self.input_size)
            
            # Convert to float32 and normalize to [0, 1]
            image_normalized = image_resized.astype(np.float32) / 255.0
            
            # Add batch dimension: (128, 128, 3) -> (1, 128, 128, 3)
            image_batch = np.expand_dims(image_normalized, axis=0)
            
            return image_batch
            
        except Exception as e:
            logger.error(f"Error preprocessing image: {str(e)}")
            raise
    
    def predict(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Make accident detection prediction on image
        """
        if self.model is None:
            return {
                "accident_detected": False,
                "confidence": 0.0,
                "details": "Model not loaded. Please check model file paths."
            }
        
        try:
            # Preprocess image
            processed_image = self.preprocess_image(image)
            
            # Make prediction
            predictions = self.model.predict(processed_image, verbose=0)
            
            # Handle different output formats
            if len(predictions.shape) == 2:
                # Multi-class output (e.g., [no_accident_prob, accident_prob])
                if predictions.shape[1] == 2:
                    accident_probability = predictions[0][1]  # Probability of accident class
                elif predictions.shape[1] == 1:
                    accident_probability = predictions[0][0]  # Binary output
                else:
                    # Take max probability as accident confidence
                    accident_probability = np.max(predictions[0])
            else:
                # Single output
                accident_probability = predictions[0]
            
            # Convert to float for JSON serialization
            confidence = float(accident_probability)
            accident_detected = confidence > self.threshold
            
            # Determine predicted class
            if len(predictions.shape) == 2 and predictions.shape[1] == 2:
                predicted_class_idx = np.argmax(predictions[0])
                predicted_class = self.class_names[predicted_class_idx]
            else:
                predicted_class = "Accident" if accident_detected else "No Accident"
            
            return {
                "accident_detected": accident_detected,
                "confidence": confidence,
                "details": f"Predicted: {predicted_class} (confidence: {confidence:.3f})",
                "predicted_class": predicted_class,
                "threshold": self.threshold
            }
                
        except Exception as e:
            logger.error(f"Prediction error: {str(e)}")
            return {
                "accident_detected": False,
                "confidence": 0.0,
                "details": f"Prediction error: {str(e)}",
                "predicted_class": "Error"
            }
    
    def update_threshold(self, new_threshold: float):
        """
        Update the confidence threshold for accident detection
        """
        if 0.0 <= new_threshold <= 1.0:
            self.threshold = new_threshold
            logger.info(f"Threshold updated to: {new_threshold}")
            return True
        else:
            logger.warning(f"Invalid threshold value: {new_threshold}. Must be between 0.0 and 1.0")
            return False

# Global model instance
accident_model = AccidentDetectionModel()

def process_video_frames(video_path: str, max_frames: int = 5) -> Dict[str, Any]:
    """
    Process multiple frames from video and return aggregated results
    """
    try:
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            return {
                "accident_detected": False,
                "confidence": 0.0,
                "details": "Could not open video file"
            }
        
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        
        # Sample frames evenly throughout the video
        frame_indices = np.linspace(0, max(frame_count - 1, 0), min(max_frames, frame_count), dtype=int)
        
        results = []
        
        for frame_idx in frame_indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = cap.read()
            
            if ret:
                result = accident_model.predict(frame)
                results.append(result)
        
        cap.release()
        
        if not results:
            return {
                "accident_detected": False,
                "confidence": 0.0,
                "details": "No frames could be processed"
            }
        
        # Aggregate results
        confidences = [r["confidence"] for r in results]
        max_confidence = max(confidences)
        avg_confidence = sum(confidences) / len(confidences)
        accident_detected = any(r["accident_detected"] for r in results)
        
        return {
            "accident_detected": accident_detected,
            "confidence": max_confidence,
            "avg_confidence": avg_confidence,
            "details": f"Analyzed {len(results)} frames. Max confidence: {max_confidence:.3f}, Avg: {avg_confidence:.3f}",
            "frames_analyzed": len(results),
            "total_frames": frame_count,
            "video_fps": fps
        }
        
    except Exception as e:
        logger.error(f"Error processing video frames: {str(e)}")
        return {
            "accident_detected": False,
            "confidence": 0.0,
            "details": f"Video processing error: {str(e)}"
        }

async def analyze_image(file_contents: bytes, content_type: str, filename: str = None) -> Dict[str, Any]:
    """
    Analyze uploaded image/video for accident detection with proper file handling
    """
    start_time = time.time()
    temp_file_path = None
    
    try:
        if content_type.startswith('image/'):
            # Process image
            image = Image.open(io.BytesIO(file_contents))
            image_np = np.array(image)
            
            # Make prediction
            result = accident_model.predict(image_np)
            
        elif content_type.startswith('video/'):
            # Create a secure temporary file
            file_extension = '.mp4'  # Default extension
            if filename:
                file_extension = Path(filename).suffix or '.mp4'
            
            # Use tempfile for cross-platform compatibility
            with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
                temp_file.write(file_contents)
                temp_file_path = temp_file.name
            
            logger.info(f"Temporary video file created: {temp_file_path}")
            
            # Verify file exists and has content
            if not os.path.exists(temp_file_path):
                raise FileNotFoundError(f"Temporary file was not created: {temp_file_path}")
            
            if os.path.getsize(temp_file_path) == 0:
                raise ValueError("Temporary file is empty")
            
            # Process video frames
            result = process_video_frames(temp_file_path)
            
        else:
            raise ValueError(f"Unsupported content type: {content_type}")
        
        processing_time = time.time() - start_time
        result["processing_time"] = processing_time
        
        return result
        
    except Exception as e:
        logger.error(f"Error analyzing file: {str(e)}")
        return {
            "accident_detected": False,
            "confidence": 0.0,
            "details": f"Analysis error: {str(e)}",
            "processing_time": time.time() - start_time
        }
    
    finally:
        # Clean up temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
                logger.info(f"Temporary file cleaned up: {temp_file_path}")
            except Exception as e:
                logger.warning(f"Could not clean up temporary file {temp_file_path}: {e}")

async def analyze_frame(frame_bytes: bytes) -> Dict[str, Any]:
    """
    Analyze a single frame from live stream
    """
    start_time = time.time()
    
    try:
        # Decode frame
        nparr = np.frombuffer(frame_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            raise ValueError("Could not decode frame data")
        
        # Make prediction
        result = accident_model.predict(frame)
        result["processing_time"] = time.time() - start_time
        
        return result
        
    except Exception as e:
        logger.error(f"Error analyzing frame: {str(e)}")
        return {
            "accident_detected": False,
            "confidence": 0.0,
            "details": f"Frame analysis error: {str(e)}",
            "processing_time": time.time() - start_time
        }

class LiveStreamProcessor:
    """
    Handle live stream processing with buffering and optimization
    """
    def __init__(self):
        self.frame_buffer = []
        self.max_buffer_size = 5
        self.last_prediction_time = 0
        self.prediction_interval = 0.1  # 100ms between predictions
        self.recent_results = []
        self.max_results_history = 10
    
    def should_process_frame(self) -> bool:
        """
        Determine if we should process this frame (to avoid overloading)
        """
        current_time = time.time()
        if current_time - self.last_prediction_time > self.prediction_interval:
            self.last_prediction_time = current_time
            return True
        return False
    
    def add_result(self, result: Dict[str, Any]):
        """
        Add result to history for trend analysis
        """
        self.recent_results.append({
            "timestamp": time.time(),
            "result": result
        })
        
        # Keep only recent results
        if len(self.recent_results) > self.max_results_history:
            self.recent_results.pop(0)
    
    def get_trend_analysis(self) -> Dict[str, Any]:
        """
        Analyze recent detection trends
        """
        if not self.recent_results:
            return {"trend": "no_data", "confidence_avg": 0.0}
        
        recent_confidences = [r["result"]["confidence"] for r in self.recent_results[-5:]]
        recent_detections = [r["result"]["accident_detected"] for r in self.recent_results[-5:]]
        
        avg_confidence = sum(recent_confidences) / len(recent_confidences)
        detection_rate = sum(recent_detections) / len(recent_detections)
        
        if detection_rate > 0.6:
            trend = "high_risk"
        elif detection_rate > 0.2:
            trend = "moderate_risk"
        else:
            trend = "low_risk"
        
        return {
            "trend": trend,
            "confidence_avg": avg_confidence,
            "detection_rate": detection_rate,
            "samples": len(self.recent_results)
        }