// app/live/hooks/useCamera.js - Enhanced with camera switching
import { useState, useRef, useCallback } from 'react';

export const useCamera = () => {
  const [cameraPermission, setCameraPermission] = useState('not-requested');
  const [cameraError, setCameraError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [currentFacingMode, setCurrentFacingMode] = useState('environment'); // 'user' for front, 'environment' for back
  const [availableCameras, setAvailableCameras] = useState([]);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const videoReadyRef = useRef(false);

  // Get available cameras
  const getAvailableCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setAvailableCameras(videoDevices);
      return videoDevices;
    } catch (error) {
      console.error('Failed to get available cameras:', error);
      return [];
    }
  }, []);

  const captureFrame = useCallback(() => {
    if (!videoRef.current) return null;

    const video = videoRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0 || 
        video.readyState < 2 || video.paused || video.ended) {
      return null;
    }

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = 128;
      canvas.height = 128;
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const dataURL = canvas.toDataURL('image/jpeg', 0.8);
      const base64 = dataURL.split(',')[1];
      
      return base64 && base64.length > 0 ? base64 : null;
      
    } catch (error) {
      console.error('Frame capture error:', error);
      return null;
    }
  }, []);

  const startCameraWithConstraints = useCallback(async (constraints) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        await new Promise((resolve, reject) => {
          const video = videoRef.current;
          
          const onLoad = async () => {
            try {
              await video.play();
              
              setTimeout(() => {
                setVideoReady(true);
                videoReadyRef.current = true;
              }, 500);
              
              resolve();
            } catch (playError) {
              reject(playError);
            }
          };
          
          video.addEventListener('loadeddata', onLoad, { once: true });
          
          setTimeout(() => {
            video.removeEventListener('loadeddata', onLoad);
            reject(new Error('Video load timeout'));
          }, 10000);
        });
      }
      
      return stream;
    } catch (error) {
      throw error;
    }
  }, []);

  const startCamera = useCallback(async (facingMode = currentFacingMode) => {
    try {
      setIsLoading(true);
      setCameraError('');
      setVideoReady(false);
      videoReadyRef.current = false;
      
      // Get available cameras first
      await getAvailableCameras();
      
      const constraints = {
        video: { 
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
          facingMode: facingMode
        },
        audio: false
      };
      
      await startCameraWithConstraints(constraints);
      setCurrentFacingMode(facingMode);
      setCameraPermission('granted');
      
    } catch (error) {
      let errorMessage = 'Failed to access camera';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please check your device.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Camera not supported by your browser.';
      } else if (error.name === 'OverconstrainedError') {
        // Try with basic constraints if facing mode fails
        try {
          const basicConstraints = {
            video: { 
              width: { ideal: 640, min: 320 },
              height: { ideal: 480, min: 240 }
            },
            audio: false
          };
          await startCameraWithConstraints(basicConstraints);
          setCameraPermission('granted');
          return; // Success with basic constraints
        } catch (basicError) {
          errorMessage = 'Camera constraints not supported. Using default camera.';
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setCameraError(errorMessage);
      setCameraPermission('denied');
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [currentFacingMode, getAvailableCameras, startCameraWithConstraints]);

  const switchCamera = useCallback(async () => {
    if (isSwitchingCamera || !videoReady) return;
    
    try {
      setIsSwitchingCamera(true);
      setCameraError('');
      
      // Stop current stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Switch facing mode
      const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
      
      // Start camera with new facing mode
      await startCamera(newFacingMode);
      
    } catch (error) {
      setCameraError(`Failed to switch camera: ${error.message}`);
      // Try to restart with original camera if switch fails
      try {
        await startCamera(currentFacingMode);
      } catch (restartError) {
        setCameraError('Camera connection lost. Please restart detection.');
      }
    } finally {
      setIsSwitchingCamera(false);
    }
  }, [isSwitchingCamera, videoReady, currentFacingMode, startCamera]);

  const stopCamera = useCallback(() => {
    setVideoReady(false);
    videoReadyRef.current = false;
    setIsSwitchingCamera(false);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setCameraPermission('not-requested');
    setCameraError('');
  }, []);

  // Check if device has multiple cameras
  const hasMultipleCameras = availableCameras.length > 1;

  // Get camera info for UI
  const getCurrentCameraInfo = () => {
    if (currentFacingMode === 'user') {
      return { name: 'Front Camera', icon: '🤳' };
    } else {
      return { name: 'Back Camera', icon: '📷' };
    }
  };

  return {
    cameraPermission,
    cameraError,
    isLoading,
    videoReady,
    currentFacingMode,
    availableCameras,
    hasMultipleCameras,
    isSwitchingCamera,
    videoRef,
    streamRef,
    videoReadyRef,
    captureFrame,
    startCamera,
    stopCamera,
    switchCamera,
    getAvailableCameras,
    getCurrentCameraInfo
  };
};
