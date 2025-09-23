# services/detection.py - Accident Detection Service
import cv2
import numpy as np
import logging
from typing import Dict, Optional
import os
from pathlib import Path

# Import TensorFlow for model loading
try:
    import tensorflow as tf
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False
    logging.warning("TensorFlow not available. Using fallback detection only.")

logger = logging.getLogger(__name__)

class AccidentDetectionModel:
    """
    Accident Detection Model Class
    This loads and uses the trained MobileNetV2 models for accident detection
    """
    
    def __init__(self, model_path: Optional[str] = None):
        self.model = None
        self.model_path = self._get_model_path(model_path)
        self.threshold = 0.5
        self.input_size = (224, 224)  # MobileNetV2 typically uses 224x224
        self.is_loaded = False
        
        # Try to load the model
        self._load_model()
    
    def _get_model_path(self, custom_path: Optional[str] = None) -> str:
        """Get the correct model path based on file structure"""
        if custom_path and os.path.exists(custom_path):
            return custom_path
        
        # Get the directory where this detection.py file is located
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Define possible model paths relative to the detection service location
        possible_paths = [
            # Assuming detection.py is in backend/app/service/
            # Navigate to backend/model/
            os.path.join(current_dir, "..", "..", "..", "models", "transfer_mobilenetv2_20250830_120140_best.keras"),
            os.path.join(current_dir, "..", "..", "..", "models", "transfer_mobilenetv2_20250830_120140_final.keras"),
            
            # Alternative paths in case of different structure
            os.path.join(current_dir, "..", "..", "models", "transfer_mobilenetv2_20250830_120140_best.keras"),
            os.path.join(current_dir, "..", "models", "transfer_mobilenetv2_20250830_120140_best.keras"),
            
            # From project root
            os.path.join("backend", "models", "transfer_mobilenetv2_20250830_120140_best.keras"),
            os.path.join("models", "transfer_mobilenetv2_20250830_120140_best.keras"),
            
            # Current working directory approaches
            os.path.join(os.getcwd(), "backend", "models", "transfer_mobilenetv2_20250830_120140_best.keras"),
            os.path.join(os.getcwd(), "models", "transfer_mobilenetv2_20250830_120140_best.keras"),
        ]
        
        # Find the first existing model
        for path in possible_paths:
            if os.path.exists(path):
                logger.info(f"Found model at: {path}")
                return path
        
        # If no model found, return the most likely path
        default_path = os.path.join(current_dir, "..", "..", "..", "models", "transfer_mobilenetv2_20250830_120140_best.keras")
        logger.warning(f"No model found. Using default path: {default_path}")
        return default_path
    
    def _load_model(self):
        """Load the ML model"""
        try:
            if not TF_AVAILABLE:
                logger.warning("TensorFlow not available. Using fallback detection.")
                self._setup_fallback_detection()
                return
            
            # Check if model file exists
            model_file_path = Path(self.model_path)
            
            if model_file_path.exists():
                logger.info(f"Loading model from {self.model_path}")
                
                # Load TensorFlow/Keras model
                self.model = tf.keras.models.load_model(self.model_path)
                self.is_loaded = True
                logger.info("Model loaded successfully")
                
                # Log model information
                if hasattr(self.model, 'input_shape'):
                    input_shape = self.model.input_shape
                    if len(input_shape) >= 3:
                        self.input_size = (input_shape[1], input_shape[2])
                    logger.info(f"Model input shape: {input_shape}")
                
            else:
                logger.warning(f"Model file not found at {self.model_path}")
                logger.info("Using fallback detection method")
                self._setup_fallback_detection()
                
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            logger.info("Using fallback detection method")
            self._setup_fallback_detection()
    
    def _setup_fallback_detection(self):
        """Setup fallback detection using OpenCV methods"""
        try:
            # Initialize background subtractor for motion detection
            self.background_subtractor = cv2.createBackgroundSubtractorMOG2(
                detectShadows=True,
                varThreshold=50,
                history=500
            )
            self.model = "opencv_fallback"
            self.is_loaded = True
            logger.info("Fallback detection method initialized")
            
        except Exception as e:
            logger.error(f"Error setting up fallback detection: {str(e)}")
            self.model = None
            self.is_loaded = False
    
    def _preprocess_frame(self, frame: np.ndarray) -> np.ndarray:
        """Preprocess frame for MobileNetV2 model"""
        try:
            # Resize to model input size
            processed_frame = cv2.resize(frame, self.input_size)
            
            # Convert BGR to RGB (OpenCV uses BGR, TensorFlow expects RGB)
            processed_frame = cv2.cvtColor(processed_frame, cv2.COLOR_BGR2RGB)
            
            # Normalize to [0, 1]
            processed_frame = processed_frame.astype(np.float32) / 255.0
            
            # Add batch dimension
            processed_frame = np.expand_dims(processed_frame, axis=0)
            
            return processed_frame
            
        except Exception as e:
            logger.error(f"Error in preprocessing: {str(e)}")
            raise
    
    def _detect_with_opencv_fallback(self, frame: np.ndarray) -> Dict:
        """
        Fallback detection using OpenCV computer vision techniques
        This is a simplified approach that detects motion and sudden changes
        """
        try:
            # Apply background subtraction
            fg_mask = self.background_subtractor.apply(frame)
            
            # Calculate motion intensity
            motion_pixels = cv2.countNonZero(fg_mask)
            total_pixels = frame.shape[0] * frame.shape[1]
            motion_ratio = motion_pixels / total_pixels
            
            # Simple heuristics for accident detection
            # This is very basic - replace with actual ML model
            accident_detected = False
            confidence = 0.0
            
            if motion_ratio > 0.3:  # High motion
                accident_detected = True
                confidence = min(motion_ratio * 2, 0.9)
            elif motion_ratio > 0.1:  # Medium motion
                confidence = motion_ratio
                accident_detected = confidence > 0.5
            
            return {
                "accident_detected": accident_detected,
                "confidence": float(confidence),
                "predicted_class": "opencv_motion_detection",
                "motion_ratio": float(motion_ratio),
                "detection_method": "opencv_fallback"
            }
            
        except Exception as e:
            logger.error(f"Error in OpenCV fallback detection: {str(e)}")
            return {
                "accident_detected": False,
                "confidence": 0.0,
                "predicted_class": "opencv_error",
                "error": str(e),
                "detection_method": "opencv_fallback"
            }
    
    def _detect_with_ml_model(self, frame: np.ndarray) -> Dict:
        """
        Detection using the trained MobileNetV2 model
        """
        try:
            # Preprocess frame for model
            processed_frame = self._preprocess_frame(frame)
            
            # Model inference
            predictions = self.model.predict(processed_frame, verbose=0)
            
            # Handle different output formats
            if len(predictions.shape) == 2:  # Binary classification
                if predictions.shape[1] == 2:  # Two classes (accident, no_accident)
                    accident_prob = float(predictions[0][1])  # Probability of accident class
                    confidence = accident_prob
                else:  # Single output
                    confidence = float(predictions[0][0])
            else:  # Single value output
                confidence = float(predictions[0])
            
            # Ensure confidence is between 0 and 1
            confidence = max(0.0, min(1.0, confidence))
            
            # Determine if accident detected based on threshold
            accident_detected = confidence > self.threshold
            
            # Determine predicted class
            if accident_detected:
                predicted_class = "accident"
            else:
                predicted_class = "normal"
            
            return {
                "accident_detected": accident_detected,
                "confidence": confidence,
                "predicted_class": predicted_class,
                "detection_method": "mobilenetv2_model",
                "raw_prediction": predictions.tolist()
            }
            
        except Exception as e:
            logger.error(f"Error in ML model detection: {str(e)}")
            return {
                "accident_detected": False,
                "confidence": 0.0,
                "predicted_class": "ml_model_error",
                "error": str(e),
                "detection_method": "mobilenetv2_model"
            }
    
    def predict(self, frame: np.ndarray) -> Dict:
        """
        Main prediction method
        """
        start_time = cv2.getTickCount()
        
        try:
            if not self.is_loaded or self.model is None:
                return {
                    "accident_detected": False,
                    "confidence": 0.0,
                    "predicted_class": "model_not_loaded",
                    "error": "Model not loaded",
                    "processing_time": 0.0,
                    "detection_method": "error"
                }
            
            # Validate input frame
            if frame is None or frame.size == 0:
                return {
                    "accident_detected": False,
                    "confidence": 0.0,
                    "predicted_class": "invalid_frame",
                    "error": "Invalid input frame",
                    "processing_time": 0.0,
                    "detection_method": "error"
                }
            
            # Choose detection method based on model type
            if self.model == "opencv_fallback":
                result = self._detect_with_opencv_fallback(frame)
            else:
                result = self._detect_with_ml_model(frame)
            
            # Calculate processing time
            end_time = cv2.getTickCount()
            processing_time = (end_time - start_time) / cv2.getTickFrequency()
            result["processing_time"] = processing_time
            
            return result
            
        except Exception as e:
            end_time = cv2.getTickCount()
            processing_time = (end_time - start_time) / cv2.getTickFrequency()
            
            logger.error(f"Error in prediction: {str(e)}")
            return {
                "accident_detected": False,
                "confidence": 0.0,
                "predicted_class": "prediction_error",
                "error": str(e),
                "processing_time": processing_time,
                "detection_method": "error"
            }
    
    def set_threshold(self, threshold: float):
        """Set detection threshold"""
        if 0.0 <= threshold <= 1.0:
            self.threshold = threshold
            logger.info(f"Detection threshold updated to {threshold}")
        else:
            logger.warning(f"Invalid threshold value: {threshold}. Must be between 0 and 1.")
    
    def get_model_info(self) -> Dict:
        """Get information about the current model"""
        info = {
            "model_path": self.model_path,
            "is_loaded": self.is_loaded,
            "input_size": self.input_size,
            "threshold": self.threshold,
            "tensorflow_available": TF_AVAILABLE
        }
        
        if self.model and self.model != "opencv_fallback":
            try:
                info.update({
                    "model_type": "MobileNetV2",
                    "detection_method": "mobilenetv2_model",
                    "model_summary": str(self.model.summary) if hasattr(self.model, 'summary') else "N/A"
                })
            except:
                info.update({
                    "model_type": type(self.model).__name__,
                    "detection_method": "mobilenetv2_model"
                })
        elif self.model == "opencv_fallback":
            info.update({
                "model_type": "OpenCV_Fallback",
                "detection_method": "opencv_fallback"
            })
        else:
            info.update({
                "model_type": "None",
                "detection_method": "none"
            })
        
        return info

