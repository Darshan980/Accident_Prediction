# services/detection.py - Enhanced Accident Detection Service with Debug Logging
import cv2
import numpy as np
import logging
from typing import Dict, Optional
import os
from pathlib import Path
import sys
import glob

# Import TensorFlow for model loading
try:
    import tensorflow as tf
    TF_AVAILABLE = True
    tf_version = tf.__version__
except ImportError:
    TF_AVAILABLE = False
    tf_version = "Not Available"
    logging.warning("TensorFlow not available. Using fallback detection only.")

logger = logging.getLogger(__name__)

class AccidentDetectionModel:
    """
    Enhanced Accident Detection Model Class with comprehensive debugging
    This loads and uses the trained MobileNetV2 models for accident detection
    """
    
    def __init__(self, model_path: Optional[str] = None):
        self.model = None
        self.model_path = None
        self.threshold = 0.5
        self.input_size = (224, 224)  # MobileNetV2 typically uses 224x224
        self.is_loaded = False
        self.debug_info = {}
        
        # Enhanced debugging
        self._log_environment_info()
        
        # Try to find and load the model
        self.model_path = self._get_model_path_with_debug(model_path)
        self._load_model_with_debug()
    
    def _log_environment_info(self):
        """Log comprehensive environment information for debugging"""
        logger.info("=" * 80)
        logger.info("🔍 ACCIDENT DETECTION MODEL INITIALIZATION DEBUG")
        logger.info("=" * 80)
        
        # Python and system info
        logger.info(f"🐍 Python version: {sys.version}")
        logger.info(f"🧠 TensorFlow available: {TF_AVAILABLE}")
        if TF_AVAILABLE:
            logger.info(f"📦 TensorFlow version: {tf_version}")
        
        # Current working directory and file locations
        cwd = os.getcwd()
        logger.info(f"📂 Current working directory: {cwd}")
        
        # Detection service file location
        detection_file = os.path.abspath(__file__)
        logger.info(f"📍 Detection service file: {detection_file}")
        
        # Parent directories
        detection_dir = os.path.dirname(detection_file)
        logger.info(f"📁 Detection service directory: {detection_dir}")
        
        # Project structure analysis
        logger.info("🏗️ Project structure analysis:")
        self._analyze_project_structure(cwd)
        
        logger.info("=" * 80)
    
    def _analyze_project_structure(self, base_path: str):
        """Analyze and log project structure to understand file layout"""
        try:
            # Look for common project directories
            common_dirs = ['backend', 'models', 'services', 'app', 'src']
            found_dirs = []
            
            for item in os.listdir(base_path):
                item_path = os.path.join(base_path, item)
                if os.path.isdir(item_path) and item in common_dirs:
                    found_dirs.append(item)
                    logger.info(f"   📁 Found directory: {item}")
            
            # Look for model files in various locations
            model_patterns = [
                "**/*.keras",
                "**/*.h5",
                "**/*mobilenet*.keras",
                "**/*mobilenet*.h5",
                "**/transfer_mobilenetv2*.keras"
            ]
            
            logger.info("🔍 Searching for model files:")
            model_files_found = []
            
            for pattern in model_patterns:
                try:
                    matches = list(glob.glob(os.path.join(base_path, pattern), recursive=True))
                    for match in matches:
                        rel_path = os.path.relpath(match, base_path)
                        logger.info(f"   🎯 Found model file: {rel_path}")
                        model_files_found.append(match)
                except Exception as e:
                    logger.debug(f"   ⚠️ Error searching pattern {pattern}: {e}")
            
            self.debug_info['found_model_files'] = model_files_found
            self.debug_info['project_structure'] = found_dirs
            
        except Exception as e:
            logger.error(f"Error analyzing project structure: {e}")
    
    def _get_model_path_with_debug(self, custom_path: Optional[str] = None) -> str:
        """Enhanced model path detection with comprehensive debugging"""
        logger.info("🔍 Starting model path detection...")
        
        # If custom path provided and exists, use it
        if custom_path and os.path.exists(custom_path):
            logger.info(f"✅ Using custom model path: {custom_path}")
            return custom_path
        elif custom_path:
            logger.warning(f"⚠️ Custom path provided but doesn't exist: {custom_path}")
        
        # Get current file location for relative path calculation
        current_file = os.path.abspath(__file__)
        current_dir = os.path.dirname(current_file)
        
        logger.info(f"📍 Current detection.py location: {current_file}")
        logger.info(f"📁 Current detection.py directory: {current_dir}")
        
        # Define comprehensive list of possible model paths
        model_filenames = [
            "transfer_mobilenetv2_20250830_120140_best.keras",
            "transfer_mobilenetv2_20250830_120140_final.keras",
            "mobilenetv2_accident_model.keras",
            "accident_model.keras",
            "model.keras",
            "best_model.keras"
        ]
        
        # Define possible directory structures
        possible_base_paths = [
            # Relative to current detection service file
            current_dir,
            os.path.join(current_dir, ".."),
            os.path.join(current_dir, "..", ".."),
            os.path.join(current_dir, "..", "..", ".."),
            
            # Relative to current working directory
            os.getcwd(),
            os.path.join(os.getcwd(), "backend"),
            os.path.join(os.getcwd(), "app"),
            os.path.join(os.getcwd(), "src"),
            
            # Common model directories
            os.path.join(current_dir, "models"),
            os.path.join(current_dir, "..", "models"),
            os.path.join(current_dir, "..", "..", "models"),
            os.path.join(os.getcwd(), "models"),
            os.path.join(os.getcwd(), "backend", "models"),
            os.path.join(os.getcwd(), "app", "models"),
            os.path.join(os.getcwd(), "src", "models"),
        ]
        
        logger.info(f"🔍 Checking {len(possible_base_paths)} possible base paths...")
        
        # Check all combinations of base paths and model filenames
        checked_paths = []
        for base_path in possible_base_paths:
            for model_filename in model_filenames:
                full_path = os.path.join(base_path, model_filename)
                normalized_path = os.path.normpath(full_path)
                checked_paths.append(normalized_path)
                
                logger.debug(f"   🔍 Checking: {normalized_path}")
                
                if os.path.exists(normalized_path):
                    logger.info(f"✅ FOUND MODEL at: {normalized_path}")
                    
                    # Verify it's a valid file
                    try:
                        file_size = os.path.getsize(normalized_path)
                        logger.info(f"📊 Model file size: {file_size:,} bytes ({file_size/1024/1024:.2f} MB)")
                        
                        if file_size > 0:
                            self.debug_info['model_search_result'] = 'found'
                            self.debug_info['model_file_size'] = file_size
                            return normalized_path
                        else:
                            logger.warning(f"⚠️ Model file is empty: {normalized_path}")
                            
                    except Exception as e:
                        logger.error(f"❌ Error checking model file: {e}")
        
        # Log all checked paths for debugging
        logger.warning("❌ No model file found. Checked paths:")
        for i, path in enumerate(checked_paths, 1):
            logger.warning(f"   {i:2d}. {path}")
        
        # Use the most likely default path
        default_path = os.path.join(current_dir, "..", "..", "models", "transfer_mobilenetv2_20250830_120140_best.keras")
        normalized_default = os.path.normpath(default_path)
        
        logger.warning(f"⚠️ Using default path (may not exist): {normalized_default}")
        self.debug_info['model_search_result'] = 'not_found'
        self.debug_info['checked_paths_count'] = len(checked_paths)
        
        return normalized_default
    
    def _load_model_with_debug(self):
        """Enhanced model loading with comprehensive debugging"""
        logger.info("🔄 Starting model loading process...")
        
        try:
            if not TF_AVAILABLE:
                logger.warning("❌ TensorFlow not available. Using fallback detection.")
                self._setup_fallback_detection()
                return
            
            # Check if model file exists
            model_file_path = Path(self.model_path)
            logger.info(f"📁 Model path: {self.model_path}")
            logger.info(f"🔍 Path exists: {model_file_path.exists()}")
            
            if model_file_path.exists():
                # Get file info
                file_size = model_file_path.stat().st_size
                logger.info(f"📊 Model file size: {file_size:,} bytes ({file_size/1024/1024:.2f} MB)")
                
                # Attempt to load the model
                logger.info("🔄 Loading TensorFlow/Keras model...")
                start_time = cv2.getTickCount()
                
                try:
                    # Load with explicit error handling
                    self.model = tf.keras.models.load_model(self.model_path, compile=False)
                    
                    loading_time = (cv2.getTickCount() - start_time) / cv2.getTickFrequency()
                    logger.info(f"✅ Model loaded successfully in {loading_time:.2f} seconds")
                    
                    self.is_loaded = True
                    self._log_model_info()
                    
                except Exception as model_load_error:
                    logger.error(f"❌ Failed to load model: {model_load_error}")
                    logger.info("🔄 Attempting to load with different settings...")
                    
                    try:
                        # Try loading without compilation
                        self.model = tf.keras.models.load_model(self.model_path, compile=False)
                        loading_time = (cv2.getTickCount() - start_time) / cv2.getTickFrequency()
                        logger.info(f"✅ Model loaded (no compile) in {loading_time:.2f} seconds")
                        self.is_loaded = True
                        self._log_model_info()
                        
                    except Exception as second_attempt_error:
                        logger.error(f"❌ Second load attempt failed: {second_attempt_error}")
                        logger.info("🔄 Falling back to OpenCV detection")
                        self._setup_fallback_detection()
                        
            else:
                logger.error(f"❌ Model file not found at: {self.model_path}")
                
                # Try to suggest alternatives
                model_dir = os.path.dirname(self.model_path)
                if os.path.exists(model_dir):
                    logger.info(f"📁 Model directory exists: {model_dir}")
                    try:
                        files_in_dir = os.listdir(model_dir)
                        keras_files = [f for f in files_in_dir if f.endswith(('.keras', '.h5'))]
                        if keras_files:
                            logger.info("📋 Available model files in directory:")
                            for f in keras_files:
                                full_path = os.path.join(model_dir, f)
                                size = os.path.getsize(full_path)
                                logger.info(f"   📄 {f} ({size:,} bytes)")
                        else:
                            logger.info("📋 No .keras or .h5 files found in model directory")
                            logger.info(f"📋 Files in directory: {files_in_dir}")
                    except Exception as dir_error:
                        logger.error(f"❌ Error reading model directory: {dir_error}")
                else:
                    logger.error(f"❌ Model directory doesn't exist: {model_dir}")
                
                logger.info("🔄 Using fallback detection method")
                self._setup_fallback_detection()
                
        except Exception as e:
            logger.error(f"❌ Unexpected error during model loading: {str(e)}")
            logger.info("🔄 Using fallback detection method")
            self._setup_fallback_detection()
    
    def _log_model_info(self):
        """Log detailed model information"""
        try:
            if self.model and self.model != "opencv_fallback":
                logger.info("📊 MODEL INFORMATION:")
                
                # Input shape
                if hasattr(self.model, 'input_shape'):
                    input_shape = self.model.input_shape
                    logger.info(f"   📏 Input shape: {input_shape}")
                    
                    if len(input_shape) >= 3:
                        self.input_size = (input_shape[1], input_shape[2])
                        logger.info(f"   🎯 Updated input size to: {self.input_size}")
                
                # Output shape
                if hasattr(self.model, 'output_shape'):
                    output_shape = self.model.output_shape
                    logger.info(f"   📐 Output shape: {output_shape}")
                
                # Model layers count
                if hasattr(self.model, 'layers'):
                    layer_count = len(self.model.layers)
                    logger.info(f"   🏗️ Number of layers: {layer_count}")
                
                # Model parameters
                if hasattr(self.model, 'count_params'):
                    try:
                        param_count = self.model.count_params()
                        logger.info(f"   🔢 Parameters: {param_count:,}")
                    except:
                        logger.debug("   🔢 Could not count parameters")
                
                # Test prediction to verify model works
                logger.info("🧪 Running test prediction...")
                test_input = np.random.rand(1, *self.input_size, 3).astype(np.float32)
                try:
                    test_output = self.model.predict(test_input, verbose=0)
                    logger.info(f"   ✅ Test prediction successful, output shape: {test_output.shape}")
                    self.debug_info['test_prediction_successful'] = True
                except Exception as test_error:
                    logger.error(f"   ❌ Test prediction failed: {test_error}")
                    self.debug_info['test_prediction_successful'] = False
                    self.debug_info['test_prediction_error'] = str(test_error)
                
        except Exception as e:
            logger.error(f"Error logging model info: {e}")
    
    def _setup_fallback_detection(self):
        """Setup fallback detection using OpenCV methods"""
        try:
            logger.info("🔄 Setting up OpenCV fallback detection...")
            
            # Initialize background subtractor for motion detection
            self.background_subtractor = cv2.createBackgroundSubtractorMOG2(
                detectShadows=True,
                varThreshold=50,
                history=500
            )
            self.model = "opencv_fallback"
            self.is_loaded = True
            
            logger.info("✅ Fallback detection method initialized successfully")
            self.debug_info['detection_method'] = 'opencv_fallback'
            
        except Exception as e:
            logger.error(f"❌ Error setting up fallback detection: {str(e)}")
            self.model = None
            self.is_loaded = False
            self.debug_info['detection_method'] = 'none'
    
    def _preprocess_frame(self, frame: np.ndarray) -> np.ndarray:
        """Preprocess frame for MobileNetV2 model with enhanced debugging"""
        try:
            logger.debug(f"🔄 Preprocessing frame: input shape {frame.shape}")
            
            # Resize to model input size
            processed_frame = cv2.resize(frame, self.input_size)
            logger.debug(f"📏 Resized to: {processed_frame.shape}")
            
            # Convert BGR to RGB (OpenCV uses BGR, TensorFlow expects RGB)
            processed_frame = cv2.cvtColor(processed_frame, cv2.COLOR_BGR2RGB)
            logger.debug("🎨 Converted BGR to RGB")
            
            # Normalize to [0, 1]
            processed_frame = processed_frame.astype(np.float32) / 255.0
            logger.debug(f"📊 Normalized to [0,1]: min={processed_frame.min():.3f}, max={processed_frame.max():.3f}")
            
            # Add batch dimension
            processed_frame = np.expand_dims(processed_frame, axis=0)
            logger.debug(f"📦 Added batch dimension: final shape {processed_frame.shape}")
            
            return processed_frame
            
        except Exception as e:
            logger.error(f"❌ Error in preprocessing: {str(e)}")
            raise
    
    def _detect_with_opencv_fallback(self, frame: np.ndarray) -> Dict:
        """
        Fallback detection using OpenCV computer vision techniques
        This is a simplified approach that detects motion and sudden changes
        """
        try:
            logger.debug("🔄 Using OpenCV fallback detection")
            
            # Apply background subtraction
            fg_mask = self.background_subtractor.apply(frame)
            
            # Calculate motion intensity
            motion_pixels = cv2.countNonZero(fg_mask)
            total_pixels = frame.shape[0] * frame.shape[1]
            motion_ratio = motion_pixels / total_pixels
            
            logger.debug(f"📊 Motion analysis: {motion_pixels}/{total_pixels} pixels = {motion_ratio:.3f} ratio")
            
            # Simple heuristics for accident detection
            accident_detected = False
            confidence = 0.0
            
            if motion_ratio > 0.3:  # High motion
                accident_detected = True
                confidence = min(motion_ratio * 2, 0.9)
                logger.debug(f"🚨 High motion detected: {motion_ratio:.3f} -> confidence {confidence:.3f}")
            elif motion_ratio > 0.1:  # Medium motion
                confidence = motion_ratio
                accident_detected = confidence > 0.5
                logger.debug(f"⚠️ Medium motion detected: {motion_ratio:.3f} -> confidence {confidence:.3f}")
            else:
                logger.debug(f"✅ Low motion: {motion_ratio:.3f}")
            
            return {
                "accident_detected": accident_detected,
                "confidence": float(confidence),
                "predicted_class": "opencv_motion_detection",
                "motion_ratio": float(motion_ratio),
                "detection_method": "opencv_fallback"
            }
            
        except Exception as e:
            logger.error(f"❌ Error in OpenCV fallback detection: {str(e)}")
            return {
                "accident_detected": False,
                "confidence": 0.0,
                "predicted_class": "opencv_error",
                "error": str(e),
                "detection_method": "opencv_fallback"
            }
    
    def _detect_with_ml_model(self, frame: np.ndarray) -> Dict:
        """
        Detection using the trained MobileNetV2 model with enhanced debugging
        """
        try:
            logger.debug("🔄 Using ML model detection")
            
            # Preprocess frame for model
            processed_frame = self._preprocess_frame(frame)
            logger.debug("✅ Frame preprocessing completed")
            
            # Model inference
            logger.debug("🧠 Running model inference...")
            start_time = cv2.getTickCount()
            predictions = self.model.predict(processed_frame, verbose=0)
            inference_time = (cv2.getTickCount() - start_time) / cv2.getTickFrequency()
            
            logger.debug(f"⚡ Inference completed in {inference_time:.3f}s")
            logger.debug(f"📊 Raw predictions shape: {predictions.shape}")
            logger.debug(f"📊 Raw predictions: {predictions}")
            
            # Handle different output formats
            if len(predictions.shape) == 2:  # Binary classification
                if predictions.shape[1] == 2:  # Two classes (accident, no_accident)
                    accident_prob = float(predictions[0][1])  # Probability of accident class
                    confidence = accident_prob
                    logger.debug(f"📊 Binary classification (2 classes): accident_prob = {accident_prob:.3f}")
                else:  # Single output
                    confidence = float(predictions[0][0])
                    logger.debug(f"📊 Single output classification: confidence = {confidence:.3f}")
            else:  # Single value output
                confidence = float(predictions[0])
                logger.debug(f"📊 Single value output: confidence = {confidence:.3f}")
            
            # Ensure confidence is between 0 and 1
            confidence = max(0.0, min(1.0, confidence))
            logger.debug(f"📊 Normalized confidence: {confidence:.3f}")
            
            # Determine if accident detected based on threshold
            accident_detected = confidence > self.threshold
            logger.debug(f"🎯 Threshold check: {confidence:.3f} > {self.threshold} = {accident_detected}")
            
            # Determine predicted class
            if accident_detected:
                predicted_class = "accident"
            else:
                predicted_class = "normal"
            
            result = {
                "accident_detected": accident_detected,
                "confidence": confidence,
                "predicted_class": predicted_class,
                "detection_method": "mobilenetv2_model",
                "inference_time": inference_time,
                "raw_prediction": predictions.tolist()
            }
            
            logger.debug(f"✅ ML detection result: {result}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Error in ML model detection: {str(e)}")
            return {
                "accident_detected": False,
                "confidence": 0.0,
                "predicted_class": "ml_model_error",
                "error": str(e),
                "detection_method": "mobilenetv2_model"
            }
    
    def predict(self, frame: np.ndarray) -> Dict:
        """
        Main prediction method with enhanced debugging
        """
        start_time = cv2.getTickCount()
        logger.debug("🔄 Starting prediction...")
        
        try:
            if not self.is_loaded or self.model is None:
                logger.warning("⚠️ Model not loaded")
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
                logger.warning("⚠️ Invalid input frame")
                return {
                    "accident_detected": False,
                    "confidence": 0.0,
                    "predicted_class": "invalid_frame",
                    "error": "Invalid input frame",
                    "processing_time": 0.0,
                    "detection_method": "error"
                }
            
            logger.debug(f"📏 Input frame shape: {frame.shape}, dtype: {frame.dtype}")
            
            # Choose detection method based on model type
            if self.model == "opencv_fallback":
                logger.debug("🔄 Using OpenCV fallback method")
                result = self._detect_with_opencv_fallback(frame)
            else:
                logger.debug("🔄 Using ML model method")
                result = self._detect_with_ml_model(frame)
            
            # Calculate processing time
            end_time = cv2.getTickCount()
            processing_time = (end_time - start_time) / cv2.getTickFrequency()
            result["processing_time"] = processing_time
            
            logger.debug(f"⚡ Total processing time: {processing_time:.3f}s")
            
            if result.get("accident_detected"):
                logger.info(f"🚨 ACCIDENT DETECTED: confidence={result.get('confidence', 0):.3f}")
            else:
                logger.debug(f"✅ No accident: confidence={result.get('confidence', 0):.3f}")
            
            return result
            
        except Exception as e:
            end_time = cv2.getTickCount()
            processing_time = (end_time - start_time) / cv2.getTickFrequency()
            
            logger.error(f"❌ Error in prediction: {str(e)}")
            return {
                "accident_detected": False,
                "confidence": 0.0,
                "predicted_class": "prediction_error",
                "error": str(e),
                "processing_time": processing_time,
                "detection_method": "error"
            }
    
    def set_threshold(self, threshold: float):
        """Set detection threshold with validation"""
        if 0.0 <= threshold <= 1.0:
            old_threshold = self.threshold
            self.threshold = threshold
            logger.info(f"🎯 Detection threshold updated: {old_threshold:.3f} -> {threshold:.3f}")
        else:
            logger.warning(f"⚠️ Invalid threshold value: {threshold}. Must be between 0 and 1.")
    
    def get_model_info(self) -> Dict:
        """Get comprehensive information about the current model"""
        info = {
            "model_path": self.model_path,
            "is_loaded": self.is_loaded,
            "input_size": self.input_size,
            "threshold": self.threshold,
            "tensorflow_available": TF_AVAILABLE,
            "tensorflow_version": tf_version,
            "debug_info": self.debug_info
        }
        
        if self.model and self.model != "opencv_fallback":
            try:
                info.update({
                    "model_type": "MobileNetV2",
                    "detection_method": "mobilenetv2_model",
                    "model_loaded_successfully": True
                })
                
                if hasattr(self.model, 'input_shape'):
                    info["model_input_shape"] = self.model.input_shape
                if hasattr(self.model, 'output_shape'):
                    info["model_output_shape"] = self.model.output_shape
                if hasattr(self.model, 'layers'):
                    info["model_layers_count"] = len(self.model.layers)
                
            except Exception as e:
                info.update({
                    "model_type": type(self.model).__name__,
                    "detection_method": "mobilenetv2_model",
                    "model_info_error": str(e)
                })
        elif self.model == "opencv_fallback":
            info.update({
                "model_type": "OpenCV_Fallback",
                "detection_method": "opencv_fallback",
                "model_loaded_successfully": True
            })
        else:
            info.update({
                "model_type": "None",
                "detection_method": "none",
                "model_loaded_successfully": False
            })
        
        return info
    
    def get_debug_report(self) -> Dict:
        """Get comprehensive debug report"""
        return {
            "initialization_debug": self.debug_info,
            "model_info": self.get_model_info(),
            "environment": {
                "tensorflow_available": TF_AVAILABLE,
                "tensorflow_version": tf_version,
                "opencv_version": cv2.__version__,
                "current_working_directory": os.getcwd(),
                "detection_service_location": __file__
            }
        }

