'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import notificationService from '../lib/notificationService';

const EnhancedLiveDetection = () => {
  const [isDetectionActive, setIsDetectionActive] = useState(false);
  const [cameraPermission, setCameraPermission] = useState('not-requested');
  const [cameraError, setCameraError] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);
  const [currentDetection, setCurrentDetection] = useState(null);
  const [detectionResults, setDetectionResults] = useState([]);
  const [stats, setStats] = useState({ totalFrames: 0, framesSent: 0, detectionRate: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [alertsTriggered, setAlertsTriggered] = useState(0);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const wsRef = useRef(null);
  const intervalRef = useRef(null);
  const frameCountRef = useRef(0);
  const mountedRef = useRef(true);
  const videoReadyRef = useRef(false);
  const detectionActiveRef = useRef(false);
  const resultIdRef = useRef(0);
  const lastAlertTimeRef = useRef(0);

  // Fix API URL to match your backend
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://accident-prediction-1-mpm0.onrender.com';
  const WS_BASE_URL = API_BASE_URL.replace('https://', 'wss://').replace('http://', 'ws://');

  useEffect(() => {
    mountedRef.current = true;
    checkApiConnection();
    initializeNotificationSystem();
    
    return () => {
      mountedRef.current = false;
      stopDetection();
    };
  }, []);

  const checkApiConnection = async () => {
    try {
      console.log('🔍 Checking API connection to:', API_BASE_URL);
      const response = await fetch(`${API_BASE_URL}/api/health`, {
        signal: AbortSignal.timeout(10000)
      });
      
      if (response.ok) {
        const data = await response.json();
        setApiConnected(true);
        console.log('✅ API connected:', data);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      setApiConnected(false);
      setCameraError(`Cannot connect to AI detection service: ${error.message}`);
      console.error('❌ API connection failed:', error);
    }
  };

  const initializeNotificationSystem = () => {
    const checkForNotificationSystem = () => {
      if (window.GlobalNotificationSystem) {
        console.log('✅ GlobalNotificationSystem found and connected');
        return true;
      }
      return false;
    };

    if (!checkForNotificationSystem()) {
      let attempts = 0;
      const retryInterval = setInterval(() => {
        attempts++;
        if (checkForNotificationSystem() || attempts >= 10) {
          clearInterval(retryInterval);
          if (attempts >= 10) {
            console.warn('⚠️ GlobalNotificationSystem not found after 10 attempts');
          }
        }
      }, 1000);
    }
  };

  const saveToResultsHistory = (data) => {
    try {
      console.log('💾 [LIVE] Saving detection result to history:', data);

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
        analysis_type: 'live',
        location: 'Live Detection Camera',
        weather_conditions: 'Real-time',
        time_of_day: new Date().toLocaleTimeString(),
        notes: `Live detection from camera feed - Frame ${data.frame_id || frameCountRef.current}`,
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
      console.error('❌ [LIVE] Failed to save detection to localStorage:', error);
      return false;
    }
  };

  const triggerNotificationAlert = (data) => {
    try {
      const now = Date.now();
      const cooldownPeriod = 5000;

      if (now - lastAlertTimeRef.current < cooldownPeriod) {
        console.log('⏳ [LIVE] Alert cooldown active, skipping notification');
        return false;
      }

      console.log('🚨 [LIVE] Starting notification alert process:', data);
      
      const alertData = {
        confidence: data.confidence,
        accident_detected: data.accident_detected,
        source: 'Live Camera Feed',
        location: 'Live Detection',
        predicted_class: data.predicted_class || 'Unknown',
        frame_id: data.frame_id || frameCountRef.current,
        timestamp: new Date().toISOString(),
        processing_time: data.processing_time || 0,
        analysis_type: 'Live Detection',
        content_type: 'video/live-stream',
        filename: `live_frame_${data.frame_id || frameCountRef.current}.jpg`
      };

      try {
        const alertHistoryItem = {
          id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          type: 'accident',
          confidence: alertData.confidence,
          location: alertData.location,
          source: alertData.source,
          acknowledged: false,
          severity: alertData.confidence > 0.8 ? 'high' : 'medium',
          accident_detected: alertData.accident_detected,
          predicted_class: alertData.predicted_class,
          frame_id: alertData.frame_id,
          filename: alertData.filename,
          processing_time: alertData.processing_time,
          analysis_type: alertData.analysis_type
        };

        const existingAlerts = JSON.parse(localStorage.getItem('alertHistory') || '[]');
        existingAlerts.unshift(alertHistoryItem);
        const trimmedAlerts = existingAlerts.slice(0, 50);
        localStorage.setItem('alertHistory', JSON.stringify(trimmedAlerts));

        window.dispatchEvent(new StorageEvent('storage', {
          key: 'alertHistory',
          newValue: JSON.stringify(trimmedAlerts),
          url: window.location.href
        }));
        
        setAlertsTriggered(prev => prev + 1);
        lastAlertTimeRef.current = now;

      } catch (storageError) {
        console.error('❌ [LIVE] Failed to save alert to history:', storageError);
      }

      if (window.GlobalNotificationSystem?.triggerAlert) {
        console.log('🔊 [LIVE] Triggering GlobalNotificationSystem alert');
        window.GlobalNotificationSystem.triggerAlert(alertData);
        console.log('✅ [LIVE] GlobalNotificationSystem alert triggered');
      } else {
        console.warn('⚠️ [LIVE] GlobalNotificationSystem not available, using fallback');
        
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(
            alertData.accident_detected ? 'ACCIDENT DETECTED!' : 'DETECTION ALERT',
            {
              body: `Confidence: ${(alertData.confidence * 100).toFixed(1)}% from Live Camera`,
              icon: '/favicon.ico',
              requireInteraction: true,
              tag: 'live-detection-alert'
            }
          );
        }
      }

      return true;

    } catch (error) {
      console.error('❌ [LIVE] Failed to trigger notification alert:', error);
      return false;
    }
  };

  const setupWebSocket = () => {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${WS_BASE_URL}/api/live/ws`;
        console.log('🔗 Connecting to WebSocket:', wsUrl);
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        const timeout = setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            ws.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, 15000);

        ws.onopen = () => {
          clearTimeout(timeout);
          setWsConnected(true);
          console.log('🔗 WebSocket connected successfully');
          
          // Send initial ping to verify connection
          ws.send(JSON.stringify({
            type: 'ping',
            timestamp: new Date().toISOString()
          }));
          
          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📨 WebSocket message received:', data);
            
            if (data.type === 'connection_established') {
              console.log('✅ Connection established:', data.message);
              return;
            }
            
            if (data.type === 'pong' || data.type === 'ping') {
              console.log('🏓 Ping/pong received');
              return;
            }
            
            if (data.error) {
              console.error('❌ WebSocket error from server:', data.error);
              setCameraError(`Server error: ${data.error}`);
              return;
            }
            
            // CRITICAL FIX: Handle detection results properly
            if (data.type === 'detection_result' || typeof data.accident_detected !== 'undefined') {
              console.log('🎯 [DETECTION] Processing detection result:', {
                accident_detected: data.accident_detected,
                confidence: data.confidence,
                predicted_class: data.predicted_class,
                frame_id: data.frame_id,
                type: data.type
              });
              
              // Update current detection state
              setCurrentDetection(data);
              
              // Create result for display
              const newResult = {
                id: `result-${++resultIdRef.current}`,
                timestamp: new Date().toLocaleTimeString(),
                type: data.accident_detected ? 'Accident' : 'Normal',
                confidence: Math.round(data.confidence * 100),
                frameId: data.frame_id || frameCountRef.current,
                predictedClass: data.predicted_class || 'Unknown'
              };
              
              setDetectionResults(prev => [newResult, ...prev.slice(0, 19)]);
              
              // Save to results history - save ALL results
              const saved = saveToResultsHistory(data);
              if (saved) {
                console.log('✅ [LIVE] Detection saved to results history');
              }
              
              // CRITICAL FIX: Use the new notification service correctly
              const notification = notificationService.notifyLiveDetection(data);
              
              // Enhanced alert logic with better sound handling
              if (data.accident_detected) {
                // Play accident alert sound
                notificationService.playAlertSound('accident');
                
                // Trigger comprehensive alert system
                triggerNotificationAlert(data);
                
                console.log('🚨 [LIVE] ACCIDENT DETECTED - All alerts triggered:', {
                  confidence: data.confidence,
                  predicted_class: data.predicted_class,
                  notification: notification
                });
              } else {
                // Play completion sound for normal traffic
                notificationService.playAlertSound('completion');
                console.log('✅ [LIVE] Normal traffic detected - completion sound played');
              }
              
              // Update stats
              setStats(prev => ({
                ...prev,
                totalFrames: data.total_frames || prev.totalFrames + 1,
                detectionRate: data.detection_rate || prev.detectionRate
              }));
            }
            
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error, 'Raw data:', event.data);
          }
        };

        ws.onclose = (event) => {
          clearTimeout(timeout);
          setWsConnected(false);
          console.log('🔌 WebSocket disconnected:', event.code, event.reason);
          
          // Auto-reconnect if detection is still active
          if (detectionActiveRef.current && mountedRef.current) {
            console.log('🔄 Attempting WebSocket reconnection...');
            setTimeout(() => {
              if (detectionActiveRef.current && mountedRef.current) {
                setupWebSocket().catch(console.error);
              }
            }, 3000);
          }
        };

        ws.onerror = (error) => {
          clearTimeout(timeout);
          setWsConnected(false);
          console.error('❌ WebSocket error:', error);
          setCameraError('WebSocket connection failed. Check if the backend server is running.');
          reject(error);
        };

      } catch (error) {
        console.error('❌ Failed to create WebSocket:', error);
        reject(error);
      }
    });
  };

  // CRITICAL FIX: Enhanced frame capture with better error handling
  const captureFrame = () => {
    if (!videoRef.current) {
      console.warn('⚠️ Video ref not available');
      return null;
    }

    const video = videoRef.current;

    // Check video state more thoroughly
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.warn('⚠️ Video dimensions not available:', { width: video.videoWidth, height: video.videoHeight });
      return null;
    }

    if (video.readyState < 2) {
      console.warn('⚠️ Video not ready:', { readyState: video.readyState });
      return null;
    }

    if (video.paused || video.ended) {
      console.warn('⚠️ Video is paused or ended');
      return null;
    }

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Use video's actual dimensions for better quality
      const width = Math.min(video.videoWidth, 640);
      const height = Math.min(video.videoHeight, 480);
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw the video frame to canvas
      ctx.drawImage(video, 0, 0, width, height);
      
      // Convert to base64 with good quality
      const dataURL = canvas.toDataURL('image/jpeg', 0.9);
      const base64 = dataURL.split(',')[1];
      
      if (!base64 || base64.length === 0) {
        console.warn('⚠️ Empty base64 data');
        return null;
      }
      
      console.log('📸 Frame captured successfully:', {
        dimensions: `${width}x${height}`,
        base64Length: base64.length,
        dataUrlLength: dataURL.length
      });
      
      return base64;
      
    } catch (error) {
      console.error('❌ Frame capture error:', error);
      return null;
    }
  };

  const captureAndSendFrame = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket not ready for frame send');
      return false;
    }

    const frame = captureFrame();
    if (!frame) {
      console.warn('⚠️ No frame available to send');
      return false;
    }

    try {
      frameCountRef.current++;
      
      const payload = {
        frame: frame,
        timestamp: new Date().toISOString(),
        frame_id: `live_${frameCountRef.current}_${Date.now()}`,
        type: 'frame_analysis'
      };
      
      console.log('📤 Sending frame for analysis:', {
        frame_id: payload.frame_id,
        frameSize: frame.length,
        wsState: wsRef.current.readyState
      });
      
      wsRef.current.send(JSON.stringify(payload));
      
      setStats(prev => ({
        ...prev,
        framesSent: frameCountRef.current
      }));
      
      return true;
      
    } catch (error) {
      console.error('❌ Frame send error:', error);
      return false;
    }
  };

  const startFrameProcessing = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    console.log('🎬 Starting frame processing...');
    
    // Send frames more frequently for better detection
    intervalRef.current = setInterval(() => {
      if (!detectionActiveRef.current || !mountedRef.current) {
        return;
      }

      if (!videoReadyRef.current) {
        return;
      }
      
      const success = captureAndSendFrame();
      if (!success) {
        console.warn('⚠️ Failed to capture/send frame');
      }
    }, 2000); // Send frame every 2 seconds for more reliable detection
  };

  const startCamera = async () => {
    if (!apiConnected) {
      setCameraError('API not connected. Please check if the backend server is running.');
      return;
    }

    try {
      setIsLoading(true);
      setCameraError('');
      setVideoReady(false);
      
      console.log('📹 Starting camera...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30, min: 15 }
        },
        audio: false
      });
      
      console.log('✅ Camera stream obtained');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        await new Promise((resolve, reject) => {
          const video = videoRef.current;
          
          const onLoad = async () => {
            try {
              console.log('🎥 Video metadata loaded:', {
                videoWidth: video.videoWidth,
                videoHeight: video.videoHeight,
                readyState: video.readyState
              });
              
              await video.play();
              console.log('▶️ Video playback started');
              
              // Wait a bit longer for video to stabilize
              setTimeout(() => {
                setVideoReady(true);
                videoReadyRef.current = true;
                console.log('📹 Video ready for capture');
              }, 1500);
              
              resolve();
            } catch (playError) {
              console.error('❌ Video play error:', playError);
              reject(playError);
            }
          };
          
          video.addEventListener('loadeddata', onLoad, { once: true });
          
          setTimeout(() => {
            video.removeEventListener('loadeddata', onLoad);
            reject(new Error('Video load timeout'));
          }, 15000);
        });
      }
      
      setCameraPermission('granted');
      
      console.log('🔗 Setting up WebSocket...');
      await setupWebSocket();
      
      setIsDetectionActive(true);
      detectionActiveRef.current = true;
      
      // Start frame processing after everything is ready
      setTimeout(() => {
        if (mountedRef.current && videoReadyRef.current) {
          startFrameProcessing();
          console.log('🚀 Live detection started successfully');
        }
      }, 2000);
      
    } catch (error) {
      console.error('❌ Camera start error:', error);
      setCameraError(`Failed to start camera: ${error.message}`);
      setIsDetectionActive(false);
    } finally {
      setIsLoading(false);
    }
  };

  const stopDetection = () => {
    console.log('🛑 Stopping detection...');
    
    setIsDetectionActive(false);
    detectionActiveRef.current = false;
    setVideoReady(false);
    videoReadyRef.current = false;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setWsConnected(false);
    setCameraPermission('not-requested');
    setCurrentDetection(null);
    setDetectionResults([]);
    frameCountRef.current = 0;
    setStats({ totalFrames: 0, framesSent: 0, detectionRate: 0 });
    
    console.log('✅ Detection stopped');
  };

  const testNotificationSystem = () => {
    const testData = {
      confidence: 0.92,
      accident_detected: true,
      predicted_class: 'accident',
      frame_id: 'TEST_LIVE_001',
      processing_time: 1.5
    };
    
    console.log('🧪 [LIVE] Testing notification system with:', testData);
    triggerNotificationAlert(testData);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px', fontSize: '2rem', color: '#333' }}>
        Live Accident Detection
      </h1>

      {/* Debug Panel */}
      <div style={{ 
        backgroundColor: '#fff3cd', 
        border: '1px solid #ffeaa7',
        borderRadius: '6px',
        padding: '1rem',
        marginBottom: '1rem'
      }}>
        <h4 style={{ color: '#856404', marginBottom: '0.5rem' }}>🔧 Live Detection Debug</h4>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={testNotificationSystem}
            style={{
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.8rem'
            }}
          >
            Test Alert System
          </button>
          <button
            onClick={() => {
              const alerts = JSON.parse(localStorage.getItem('alertHistory') || '[]');
              const liveAlerts = alerts.filter(a => a.source && a.source.includes('Live'));
              console.log('Live camera alerts:', liveAlerts);
              alert(`Live Alerts: ${liveAlerts.length} total`);
            }}
            style={{
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.8rem'
            }}
          >
            Check Live Alerts ({alertsTriggered})
          </button>
        </div>
      </div>

      {/* Enhanced Status Bar */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{
          padding: '10px 20px',
          borderRadius: '15px',
          fontSize: '0.9rem',
          backgroundColor: apiConnected ? '#d4edda' : '#f8d7da',
          color: apiConnected ? '#155724' : '#721c24'
        }}>
          API: {apiConnected ? 'Connected' : 'Disconnected'}
        </div>
        <div style={{
          padding: '10px 20px',
          borderRadius: '15px',
          fontSize: '0.9rem',
          backgroundColor: wsConnected ? '#d4edda' : '#f8d7da',
          color: wsConnected ? '#155724' : '#721c24'
        }}>
          WebSocket: {wsConnected ? 'Connected' : 'Disconnected'}
        </div>
        <div style={{
          padding: '10px 20px',
          borderRadius: '15px',
          fontSize: '0.9rem',
          backgroundColor: isDetectionActive ? '#d1ecf1' : '#f8f9fa',
          color: isDetectionActive ? '#0c5460' : '#6c757d'
        }}>
          Detection: {isDetectionActive ? 'Active' : 'Inactive'}
        </div>
        <div style={{
          padding: '10px 20px',
          borderRadius: '15px',
          fontSize: '0.9rem',
          backgroundColor: videoReady ? '#d4edda' : '#f8f9fa',
          color: videoReady ? '#155724' : '#6c757d'
        }}>
          Video: {videoReady ? 'Ready' : 'Not Ready'}
        </div>
        <div style={{
          padding: '10px 20px',
          borderRadius: '15px',
          fontSize: '0.9rem',
          backgroundColor: savedCount > 0 ? '#fff3cd' : '#f8f9fa',
          color: savedCount > 0 ? '#856404' : '#6c757d'
        }}>
          Results Saved: {savedCount}
        </div>
        <div style={{
          padding: '10px 20px',
          borderRadius: '15px',
          fontSize: '0.9rem',
          backgroundColor: alertsTriggered > 0 ? '#f8d7da' : '#f8f9fa',
          color: alertsTriggered > 0 ? '#721c24' : '#6c757d'
        }}>
          Alerts Triggered: {alertsTriggered}
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        
        {/* Video Feed */}
        <div style={{ 
          backgroundColor: '#000', 
          borderRadius: '12px', 
          position: 'relative',
          overflow: 'hidden',
          minHeight: '300px'
        }}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: isDetectionActive ? 'block' : 'none'
            }}
          />
          
          {!isDetectionActive && (
            <div style={{ 
              width: '100%', 
              height: '300px', 
              backgroundColor: '#222',
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📹</div>
              <h3>Camera Preview</h3>
              <p style={{ color: '#aaa' }}>
                {isLoading ? 'Starting...' : 'Click Start to begin'}
              </p>
            </div>
          )}
          
          {/* Live indicator */}
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            backgroundColor: isDetectionActive ? '#28a745' : '#dc3545',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '15px',
            fontSize: '0.8rem',
            fontWeight: 'bold'
          }}>
            ● {isDetectionActive ? 'LIVE' : 'OFFLINE'}
          </div>

          {/* Detection overlay */}
          {currentDetection && isDetectionActive && (
            <div style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              backgroundColor: currentDetection.accident_detected ? 
                'rgba(220, 53, 69, 0.9)' : 'rgba(40, 167, 69, 0.9)',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 'bold'
            }}>
              {currentDetection.accident_detected ? '🚨 ACCIDENT' : '✅ NORMAL'}
              <br />
              {(currentDetection.confidence * 100).toFixed(1)}%
            </div>
          )}

          {/* Frame counter */}
          {isDetectionActive && (
            <div style={{
              position: 'absolute',
              bottom: '10px',
              left: '10px',
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: 'white',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '0.7rem'
            }}>
              Frames Sent: {stats.framesSent}
            </div>
          )}
        </div>

        {/* Detection Status */}
        <div style={{ 
          backgroundColor: currentDetection ? 
            (currentDetection.accident_detected ? '#fff5f5' : '#f0fff4') : '#f8f9fa', 
          border: `2px solid ${currentDetection ? 
            (currentDetection.accident_detected ? '#dc3545' : '#28a745') : '#dee2e6'}`, 
          borderRadius: '12px', 
          padding: '20px'
        }}>
          <h3 style={{ textAlign: 'center', marginBottom: '15px' }}>Detection Status</h3>
          
          {currentDetection ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}>
                {currentDetection.accident_detected ? '🚨' : '✅'}
              </div>
              <div style={{
                fontSize: '1.2rem',
                fontWeight: 'bold',
                color: currentDetection.accident_detected ? '#dc3545' : '#28a745',
                marginBottom: '10px'
              }}>
                {currentDetection.accident_detected ? 'ACCIDENT DETECTED' : 'NORMAL TRAFFIC'}
              </div>
              <div style={{ fontSize: '1rem', color: '#666' }}>
                Confidence: {(currentDetection.confidence * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '5px' }}>
                Frame: {currentDetection.frame_id} | Class: {currentDetection.predicted_class}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: '2rem', marginBottom: '15px' }}>🤖</div>
              <div style={{ color: '#666' }}>
                {isDetectionActive ? 'Waiting for results...' : 'Detection not active'}
              </div>
              {isDetectionActive && (
                <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '10px' }}>
                  Frames sent: {stats.framesSent}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent Detections */}
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          border: '1px solid #dee2e6', 
          borderRadius: '12px', 
          padding: '20px'
        }}>
          <h3 style={{ marginBottom: '15px' }}>Recent Detections</h3>
          
          <div style={{ 
            maxHeight: '400px', 
            overflowY: 'auto'
          }}>
            {detectionResults.length === 0 ? (
              <div style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
                No detections yet
              </div>
            ) : (
              detectionResults.map((result) => (
                <div 
                  key={result.id} 
                  style={{
                    padding: '10px',
                    marginBottom: '8px',
                    borderRadius: '6px',
                    backgroundColor: result.type === 'Accident' ? '#ffe6e6' : '#e6ffe6',
                    border: `1px solid ${result.type === 'Accident' ? '#ffb3b3' : '#b3ffb3'}`,
                    fontSize: '0.85rem'
                  }}
                >
                  <div style={{ fontWeight: 'bold', color: result.type === 'Accident' ? '#dc3545' : '#28a745' }}>
                    {result.type === 'Accident' ? '🚨' : '✅'} {result.type}
                  </div>
                  <div style={{ color: '#666', marginTop: '4px' }}>
                    {result.timestamp} | {result.confidence}% | Frame {result.frameId}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {cameraError && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '15px',
          borderRadius: '6px',
          border: '1px solid #f5c6cb',
          marginBottom: '20px'
        }}>
          <strong>Error:</strong> {cameraError}
        </div>
      )}

      {/* Main Controls */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <button 
          onClick={startCamera}
          disabled={isDetectionActive || isLoading || !apiConnected}
          style={{ 
            backgroundColor: (isDetectionActive || isLoading || !apiConnected) ? '#6c757d' : '#28a745', 
            color: 'white',
            border: 'none',
            fontSize: '1.1rem', 
            padding: '12px 32px',
            borderRadius: '6px',
            cursor: (isDetectionActive || isLoading || !apiConnected) ? 'not-allowed' : 'pointer',
            opacity: (isDetectionActive || isLoading || !apiConnected) ? 0.6 : 1
          }}
        >
          {isLoading ? '🔄 Starting...' : (isDetectionActive ? '✅ Active' : '🚀 Start Detection')}
        </button>
        
        <button 
          onClick={stopDetection}
          disabled={!isDetectionActive}
          style={{ 
            backgroundColor: !isDetectionActive ? '#6c757d' : '#dc3545', 
            color: 'white',
            border: 'none',
            fontSize: '1.1rem', 
            padding: '12px 32px',
            borderRadius: '6px',
            cursor: !isDetectionActive ? 'not-allowed' : 'pointer',
            opacity: !isDetectionActive ? 0.6 : 1
          }}
        >
          🛑 Stop Detection
        </button>

        <Link
          href="/results"
          style={{ 
            backgroundColor: '#0070f3', 
            color: 'white',
            border: 'none',
            fontSize: '1.1rem', 
            padding: '12px 32px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none'
          }}
        >
          📊 View Results ({savedCount})
        </Link>

        <Link
          href="/notification"
          style={{ 
            backgroundColor: alertsTriggered > 0 ? '#dc3545' : '#6c757d',
            color: 'white',
            border: 'none',
            fontSize: '1.1rem', 
            padding: '12px 32px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none'
          }}
        >
          🔔 Alerts ({alertsTriggered})
        </Link>
      </div>

      {/* Enhanced Stats */}
      {isDetectionActive && (
        <div style={{ 
          marginBottom: '20px',
          textAlign: 'center',
          fontSize: '0.9rem',
          color: '#666',
          backgroundColor: '#f8f9fa',
          padding: '15px',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
            <div>
              <div style={{ fontWeight: 'bold', color: '#0070f3' }}>Frames Sent</div>
              <div style={{ fontSize: '1.2rem' }}>{stats.framesSent}</div>
            </div>
            <div>
              <div style={{ fontWeight: 'bold', color: '#28a745' }}>Total Processed</div>
              <div style={{ fontSize: '1.2rem' }}>{stats.totalFrames}</div>
            </div>
            <div>
              <div style={{ fontWeight: 'bold', color: '#ffc107' }}>Detection Rate</div>
              <div style={{ fontSize: '1.2rem' }}>{(stats.detectionRate * 100).toFixed(1)}%</div>
            </div>
            <div>
              <div style={{ fontWeight: 'bold', color: '#17a2b8' }}>Results Saved</div>
              <div style={{ fontSize: '1.2rem' }}>{savedCount}</div>
            </div>
            <div>
              <div style={{ fontWeight: 'bold', color: '#dc3545' }}>Alerts Triggered</div>
              <div style={{ fontSize: '1.2rem' }}>{alertsTriggered}</div>
            </div>
          </div>
        </div>
      )}

      {/* Connection Diagnostics */}
      <div style={{
        backgroundColor: '#e8f4fd',
        border: '1px solid #b3d9ff',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h4 style={{ color: '#0056b3', marginBottom: '15px' }}>🔧 Connection Diagnostics</h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
          <div style={{
            backgroundColor: 'white',
            padding: '15px',
            borderRadius: '8px',
            border: '1px solid #b3d9ff'
          }}>
            <div style={{ fontWeight: 'bold', color: '#0056b3', marginBottom: '8px' }}>
              🌐 API Connection
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '8px' }}>
              Backend URL: {API_BASE_URL}
            </div>
            <div style={{ 
              fontSize: '0.8rem', 
              color: apiConnected ? '#28a745' : '#dc3545',
              fontWeight: 'bold'
            }}>
              Status: {apiConnected ? 'CONNECTED' : 'DISCONNECTED'}
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '15px',
            borderRadius: '8px',
            border: '1px solid #b3d9ff'
          }}>
            <div style={{ fontWeight: 'bold', color: '#0056b3', marginBottom: '8px' }}>
              🔌 WebSocket Connection
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '8px' }}>
              WebSocket URL: {WS_BASE_URL}/api/live/ws
            </div>
            <div style={{ 
              fontSize: '0.8rem', 
              color: wsConnected ? '#28a745' : '#dc3545',
              fontWeight: 'bold'
            }}>
              Status: {wsConnected ? 'CONNECTED' : 'DISCONNECTED'}
            </div>
          </div>
        </div>

        <div style={{ 
          marginTop: '15px', 
          padding: '12px', 
          backgroundColor: 'rgba(255,255,255,0.5)', 
          borderRadius: '6px' 
        }}>
          <div style={{ fontSize: '0.9rem', color: '#0056b3' }}>
            <strong>Troubleshooting Tips:</strong>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>
            • Make sure the Python backend server is running<br/>
            • Check that port 8000 is accessible<br/>
            • Verify WebSocket connections are not blocked by firewall<br/>
            • Try refreshing the page if connections fail<br/>
            • Check browser console for detailed error messages
          </div>
        </div>
      </div>

      {/* Performance Information */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '15px',
        borderRadius: '8px',
        border: '1px solid #dee2e6',
        marginBottom: '20px',
        fontSize: '0.9rem',
        color: '#495057'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <strong>🤖 Live Detection System Information</strong>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          <div><strong>Model:</strong> AI-powered accident detection</div>
          <div><strong>Frame Rate:</strong> 1 frame every 2 seconds</div>
          <div><strong>Resolution:</strong> Up to 1280x720 capture</div>
          <div><strong>Threshold:</strong> 50% confidence</div>
          <div><strong>Processing:</strong> Real-time WebSocket streaming</div>
          <div><strong>Storage:</strong> localStorage with 100 result limit</div>
        </div>
      </div>

      {/* Back to home link */}
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <Link href="/" style={{ color: '#666', textDecoration: 'none' }}>
          ← Back to Home
        </Link>
      </div>
    </div>
  );
};

export default EnhancedLiveDetection;