# Initialize the model instance
try:
    accident_model = AccidentDetectionModel()
    logger.info(f"Accident detection model initialized: {accident_model.get_model_info()}")
    
except Exception as e:
    logger.error(f"Failed to initialize accident detection model: {str(e)}")
    
    # Create a minimal fallback model
    class MinimalFallbackModel:
        def __init__(self):
            self.model = None
            self.threshold = 0.5
            self.input_size = (224, 224)
            self.model_path = "fallback_model"
            self.is_loaded = False
        
        def predict(self, frame):
            import random
            return {
                "accident_detected": random.random() > 0.9,  # 10% chance for testing
                "confidence": random.uniform(0.1, 0.8),
                "predicted_class": "fallback_minimal",
                "processing_time": 0.01,
                "detection_method": "minimal_fallback"
            }
        
        def set_threshold(self, threshold):
            if 0.0 <= threshold <= 1.0:
                self.threshold = threshold
        
        def get_model_info(self):
            return {
                "model_path": self.model_path,
                "is_loaded": self.is_loaded,
                "model_type": "MinimalFallbackModel",
                "input_size": self.input_size,
                "threshold": self.threshold,
                "detection_method": "minimal_fallback",
                "tensorflow_available": TF_AVAILABLE
            }
    
    accident_model = MinimalFallbackModel()
    logger.warning("Using minimal fallback model due to initialization failure")

# Export the model instance
__all__ = ['accident_model', 'AccidentDetectionModel']