# Initialize the model instance with enhanced error handling
logger.info("🚀 Initializing Accident Detection Model...")

try:
    accident_model = AccidentDetectionModel()
    model_info = accident_model.get_model_info()
    
    logger.info("✅ Accident detection model initialization completed")
    logger.info(f"📊 Model Status: {model_info.get('detection_method', 'unknown')}")
    
    if model_info.get('is_loaded'):
        logger.info("✅ Model loaded successfully and ready for predictions")
    else:
        logger.warning("⚠️ Model initialization completed but model not loaded - using fallback")
    
except Exception as e:
    logger.error(f"❌ Failed to initialize accident detection model: {str(e)}")
    logger.info("🔄 Creating minimal fallback model...")
    
    # Create a minimal fallback model
    class MinimalFallbackModel:
        def __init__(self):
            self.model = None
            self.threshold = 0.5
            self.input_size = (224, 224)
            self.model_path = "fallback_model"
            self.is_loaded = False
            self.debug_info = {"error": "Failed to initialize main model", "fallback": True}
            
            logger.info("⚠️ MinimalFallbackModel initialized")
        
        def predict(self, frame):
            import random
            logger.debug("🎲 Using minimal fallback prediction (random)")
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
                logger.info(f"🎯 Fallback threshold updated to: {threshold}")
        
        def get_model_info(self):
            return {
                "model_path": self.model_path,
                "is_loaded": self.is_loaded,
                "model_type": "MinimalFallbackModel",
                "input_size": self.input_size,
                "threshold": self.threshold,
                "detection_method": "minimal_fallback",
                "tensorflow_available": TF_AVAILABLE,
                "tensorflow_version": tf_version,
                "debug_info": self.debug_info
            }
        
        def get_debug_report(self):
            return {
                "initialization_debug": self.debug_info,
                "model_info": self.get_model_info(),
                "environment": {
                    "tensorflow_available": TF_AVAILABLE,
                    "tensorflow_version": tf_version,
                    "opencv_version": cv2.__version__,
                    "current_working_directory": os.getcwd(),
                    "detection_service_location": __file__
                }
            }
    
    accident_model = MinimalFallbackModel()
    logger.warning("Using minimal fallback model due to initialization failure")

