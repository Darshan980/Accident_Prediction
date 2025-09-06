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
      const response = await fetch('http://localhost:8000/api/health', {
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const data = await response.json();
        setApiConnected(true);
        console.log('API connected:', data);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      setApiConnected(false);
      setCameraError('Cannot connect to AI detection service on port 8000');
      console.error('API connection failed:', error);
    }
  };

  // Initialize notification system integration
  const initializeNotificationSystem = () => {
    // Wait for GlobalNotificationSystem to be available
    const checkForNotificationSystem = () => {
      if (window.GlobalNotificationSystem) {
        console.log('✅ GlobalNotificationSystem found and connected');
        return true;
      }
      return false;
    };

    if (!checkForNotificationSystem()) {
      // Retry every 1 second for up to 10 seconds
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

  // Enhanced function to save detection result to localStorage for results page
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
      
      console.log('📝 [LIVE] Created history item:', historyItem);
      
      // Get existing history
      const existingHistory = JSON.parse(localStorage.getItem('detectionHistory') || '[]');
      console.log('📋 [LIVE] Current history count:', existingHistory.length);
      
      // Add new item to beginning
      existingHistory.unshift(historyItem);
      
      // Keep only last 100 results
      const trimmedHistory = existingHistory.slice(0, 100);
      
      // Save back to localStorage
      localStorage.setItem('detectionHistory', JSON.stringify(trimmedHistory));
      console.log('✅ [LIVE] Saved to detectionHistory. New count:', trimmedHistory.length);
      
      // Update saved count
      setSavedCount(prev => prev + 1);
      
      return true;
    } catch (error) {
      console.error('❌ [LIVE] Failed to save detection to localStorage:', error);
      return false;
    }
  };

  // Enhanced notification alert system integration
  const triggerNotificationAlert = (data) => {
    try {
      const now = Date.now();
      const cooldownPeriod = 5000; // 5 seconds cooldown between alerts

      // Check cooldown to prevent spam
      if (now - lastAlertTimeRef.current < cooldownPeriod) {
        console.log('⏳ [LIVE] Alert cooldown active, skipping notification');
        return false;
      }

      console.log('🚨 [LIVE] Starting notification alert process:', data);
      
      // Create comprehensive alert data
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

      console.log('📊 [LIVE] Created alert data:', alertData);

      // STEP 1: Save to notification/alert history in the same format as upload component
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

        console.log('💾 [LIVE] Created alert history item:', alertHistoryItem);

        // Get existing alert history (same key as notification page and upload component)
        const existingAlerts = JSON.parse(localStorage.getItem('alertHistory') || '[]');
        console.log('📋 [LIVE] Existing alert count:', existingAlerts.length);

        // Add to beginning of array
        existingAlerts.unshift(alertHistoryItem);
        
        // Keep only last 50 alerts
        const trimmedAlerts = existingAlerts.slice(0, 50);
        
        // Save to localStorage with same key as notification page
        localStorage.setItem('alertHistory', JSON.stringify(trimmedAlerts));
        console.log('✅ [LIVE] Alert saved to alertHistory. New count:', trimmedAlerts.length);

        // Force a storage event to notify other tabs/components
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'alertHistory',
          newValue: JSON.stringify(trimmedAlerts),
          url: window.location.href
        }));
        
        console.log('📡 [LIVE] Dispatched storage event for cross-tab sync');

        // Update local state
        setAlertsTriggered(prev => prev + 1);
        lastAlertTimeRef.current = now;

      } catch (storageError) {
        console.error('❌ [LIVE] Failed to save alert to history:', storageError);
      }

      // STEP 2: Trigger the GlobalNotificationSystem
      if (window.GlobalNotificationSystem?.triggerAlert) {
        console.log('🔊 [LIVE] Triggering GlobalNotificationSystem alert');
        window.GlobalNotificationSystem.triggerAlert(alertData);
        console.log('✅ [LIVE] GlobalNotificationSystem alert triggered');
      } else {
        console.warn('⚠️ [LIVE] GlobalNotificationSystem not available, using fallback');
        
        // Fallback: Show browser notification if available
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

      console.log('🚀 [LIVE] All notification components triggered');
      return true;

    } catch (error) {
      console.error('❌ [LIVE] Failed to trigger notification alert:', error);
      return false;
    }
  };

  const setupWebSocket = () => {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket('ws://localhost:8000/api/live/ws');
        wsRef.current = ws;

        const timeout = setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            ws.close();
            reject(new Error('WebSocket timeout'));
          }
        }, 10000);

        ws.onopen = () => {
          clearTimeout(timeout);
          setWsConnected(true);
          console.log('🔗 WebSocket connected');
          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'connection_established' || data.type === 'ping') {
              return;
            }
            
            if (data.error) {
              console.error('WebSocket error:', data.error);
              return;
            }
            
            // Handle detection results
            if (typeof data.accident_detected !== 'undefined') {
              console.log('📊 [LIVE] Detection result received:', data);
              
              setCurrentDetection(data);
              
              const newResult = {
                id: `result-${++resultIdRef.current}`,
                timestamp: new Date().toLocaleTimeString(),
                type: data.accident_detected ? 'Accident' : 'Normal',
                confidence: Math.round(data.confidence * 100),
                frameId: data.frame_id,
                predictedClass: data.predicted_class || 'Unknown'
              };
              
              setDetectionResults(prev => [newResult, ...prev.slice(0, 19)]);
              
              // Save to results history
              const saved = saveToResultsHistory(data);
              if (saved) {
                console.log('✅ [LIVE] Detection saved to results history');
              }
              
              // Use the new notification service (ONLY for accidents)
              const notification = notificationService.notifyLiveDetection(data);
              
              // Play sound based on result
              if (data.accident_detected) {
                notificationService.playAlertSound('accident');
                setAlertsTriggered(prev => prev + 1);
                console.log('🚨 [LIVE] Accident detected - notification created:', notification);
              } else {
                notificationService.playAlertSound('completion');
                console.log('✅ [LIVE] Safe result - no notification created');
              }
              
              setStats(prev => ({
                ...prev,
                totalFrames: data.total_frames || prev.totalFrames,
                detectionRate: data.detection_rate || prev.detectionRate
              }));
            }
            
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onclose = (event) => {
          clearTimeout(timeout);
          setWsConnected(false);
          console.log('🔌 WebSocket disconnected');
        };

        ws.onerror = (error) => {
          clearTimeout(timeout);
          setWsConnected(false);
          console.error('WebSocket error:', error);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  };

  const captureFrame = () => {
    if (!videoRef.current) {
      return null;
    }

    const video = videoRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }

    if (video.readyState < 2) {
      return null;
    }

    if (video.paused || video.ended) {
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
      
      if (!base64 || base64.length === 0) {
        return null;
      }
      
      return base64;
      
    } catch (error) {
      console.error('Frame capture error:', error);
      return null;
    }
  };

  const captureAndSendFrame = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }

    const frame = captureFrame();
    if (!frame) {
      return false;
    }

    try {
      frameCountRef.current++;
      
      const payload = {
        frame: frame,
        timestamp: new Date().toISOString(),
        frame_id: frameCountRef.current
      };
      
      wsRef.current.send(JSON.stringify(payload));
      
      setStats(prev => ({
        ...prev,
        framesSent: frameCountRef.current
      }));
      
      return true;
      
    } catch (error) {
      console.error('Frame send error:', error);
      return false;
    }
  };

  const startFrameProcessing = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => {
      if (!detectionActiveRef.current || !mountedRef.current) {
        return;
      }

      if (!videoReadyRef.current) {
        return;
      }
      
      captureAndSendFrame();
    }, 1000); // Send frame every second
  };

  const startCamera = async () => {
    if (!apiConnected) {
      setCameraError('API not connected');
      return;
    }

    try {
      setIsLoading(true);
      setCameraError('');
      setVideoReady(false);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 }
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
                console.log('📹 Video ready for capture');
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
      
      await setupWebSocket();
      
      setIsDetectionActive(true);
      detectionActiveRef.current = true;
      
      setTimeout(() => {
        if (mountedRef.current && videoReadyRef.current) {
          startFrameProcessing();
          console.log('🚀 Live detection started');
        }
      }, 2000);
      
    } catch (error) {
      console.error('Camera start error:', error);
      setCameraError(error.message);
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

  // Test notification system
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

      {/* Debug Panel (for development) */}
      <div style={{ 
        backgroundColor: '#fff3cd', 
        border: '1px solid #ffeaa7',
        borderRadius: '6px',
        padding: '1rem',
        marginBottom: '1rem',
        display: 'none' // Set to 'block' for debugging
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

      {/* Notification Integration Status */}
      <div style={{
        backgroundColor: '#e8f4fd',
        border: '1px solid #b3d9ff',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <h4 style={{ color: '#0056b3', marginBottom: '15px' }}>🔔 Notification Integration Status</h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div style={{
            backgroundColor: 'white',
            padding: '15px',
            borderRadius: '8px',
            border: '1px solid #b3d9ff'
          }}>
            <div style={{ fontWeight: 'bold', color: '#0056b3', marginBottom: '8px', fontSize: '1rem' }}>
              📺 Live Detection
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '8px' }}>
              Real-time camera feed analysis with instant alerts
            </div>
            <div style={{ 
              fontSize: '0.8rem', 
              color: isDetectionActive ? '#28a745' : '#6c757d',
              fontWeight: 'bold'
            }}>
              Status: {isDetectionActive ? 'ACTIVE' : 'INACTIVE'}
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '15px',
            borderRadius: '8px',
            border: '1px solid #b3d9ff'
          }}>
            <div style={{ fontWeight: 'bold', color: '#0056b3', marginBottom: '8px', fontSize: '1rem' }}>
              🚨 Alert System
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '8px' }}>
              Cross-platform notification alerts
            </div>
            <div style={{ 
              fontSize: '0.8rem', 
              color: window.GlobalNotificationSystem ? '#28a745' : '#dc3545',
              fontWeight: 'bold'
            }}>
              Status: {window.GlobalNotificationSystem ? 'CONNECTED' : 'DISCONNECTED'}
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '15px',
            borderRadius: '8px',
            border: '1px solid #b3d9ff'
          }}>
            <div style={{ fontWeight: 'bold', color: '#0056b3', marginBottom: '8px', fontSize: '1rem' }}>
              💾 Data Storage
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '8px' }}>
              Results & alerts saved permanently
            </div>
            <div style={{ 
              fontSize: '0.8rem', 
              color: '#28a745',
              fontWeight: 'bold'
            }}>
              Status: OPERATIONAL
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
            <strong>Live Detection Features:</strong>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>
            • Real-time accident detection with instant alerts<br/>
            • All detections automatically saved to Results page<br/>
            • High-confidence detections trigger notification alerts<br/>
            • Cross-tab synchronization for multi-window usage<br/>
            • Persistent storage with full history tracking
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
          <div><strong>Model:</strong> MobileNetV2-based accident detection</div>
          <div><strong>Input Size:</strong> 128x128 pixels</div>
          <div><strong>Frame Rate:</strong> 1 FPS (1 frame per second)</div>
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