// app/live/hooks/useLiveDetection.js
import { useState, useRef, useEffect, useCallback } from 'react';
import notificationService from '../../../lib/notificationService';

export const useLiveDetection = () => {
  const [isDetectionActive, setIsDetectionActive] = useState(false);
  const [currentDetection, setCurrentDetection] = useState(null);
  const [detectionResults, setDetectionResults] = useState([]);
  const [savedCount, setSavedCount] = useState(0);
  const [alertsTriggered, setAlertsTriggered] = useState(0);
  const [frameCount, setFrameCount] = useState(0);

  const frameCountRef = useRef(0);
  const resultIdRef = useRef(0);
  const mountedRef = useRef(true);
  const detectionActiveRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    initializeNotificationSystem();
    
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const initializeNotificationSystem = () => {
    const checkForNotificationSystem = () => {
      return window.GlobalNotificationSystem ? true : false;
    };

    if (!checkForNotificationSystem()) {
      let attempts = 0;
      const retryInterval = setInterval(() => {
        attempts++;
        if (checkForNotificationSystem() || attempts >= 10) {
          clearInterval(retryInterval);
        }
      }, 1000);
    }
  };

  const saveToResultsHistory = useCallback((data) => {
    try {
      const historyItem = {
        id: `live-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        filename: `live_frame_${data.frame_id || frameCountRef.current}.jpg`,
        file_size: 0,
        content_type: 'image/jpeg',
        accident_detected: data.accident_detected,
        confidence: data.confidence,
        processing_time: data.processing_time || 0,
        predicted_class: data.predicted_class || 'unknown',
        threshold: 0.5,
        frames_analyzed: 1,
        avg_confidence: data.confidence,
        analysis_type: 'live_detection',
        location: 'Live Detection Camera',
        time_of_day: new Date().toLocaleTimeString(),
        notes: `Live detection - Frame ${data.frame_id || frameCountRef.current}`,
        frame_id: data.frame_id || frameCountRef.current,
        detection_source: 'live_camera'
      };
      
      const existingHistory = JSON.parse(localStorage.getItem('detectionHistory') || '[]');
      existingHistory.unshift(historyItem);
      const trimmedHistory = existingHistory.slice(0, 100);
      localStorage.setItem('detectionHistory', JSON.stringify(trimmedHistory));
      
      setSavedCount(prev => prev + 1);
      return true;
    } catch (error) {
      console.error('Failed to save to history:', error);
      return false;
    }
  }, []);

  const processDetectionResult = useCallback((data) => {
    if (typeof data.accident_detected !== 'undefined') {
      setCurrentDetection(data);
      
      const newResult = {
        id: `result-${++resultIdRef.current}`,
        timestamp: new Date().toLocaleTimeString(),
        type: data.accident_detected ? 'Accident' : 'Normal',
        confidence: Math.round(data.confidence * 100),
        frameId: data.frame_id
      };
      
      setDetectionResults(prev => [newResult, ...prev.slice(0, 9)]);
      saveToResultsHistory(data);
      
      // Handle notifications and alerts
      try {
        notificationService.notifyLiveDetection(data);
        
        if (data.accident_detected) {
          notificationService.playAlertSound('accident');
          setAlertsTriggered(prev => prev + 1);
        } else {
          notificationService.playAlertSound('completion');
        }
      } catch (error) {
        console.error('Notification error:', error);
      }
    }
  }, [saveToResultsHistory]);

  const startDetection = useCallback(() => {
    setIsDetectionActive(true);
    detectionActiveRef.current = true;
    frameCountRef.current = 0;
    setFrameCount(0);
    setCurrentDetection(null);
  }, []);

  const stopDetection = useCallback(() => {
    setIsDetectionActive(false);
    detectionActiveRef.current = false;
    setCurrentDetection(null);
    frameCountRef.current = 0;
    setFrameCount(0);
  }, []);

  const updateFrameCount = useCallback(() => {
    frameCountRef.current++;
    setFrameCount(frameCountRef.current);
  }, []);

  return {
    isDetectionActive,
    currentDetection,
    detectionResults,
    savedCount,
    alertsTriggered,
    frameCount,
    frameCountRef,
    detectionActiveRef,
    mountedRef,
    startDetection,
    stopDetection,
    processDetectionResult,
    updateFrameCount
  };
};