# Export the model instance
__all__ = ['accident_model', 'AccidentDetectionModel']

# Add debugging functions
def get_model_debug_info():
    """Get comprehensive debug information about the model"""
    try:
        if hasattr(accident_model, 'get_debug_report'):
            return accident_model.get_debug_report()
        else:
            return accident_model.get_model_info()
    except Exception as e:
        return {"error": f"Failed to get debug info: {str(e)}"}

def test_model_prediction():
    """Test the model with a dummy prediction"""
    try:
        # Create a test frame
        test_frame = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
        logger.info("Running model test prediction...")
        
        start_time = cv2.getTickCount()
        result = accident_model.predict(test_frame)
        end_time = cv2.getTickCount()
        
        processing_time = (end_time - start_time) / cv2.getTickFrequency()
        
        test_result = {
            "test_successful": not result.get('error'),
            "result": result,
            "test_processing_time": processing_time,
            "timestamp": cv2.getTickCount() / cv2.getTickFrequency()
        }
        
        logger.info(f"Model test completed: {test_result}")
        return test_result
        
    except Exception as e:
        logger.error(f"Model test failed: {str(e)}")
        return {
            "test_successful": False,
            "error": str(e),
            "timestamp": cv2.getTickCount() / cv2.getTickFrequency()
        }

