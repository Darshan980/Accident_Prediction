// app/live/page.js - Complete integrated component
'use client';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { apiClient, getApiBaseUrl, getWebSocketUrl } from '../lib/api';
import notificationService from '../lib/notificationService';

// Integrated Live Detection Component with Mobile Responsiveness
const LiveDetection = () => {
  // State management
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

  // Refs
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const wsRef = useRef(null);
  const intervalRef = useRef(null);
  const frameCountRef = useRef(0);
  const mountedRef = useRef(true);
  const videoReadyRef = useRef(false);
  const detectionActiveRef = useRef(false);
  const resultIdRef = useRef(0);

  // Initialize component
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
      await setupWebSocket();
      
      setIsDetectionActive(true);
      detectionActiveRef.current = true;
      
      setTimeout(() => {
        if (mountedRef.current && videoReadyRef.current) {
          startFrameProcessing();
        }
      }, 1000);
      
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
    <div style={containerStyle}>
      <h1 style={titleStyle}>
        Live Accident Detection
      </h1>

      {/* Connection Status */}
      {!apiConnected && (
        <div style={connectionStatusStyle}>
          <div style={statusMessageStyle}>
            ⚠️ Detection Service Unavailable
          </div>
          <button onClick={checkApiConnection} style={retryButtonStyle}>
            Retry Connection
          </button>
        </div>
      )}

      {/* Main Content */}
      <div style={mainContentStyle}>
        
        {/* Video Feed */}
        <div style={videoContainerStyle}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{
              ...videoStyle,
              display: isDetectionActive ? 'block' : 'none'
            }}
          />
          
          {!isDetectionActive && (
            <div style={placeholderStyle}>
              <div style={placeholderIconStyle}>📹</div>
              <h3 style={placeholderTitleStyle}>Camera Preview</h3>
              <p style={placeholderTextStyle}>
                {isLoading ? 'Starting detection...' : 'Click Start Detection to begin monitoring'}
              </p>
            </div>
          )}
          
          {/* Live Status */}
          {isDetectionActive && (
            <div style={liveStatusStyle}>
              <div style={pulseDotStyle}></div>
              LIVE
            </div>
          )}

          {/* Detection Result Overlay */}
          {currentDetection && isDetectionActive && (
            <div style={{
              ...detectionOverlayStyle,
              backgroundColor: currentDetection.accident_detected ? 
                'rgba(220, 53, 69, 0.95)' : 'rgba(40, 167, 69, 0.95)'
            }}>
              <div style={detectionHeaderStyle}>
                <span>{currentDetection.accident_detected ? '🚨' : '✅'}</span>
                {currentDetection.accident_detected ? 'ACCIDENT DETECTED' : 'NORMAL TRAFFIC'}
              </div>
              <div style={confidenceTextStyle}>
                Confidence: {(currentDetection.confidence * 100).toFixed(1)}%
              </div>
            </div>
          )}

          {/* Frame Counter */}
          {isDetectionActive && (
            <div style={frameCounterStyle}>
              Frames: {frameCount}
            </div>
          )}
        </div>

        {/* Detection Panel */}
        <div style={panelContainerStyle}>
          {/* Current Detection Status */}
          <div style={{
            ...statusCardStyle,
            backgroundColor: currentDetection ? 
              (currentDetection.accident_detected ? '#fff5f5' : '#f0fff4') : '#f8f9fa',
            borderColor: currentDetection ? 
              (currentDetection.accident_detected ? '#dc3545' : '#28a745') : '#e9ecef'
          }}>
            {currentDetection ? (
              <>
                <div style={statusIconStyle}>
                  {currentDetection.accident_detected ? '🚨' : '✅'}
                </div>
                <div style={{
                  ...statusTitleStyle,
                  color: currentDetection.accident_detected ? '#dc3545' : '#28a745'
                }}>
                  {currentDetection.accident_detected ? 'ACCIDENT DETECTED' : 'NORMAL TRAFFIC'}
                </div>
                <div style={confidenceStyle}>
                  Confidence: {(currentDetection.confidence * 100).toFixed(1)}%
                </div>
                <div style={frameInfoStyle}>
                  Frame: {currentDetection.frame_id}
                </div>
              </>
            ) : (
              <>
                <div style={statusIconStyle}>🤖</div>
                <div style={statusTitleStyle}>
                  {isDetectionActive ? 'Analyzing video feed...' : 'Detection inactive'}
                </div>
                {isDetectionActive && (
                  <div style={frameInfoStyle}>
                    Frames processed: {frameCount}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Recent Results */}
          <div style={resultsCardStyle}>
            <h4 style={resultsTitleStyle}>Recent Results</h4>
            
            <div style={resultsListStyle}>
              {detectionResults.length === 0 ? (
                <div style={noResultsStyle}>
                  No results yet
                </div>
              ) : (
                detectionResults.map((result) => (
                  <div 
                    key={result.id} 
                    style={{
                      ...resultItemStyle,
                      backgroundColor: result.type === 'Accident' ? '#ffe6e6' : '#e6ffe6',
                      borderColor: result.type === 'Accident' ? '#ffb3b3' : '#b3ffb3'
                    }}
                  >
                    <div style={resultHeaderStyle}>
                      <span style={{
                        ...resultTypeStyle,
                        color: result.type === 'Accident' ? '#dc3545' : '#28a745'
                      }}>
                        {result.type === 'Accident' ? '🚨' : '✅'} {result.type}
                      </span>
                      <span style={resultConfidenceStyle}>
                        {result.confidence}%
                      </span>
                    </div>
                    <div style={resultTimestampStyle}>
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
        <div style={errorStyle}>
          <strong>⚠️ {cameraError}</strong>
        </div>
      )}

      {/* Control Buttons */}
      <div style={controlContainerStyle}>
        <button 
          onClick={startCamera}
          disabled={isDetectionActive || isLoading || !apiConnected}
          style={{
            ...controlButtonStyle,
            ...startButtonStyle,
            ...(isDetectionActive || isLoading || !apiConnected ? disabledStyle : {})
          }}
        >
          {isLoading ? '🔄 Starting...' : (isDetectionActive ? '✅ Detection Active' : '🚀 Start Detection')}
        </button>
        
        <button 
          onClick={stopDetection}
          disabled={!isDetectionActive}
          style={{
            ...controlButtonStyle,
            ...stopButtonStyle,
            ...(!isDetectionActive ? disabledStyle : {})
          }}
        >
          🛑 Stop Detection
        </button>
      </div>

      {/* Summary Stats */}
      {(savedCount > 0 || alertsTriggered > 0) && (
        <div style={statsContainerStyle}>
          <div style={statItemStyle}>
            <div style={{...statValueStyle, color: '#007bff'}}>
              {savedCount}
            </div>
            <div style={statLabelStyle}>
              Results Saved
            </div>
          </div>
          <div style={statItemStyle}>
            <div style={{...statValueStyle, color: '#dc3545'}}>
              {alertsTriggered}
            </div>
            <div style={statLabelStyle}>
              Alerts Triggered
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div style={navContainerStyle}>
        <Link href="/results" style={navButtonStyle}>
          📊 View All Results
        </Link>

        <Link 
          href="/notification" 
          style={{
            ...navButtonStyle,
            backgroundColor: alertsTriggered > 0 ? '#dc3545' : '#6c757d'
          }}
        >
          🔔 Notifications
        </Link>

        <Link href="/" style={homeLinkStyle}>
          ← Back to Home
        </Link>
      </div>
    </div>
  );
};

// Styles with mobile responsiveness
const containerStyle = {
  padding: '20px',
  maxWidth: '1200px',
  margin: '0 auto',
  minHeight: '100vh'
};

const titleStyle = {
  textAlign: 'center',
  marginBottom: '30px',
  fontSize: '2.2rem',
  color: '#2c3e50',
  fontWeight: '300'
};

const connectionStatusStyle = {
  backgroundColor: '#fee',
  border: '1px solid #fcc',
  borderRadius: '8px',
  padding: '15px',
  marginBottom: '20px',
  textAlign: 'center'
};

const statusMessageStyle = {
  color: '#c33',
  fontWeight: '500',
  marginBottom: '10px'
};

const retryButtonStyle = {
  backgroundColor: '#007bff',
  color: 'white',
  border: 'none',
  padding: '8px 16px',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '0.9rem'
};

const mainContentStyle = {
  display: 'grid',
  gridTemplateColumns: '2fr 1fr',
  gap: '30px',
  marginBottom: '30px'
};

const videoContainerStyle = {
  backgroundColor: '#000',
  borderRadius: '12px',
  position: 'relative',
  overflow: 'hidden',
  minHeight: '400px',
  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
};

const videoStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover'
};

const placeholderStyle = {
  width: '100%',
  height: '400px',
  backgroundColor: '#1a1a1a',
  color: '#fff',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center'
};

const placeholderIconStyle = {
  fontSize: '4rem',
  marginBottom: '1rem',
  opacity: 0.7
};

const placeholderTitleStyle = {
  margin: '0 0 1rem 0',
  fontWeight: '300'
};

const placeholderTextStyle = {
  color: '#aaa',
  textAlign: 'center',
  margin: 0
};

const liveStatusStyle = {
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
};

const pulseDotStyle = {
  width: '8px',
  height: '8px',
  backgroundColor: 'white',
  borderRadius: '50%',
  animation: 'pulse 1.5s infinite'
};

const detectionOverlayStyle = {
  position: 'absolute',
  top: '15px',
  left: '15px',
  color: 'white',
  padding: '12px 16px',
  borderRadius: '8px',
  fontSize: '0.9rem',
  fontWeight: 'bold'
};

const detectionHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '4px'
};

const confidenceTextStyle = {
  fontSize: '0.8rem',
  opacity: 0.9
};

const frameCounterStyle = {
  position: 'absolute',
  bottom: '15px',
  left: '15px',
  backgroundColor: 'rgba(0,0,0,0.7)',
  color: 'white',
  padding: '8px 12px',
  borderRadius: '6px',
  fontSize: '0.8rem'
};

const panelContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px'
};

const statusCardStyle = {
  border: '2px solid',
  borderRadius: '12px',
  padding: '25px',
  textAlign: 'center',
  minHeight: '200px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center'
};

const statusIconStyle = {
  fontSize: '3.5rem',
  marginBottom: '15px'
};

const statusTitleStyle = {
  fontSize: '1.3rem',
  fontWeight: 'bold',
  marginBottom: '15px'
};

const confidenceStyle = {
  fontSize: '1.1rem',
  color: '#666',
  marginBottom: '10px'
};

const frameInfoStyle = {
  fontSize: '0.9rem',
  color: '#999'
};

const resultsCardStyle = {
  backgroundColor: '#fff',
  border: '1px solid #e9ecef',
  borderRadius: '12px',
  padding: '20px'
};

const resultsTitleStyle = {
  margin: '0 0 15px 0',
  color: '#495057'
};

const resultsListStyle = {
  maxHeight: '300px',
  overflowY: 'auto'
};

const noResultsStyle = {
  color: '#6c757d',
  textAlign: 'center',
  padding: '30px 0'
};

const resultItemStyle = {
  padding: '12px',
  marginBottom: '8px',
  borderRadius: '8px',
  border: '1px solid',
  fontSize: '0.9rem'
};

const resultHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '4px'
};

const resultTypeStyle = {
  fontWeight: 'bold'
};

const resultConfidenceStyle = {
  fontSize: '0.8rem',
  color: '#666'
};

const resultTimestampStyle = {
  color: '#666',
  fontSize: '0.8rem'
};

const errorStyle = {
  backgroundColor: '#f8d7da',
  color: '#721c24',
  padding: '15px',
  borderRadius: '8px',
  border: '1px solid #f5c6cb',
  marginBottom: '20px',
  textAlign: 'center'
};

const controlContainerStyle = {
  display: 'flex',
  justifyContent: 'center',
  gap: '20px',
  flexWrap: 'wrap',
  marginBottom: '30px'
};

const controlButtonStyle = {
  border: 'none',
  fontSize: '1.1rem',
  padding: '15px 30px',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: '500',
  transition: 'all 0.2s'
};

const startButtonStyle = {
  backgroundColor: '#28a745',
  color: 'white'
};

const stopButtonStyle = {
  backgroundColor: '#dc3545',
  color: 'white'
};

const disabledStyle = {
  backgroundColor: '#6c757d',
  cursor: 'not-allowed',
  opacity: 0.6
};

const statsContainerStyle = {
  display: 'flex',
  justifyContent: 'center',
  gap: '30px',
  marginBottom: '30px',
  flexWrap: 'wrap'
};

const statItemStyle = {
  textAlign: 'center'
};

const statValueStyle = {
  fontSize: '2rem',
  fontWeight: 'bold'
};

const statLabelStyle = {
  color: '#6c757d',
  fontSize: '0.9rem'
};

const navContainerStyle = {
  display: 'flex',
  justifyContent: 'center',
  gap: '20px',
  flexWrap: 'wrap'
};

const navButtonStyle = {
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
};

const homeLinkStyle = {
  color: '#6c757d',
  textDecoration: 'none',
  fontSize: '1rem',
  padding: '12px 24px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
};

// Add responsive styles via media queries in CSS
const responsiveStyles = `
  <style>
    @media (max-width: 768px) {
      .main-content {
        grid-template-columns: 1fr !important;
        gap: 20px !important;
      }
      .title {
        font-size: 1.8rem !important;
      }
      .video-container {
        min-height: 300px !important;
      }
      .control-container {
        flex-direction: column !important;
        align-items: center !important;
      }
      .nav-container {
        flex-direction: column !important;
        align-items: center !important;
      }
    }
    @media (max-width: 480px) {
      .container {
        padding: 10px !important;
      }
      .title {
        font-size: 1.5rem !important;
      }
      .video-container {
        min-height: 250px !important;
      }
      .status-card {
        padding: 15px !important;
        min-height: 140px !important;
      }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  </style>
`;

export default LiveDetection;
