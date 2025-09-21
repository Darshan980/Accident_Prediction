// app/live/hooks/useCamera.js
import { useState, useRef, useCallback } from 'react';

export const useCamera = () => {
  const [cameraPermission, setCameraPermission] = useState('not-requested');
  const [cameraError, setCameraError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const videoReadyRef = useRef(false);

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

  const startCamera = useCallback(async () => {
    try {
      setIsLoading(true);
      setCameraError('');
      setVideoReady(false);
      videoReadyRef.current = false;
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
          facingMode: 'environment' // Use back camera on mobile
        },
        audio: false
      });
      
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
      
      setCameraPermission('granted');
      
    } catch (error) {
      let errorMessage = 'Failed to access camera';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please check your device.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Camera not supported by your browser.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setCameraError(errorMessage);
      setCameraPermission('denied');
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    setVideoReady(false);
    videoReadyRef.current = false;
    
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

  return {
    cameraPermission,
    cameraError,
    isLoading,
    videoReady,
    videoRef,
    streamRef,
    videoReadyRef,
    captureFrame,
    startCamera,
    stopCamera
  };
};