def force_model_reload(model_path: str = None):
    """Force reload the model with a specific path"""
    global accident_model
    
    try:
        logger.info(f"Force reloading model with path: {model_path}")
        old_model_info = accident_model.get_model_info()
        logger.info(f"Old model info: {old_model_info}")
        
        # Create new model instance
        new_model = AccidentDetectionModel(model_path)
        new_model_info = new_model.get_model_info()
        
        logger.info(f"New model info: {new_model_info}")
        
        # Replace global model if new one loaded successfully
        if new_model.is_loaded:
            accident_model = new_model
            logger.info("Model reloaded successfully")
            return {"success": True, "old_model": old_model_info, "new_model": new_model_info}
        else:
            logger.warning("New model failed to load, keeping old model")
            return {"success": False, "error": "New model failed to load", "old_model": old_model_info, "new_model": new_model_info}
            
    except Exception as e:
        logger.error(f"Error during force model reload: {str(e)}")
        return {"success": False, "error": str(e)}

def list_available_models():
    """List all available model files in common locations"""
    try:
        # Use the same path detection logic from the model class
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        possible_base_paths = [
            current_dir,
            os.path.join(current_dir, ".."),
            os.path.join(current_dir, "..", ".."),
            os.path.join(current_dir, "..", "..", ".."),
            os.getcwd(),
            os.path.join(os.getcwd(), "backend"),
            os.path.join(os.getcwd(), "models"),
            os.path.join(current_dir, "models"),
            os.path.join(current_dir, "..", "models"),
            os.path.join(current_dir, "..", "..", "models"),
        ]
        
        model_files = []
        
        for base_path in possible_base_paths:
            if os.path.exists(base_path):
                try:
                    for root, dirs, files in os.walk(base_path):
                        for file in files:
                            if file.endswith(('.keras', '.h5')):
                                full_path = os.path.join(root, file)
                                try:
                                    size = os.path.getsize(full_path)
                                    model_files.append({
                                        "path": full_path,
                                        "filename": file,
                                        "size": size,
                                        "size_mb": round(size / 1024 / 1024, 2),
                                        "relative_path": os.path.relpath(full_path, os.getcwd())
                                    })
                                except OSError:
                                    continue
                except Exception as e:
                    logger.debug(f"Error scanning {base_path}: {e}")
                    continue
        
        # Remove duplicates and sort by size
        unique_models = []
        seen_paths = set()
        
        for model in model_files:
            abs_path = os.path.abspath(model['path'])
            if abs_path not in seen_paths:
                seen_paths.add(abs_path)
                model['absolute_path'] = abs_path
                unique_models.append(model)
        
        unique_models.sort(key=lambda x: x['size'], reverse=True)
        
        logger.info(f"Found {len(unique_models)} unique model files")
        for model in unique_models:
            logger.info(f"  - {model['filename']} ({model['size_mb']} MB) at {model['relative_path']}")
        
        return {
            "found_models": unique_models,
            "count": len(unique_models),
            "search_paths": possible_base_paths
        }
        
    except Exception as e:
        logger.error(f"Error listing available models: {str(e)}")
        return {"error": str(e), "found_models": []}

