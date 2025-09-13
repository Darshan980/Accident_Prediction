'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiClient, getApiBaseUrl, getWebSocketUrl } from '../lib/api';
import notificationService from '../lib/notificationService';

const CleanLiveDetection = () => {
  const [isDetectionActive, setIsDetectionActive] = useState(false);
  const [cameraPermission, setCameraPermission] = useState('not-requested');
  const [cameraError, setCameraError] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);
  const [currentDetection, setCurrentDetection] = useState(null);
  const [detectionResults, setDetectionResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [alertsTriggered, setAlertsTriggered] = useState(0);
  const [frameCount, setFrameCount] = useState(0);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const wsRef = useRef(null);
  const intervalRef = useRef(null);
  const frameCountRef = useRef(0);
  const mountedRef = useRef(true);
  const videoReadyRef = useRef(false);
  const detectionActiveRef = useRef(false);
  const resultIdRef = useRef(0);

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
      const health = await apiClient.healthCheck();
      
      if (health.fallback) {
        setApiConnected(false);
        setCameraError('Cannot connect to backend server. Please ensure the backend is running.');
      } else {
        setApiConnected(true);
        setCameraError('');
      }
    } catch (error) {
      setApiConnected(false);
      setCameraError(`Connection failed: ${error.message}`);
    }
  };

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

  const saveToResultsHistory = (data) => {
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
      return false;
    }
  };

  const setupWebSocket = () => {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = getWebSocketUrl() + '/api/live/ws';
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        const timeout = setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            ws.close();
            reject(new Error('Connection timeout'));
          }
        }, 10000);

        ws.onopen = () => {
          clearTimeout(timeout);
          setWsConnected(true);
          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'connection_established' || data.type === 'ping' || data.type === 'pong') {
              return;
            }
            
            if (data.error) {
              setCameraError(`Analysis error: ${data.error}`);
              return;
            }
            
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
              
              const notification = notificationService.notifyLiveDetection(data);
              
              if (data.accident_detected) {
                notificationService.playAlertSound('accident');
                setAlertsTriggered(prev => prev + 1);
              } else {
                notificationService.playAlertSound('completion');
              }
            }
            
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        };

        ws.onclose = () => {
          clearTimeout(timeout);
          setWsConnected(false);
        };

        ws.onerror = (error) => {
          clearTimeout(timeout);
          setWsConnected(false);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  };

  const captureFrame = () => {
    if (!videoRef.current) return null;

    const video = videoRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0 || video.readyState < 2 || video.paused || video.ended) {
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
      return null;
    }
  };

  const captureAndSendFrame = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }

    const frame = captureFrame();
    if (!frame) return false;

    try {
      frameCountRef.current++;
      setFrameCount(frameCountRef.current);
      
      const payload = {
        frame: frame,
        timestamp: new Date().toISOString(),
        frame_id: frameCountRef.current
      };
      
      wsRef.current.send(JSON.stringify(payload));
      return true;
      
    } catch (error) {
      return false;
    }
  };

  const startFrameProcessing = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => {
      if (!detectionActiveRef.current || !mountedRef.current || !videoReadyRef.current) {
        return;
      }
      
      captureAndSendFrame();
    }, 2000);
  };

  const startCamera = async () => {
    if (!apiConnected) {
      setCameraError('Cannot connect to detection service');
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
        }
      }, 1000);
      
    } catch (error) {
      setCameraError(error.message);
      setIsDetectionActive(false);
    } finally {
      setIsLoading(false);
    }
  };

  const stopDetection = () => {
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
    frameCountRef.current = 0;
    setFrameCount(0);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px', fontSize: '2.2rem', color: '#2c3e50', fontWeight: '300' }}>
        Live Accident Detection
      </h1>

      {/* Connection Status */}
      {!apiConnected && (
        <div style={{ 
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <div style={{ color: '#c33', fontWeight: '500', marginBottom: '10px' }}>
            ⚠️ Detection Service Unavailable
          </div>
          <button
            onClick={checkApiConnection}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', marginBottom: '30px' }}>
        
        {/* Video Feed */}
        <div style={{ 
          backgroundColor: '#000', 
          borderRadius: '12px', 
          position: 'relative',
          overflow: 'hidden',
          minHeight: '400px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
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
              height: '400px', 
              backgroundColor: '#1a1a1a',
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.7 }}>📹</div>
              <h3 style={{ margin: '0 0 1rem 0', fontWeight: '300' }}>Camera Preview</h3>
              <p style={{ color: '#aaa', textAlign: 'center', margin: 0 }}>
                {isLoading ? 'Starting detection...' : 'Click Start Detection to begin monitoring'}
              </p>
            </div>
          )}
          
          {/* Live Status */}
          {isDetectionActive && (
            <div style={{
              position: 'absolute',
              top: '15px',
              right: '15px',
              backgroundColor: '#28a745',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{ width: '8px', height: '8px', backgroundColor: 'white', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></div>
              LIVE
            </div>
          )}

          {/* Detection Result Overlay */}
          {currentDetection && isDetectionActive && (
            <div style={{
              position: 'absolute',
              top: '15px',
              left: '15px',
              backgroundColor: currentDetection.accident_detected ? 
                'rgba(220, 53, 69, 0.95)' : 'rgba(40, 167, 69, 0.95)',
              color: 'white',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 'bold'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span>{currentDetection.accident_detected ? '🚨' : '✅'}</span>
                {currentDetection.accident_detected ? 'ACCIDENT DETECTED' : 'NORMAL TRAFFIC'}
              </div>
              <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                Confidence: {(currentDetection.confidence * 100).toFixed(1)}%
              </div>
            </div>
          )}

          {/* Frame Counter */}
          {isDetectionActive && (
            <div style={{
              position: 'absolute',
              bottom: '15px',
              left: '15px',
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '0.8rem'
            }}>
              Frames: {frameCount}
            </div>
          )}
        </div>

        {/* Detection Panel */}
        <div>
          {/* Current Detection Status */}
          <div style={{ 
            backgroundColor: currentDetection ? 
              (currentDetection.accident_detected ? '#fff5f5' : '#f0fff4') : '#f8f9fa', 
            border: `2px solid ${currentDetection ? 
              (currentDetection.accident_detected ? '#dc3545' : '#28a745') : '#e9ecef'}`, 
            borderRadius: '12px', 
            padding: '25px',
            marginBottom: '20px',
            textAlign: 'center',
            minHeight: '200px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            {currentDetection ? (
              <>
                <div style={{ fontSize: '3.5rem', marginBottom: '15px' }}>
                  {currentDetection.accident_detected ? '🚨' : '✅'}
                </div>
                <div style={{
                  fontSize: '1.3rem',
                  fontWeight: 'bold',
                  color: currentDetection.accident_detected ? '#dc3545' : '#28a745',
                  marginBottom: '15px'
                }}>
                  {currentDetection.accident_detected ? 'ACCIDENT DETECTED' : 'NORMAL TRAFFIC'}
                </div>
                <div style={{ fontSize: '1.1rem', color: '#666', marginBottom: '10px' }}>
                  Confidence: {(currentDetection.confidence * 100).toFixed(1)}%
                </div>
                <div style={{ fontSize: '0.9rem', color: '#999' }}>
                  Frame: {currentDetection.frame_id}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '3rem', marginBottom: '15px', opacity: 0.5 }}>🤖</div>
                <div style={{ color: '#666', fontSize: '1.1rem' }}>
                  {isDetectionActive ? 'Analyzing video feed...' : 'Detection inactive'}
                </div>
                {isDetectionActive && (
                  <div style={{ fontSize: '0.9rem', color: '#999', marginTop: '10px' }}>
                    Frames processed: {frameCount}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Recent Results */}
          <div style={{ 
            backgroundColor: '#fff', 
            border: '1px solid #e9ecef', 
            borderRadius: '12px', 
            padding: '20px'
          }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#495057' }}>Recent Results</h4>
            
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {detectionResults.length === 0 ? (
                <div style={{ color: '#6c757d', textAlign: 'center', padding: '30px 0' }}>
                  No results yet
                </div>
              ) : (
                detectionResults.map((result) => (
                  <div 
                    key={result.id} 
                    style={{
                      padding: '12px',
                      marginBottom: '8px',
                      borderRadius: '8px',
                      backgroundColor: result.type === 'Accident' ? '#ffe6e6' : '#e6ffe6',
                      border: `1px solid ${result.type === 'Accident' ? '#ffb3b3' : '#b3ffb3'}`,
                      fontSize: '0.9rem'
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '4px'
                    }}>
                      <span style={{ 
                        fontWeight: 'bold', 
                        color: result.type === 'Accident' ? '#dc3545' : '#28a745' 
                      }}>
                        {result.type === 'Accident' ? '🚨' : '✅'} {result.type}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#666' }}>
                        {result.confidence}%
                      </span>
                    </div>
                    <div style={{ color: '#666', fontSize: '0.8rem' }}>
                      {result.timestamp}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {cameraError && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '15px',
          borderRadius: '8px',
          border: '1px solid #f5c6cb',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <strong>⚠️ {cameraError}</strong>
        </div>
      )}

      {/* Control Buttons */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '20px', 
        flexWrap: 'wrap',
        marginBottom: '30px' 
      }}>
        <button 
          onClick={startCamera}
          disabled={isDetectionActive || isLoading || !apiConnected}
          style={{ 
            backgroundColor: (isDetectionActive || isLoading || !apiConnected) ? '#6c757d' : '#28a745', 
            color: 'white',
            border: 'none',
            fontSize: '1.1rem', 
            padding: '15px 30px',
            borderRadius: '8px',
            cursor: (isDetectionActive || isLoading || !apiConnected) ? 'not-allowed' : 'pointer',
            opacity: (isDetectionActive || isLoading || !apiConnected) ? 0.6 : 1,
            fontWeight: '500',
            transition: 'all 0.2s'
          }}
        >
          {isLoading ? '🔄 Starting...' : (isDetectionActive ? '✅ Detection Active' : '🚀 Start Detection')}
        </button>
        
        <button 
          onClick={stopDetection}
          disabled={!isDetectionActive}
          style={{ 
            backgroundColor: !isDetectionActive ? '#6c757d' : '#dc3545', 
            color: 'white',
            border: 'none',
            fontSize: '1.1rem', 
            padding: '15px 30px',
            borderRadius: '8px',
            cursor: !isDetectionActive ? 'not-allowed' : 'pointer',
            opacity: !isDetectionActive ? 0.6 : 1,
            fontWeight: '500',
            transition: 'all 0.2s'
          }}
        >
          🛑 Stop Detection
        </button>
      </div>

      {/* Summary Stats */}
      {(savedCount > 0 || alertsTriggered > 0) && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '30px',
          marginBottom: '30px',
          flexWrap: 'wrap'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', color: '#007bff', fontWeight: 'bold' }}>
              {savedCount}
            </div>
            <div style={{ color: '#6c757d', fontSize: '0.9rem' }}>
              Results Saved
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', color: '#dc3545', fontWeight: 'bold' }}>
              {alertsTriggered}
            </div>
            <div style={{ color: '#6c757d', fontSize: '0.9rem' }}>
              Alerts Triggered
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
        <Link
          href="/results"
          style={{ 
            backgroundColor: '#007bff', 
            color: 'white',
            border: 'none',
            fontSize: '1rem', 
            padding: '12px 24px',
            borderRadius: '6px',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          📊 View All Results
        </Link>

        <Link
          href="/notification"
          style={{ 
            backgroundColor: alertsTriggered > 0 ? '#dc3545' : '#6c757d',
            color: 'white',
            border: 'none',
            fontSize: '1rem', 
            padding: '12px 24px',
            borderRadius: '6px',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          🔔 Notifications
        </Link>

        <Link href="/" style={{ 
          color: '#6c757d', 
          textDecoration: 'none',
          fontSize: '1rem',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          ← Back to Home
        </Link>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default CleanLiveDetection;