# Log final initialization status
logger.info("=" * 80)
logger.info("ACCIDENT DETECTION SERVICE INITIALIZATION COMPLETE")
logger.info("=" * 80)

# Get and log model info
try:
    final_model_info = accident_model.get_model_info()
    logger.info(f"Model Type: {final_model_info.get('model_type', 'Unknown')}")
    logger.info(f"Detection Method: {final_model_info.get('detection_method', 'Unknown')}")
    logger.info(f"Model Loaded: {final_model_info.get('is_loaded', False)}")
    logger.info(f"Model Path: {final_model_info.get('model_path', 'Unknown')}")
    logger.info(f"TensorFlow Available: {final_model_info.get('tensorflow_available', False)}")
    
    if TF_AVAILABLE:
        logger.info(f"TensorFlow Version: {tf_version}")
    
    # List available models
    available_models = list_available_models()
    if available_models.get('found_models'):
        logger.info(f"Available Models Found: {available_models['count']}")
        for model in available_models['found_models'][:3]:  # Show top 3
            logger.info(f"  - {model['filename']} ({model['size_mb']} MB)")
    else:
        logger.warning("No model files found in standard locations")
    
    # Test the model
    test_result = test_model_prediction()
    if test_result.get('test_successful'):
        logger.info("Model test prediction: SUCCESS")
    else:
        logger.warning(f"Model test prediction: FAILED - {test_result.get('error', 'Unknown error')}")

except Exception as e:
    logger.error(f"Error in final model status check: {str(e)}")

logger.info("=" * 80)
