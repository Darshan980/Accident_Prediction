'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiClient, getApiBaseUrl, getWebSocketUrl } from '../lib/api';
import notificationService from '../lib/notificationService';

const OptimizedLiveDetection = () => {
  const [isDetectionActive, setIsDetectionActive] = useState(false);
  const [cameraPermission, setCameraPermission] = useState('not-requested');
  const [cameraError, setCameraError] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);
  const [currentDetection, setCurrentDetection] = useState(null);
  const [detectionResults, setDetectionResults] = useState([]);
  const [stats, setStats] = useState({ 
    totalFrames: 0, 
    framesSent: 0, 
    detectionRate: 0,
    avgProcessingTime: 0,
    connectionUptime: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [alertsTriggered, setAlertsTriggered] = useState(0);
  const [apiUrl, setApiUrl] = useState('');
  const [performanceStats, setPerformanceStats] = useState({});

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
  const connectionStartTimeRef = useRef(0);
  const totalProcessingTimeRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    
    // Set API URL for display
    setApiUrl(getApiBaseUrl());
    
    checkApiConnection();
    checkPerformanceStats();
    initializeNotificationSystem();
    
    // Periodic performance monitoring
    const performanceInterval = setInterval(checkPerformanceStats, 30000); // Every 30 seconds
    
    return () => {
      mountedRef.current = false;
      clearInterval(performanceInterval);
      stopDetection();
    };
  }, []);

  const checkApiConnection = async () => {
    try {
      console.log('🔍 Checking optimized API connection to:', getApiBaseUrl());
      
      const health = await apiClient.healthCheck();
      
      if (health.fallback) {
        setApiConnected(false);
        setCameraError(`Cannot connect to backend server at ${getApiBaseUrl()}. Please ensure the backend is running.`);
        console.error('API connection failed - fallback response:', health);
      } else {
        setApiConnected(true);
        console.log('✅ API connected successfully:', health);
        
        // Update performance stats from health check
        if (health.performance) {
          setPerformanceStats(prev => ({
            ...prev,
            ...health.performance
          }));
        }
        
        setCameraError(''); // Clear any previous errors
      }
    } catch (error) {
      setApiConnected(false);
      setCameraError(`API connection failed: ${error.message}`);
      console.error('API connection error:', error);
    }
  };

  const checkPerformanceStats = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/performance`);
      if (response.ok) {
        const perfData = await response.json();
        setPerformanceStats(perfData);
        console.log('📊 Performance stats updated:', perfData);
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch performance stats:', error.message);
    }
  };

  // Initialize notification system integration
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

  // Enhanced function to save detection result
  const saveToResultsHistory = (data) => {
    try {
      console.log('💾 [LIVE] Saving optimized detection result:', data);

      const historyItem = {
        id: `live-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        filename: `live_frame_${data.frame_id || frameCountRef.current}.jpg`,
        file_size: 0,
        content_type: 'image/jpeg',
        accident_detected: data.accident_detected,
        confidence: data.confidence,
        processing_time: data.processing_time || 0,
        total_processing_time: data.total_processing_time || 0,
        predicted_class: data.predicted_class || 'unknown',
        threshold: 0.5,
        frames_analyzed: 1,
        avg_confidence: data.confidence,
        analysis_type: 'live_optimized',
        location: 'Live Detection Camera',
        weather_conditions: 'Real-time',
        time_of_day: new Date().toLocaleTimeString(),
        notes: `Optimized live detection - Frame ${data.frame_id || frameCountRef.current}`,
        frame_id: data.frame_id || frameCountRef.current,
        detection_source: 'live_camera_optimized',
        performance_metrics: {
          ml_time: data.processing_time,
          total_time: data.total_processing_time,
          decode_time: data.decode_time,
          session_avg: data.session_stats?.avg_processing_time
        }
      };
      
      const existingHistory = JSON.parse(localStorage.getItem('detectionHistory') || '[]');
      existingHistory.unshift(historyItem);
      const trimmedHistory = existingHistory.slice(0, 100);
      localStorage.setItem('detectionHistory', JSON.stringify(trimmedHistory));
      
      setSavedCount(prev => prev + 1);
      console.log('✅ [LIVE] Optimized detection saved to history');
      
      return true;
    } catch (error) {
      console.error('❌ [LIVE] Failed to save optimized detection:', error);
      return false;
    }
  };

  const setupWebSocket = () => {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = getWebSocketUrl() + '/api/live/ws';
        console.log('🔌 Connecting to optimized WebSocket:', wsUrl);
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        connectionStartTimeRef.current = Date.now();

        const timeout = setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            ws.close();
            reject(new Error('WebSocket timeout'));
          }
        }, 15000); // Increased timeout

        ws.onopen = () => {
          clearTimeout(timeout);
          setWsConnected(true);
          console.log('🔗 Optimized WebSocket connected');
          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'connection_established') {
              console.log('✅ Optimized connection established:', data);
              if (data.server_info) {
                setPerformanceStats(prev => ({
                  ...prev,
                  server_info: data.server_info
                }));
              }
              return;
            }
            
            if (data.type === 'ping' || data.type === 'pong') {
              // Handle keepalive with stats
              if (data.stats || data.server_stats) {
                setStats(prev => ({
                  ...prev,
                  ...(data.stats || {}),
                  serverStats: data.server_stats
                }));
              }
              return;
            }
            
            if (data.error) {
              console.error('WebSocket error:', data.error);
              setCameraError(`Analysis error: ${data.error}`);
              return;
            }
            
            // Handle optimized detection results
            if (typeof data.accident_detected !== 'undefined') {
              console.log('📊 [LIVE] Optimized detection result:', data);
              
              setCurrentDetection(data);
              
              // Update performance tracking
              if (data.processing_time) {
                totalProcessingTimeRef.current += data.total_processing_time || data.processing_time;
              }
              
              const newResult = {
                id: `result-${++resultIdRef.current}`,
                timestamp: new Date().toLocaleTimeString(),
                type: data.accident_detected ? 'Accident' : 'Normal',
                confidence: Math.round(data.confidence * 100),
                frameId: data.frame_id,
                predictedClass: data.predicted_class || 'Unknown',
                processingTime: data.processing_time?.toFixed(3) || '0.000',
                totalTime: data.total_processing_time?.toFixed(3) || '0.000'
              };
              
              setDetectionResults(prev => [newResult, ...prev.slice(0, 19)]);
              
              // Save to results history
              const saved = saveToResultsHistory(data);
              if (saved) {
                console.log('✅ [LIVE] Optimized detection saved to results history');
              }
              
              // Enhanced stats update
              if (data.session_stats) {
                setStats(prev => ({
                  ...prev,
                  totalFrames: data.session_stats.total_frames || prev.totalFrames,
                  framesSent: data.frame_number || prev.framesSent,
                  avgProcessingTime: data.session_stats.avg_processing_time || prev.avgProcessingTime,
                  connectionUptime: data.session_stats.connection_uptime || prev.connectionUptime
                }));
              }
              
              // Use the notification service
              const notification = notificationService.notifyLiveDetection(data);
              
              // Play optimized sound feedback
              if (data.accident_detected) {
                notificationService.playAlertSound('accident');
                setAlertsTriggered(prev => prev + 1);
                console.log('🚨 [LIVE] Optimized accident detection - notification:', notification);
              } else {
                notificationService.playAlertSound('completion');
                console.log('✅ [LIVE] Optimized safe result');
              }
            }
            
          } catch (error) {
            console.error('Error parsing optimized WebSocket message:', error);
          }
        };

        ws.onclose = (event) => {
          clearTimeout(timeout);
          setWsConnected(false);
          console.log('🔌 Optimized WebSocket disconnected:', event.code, event.reason);
        };

        ws.onerror = (error) => {
          clearTimeout(timeout);
          setWsConnected(false);
          console.error('Optimized WebSocket error:', error);
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
      console.error('Optimized frame capture error:', error);
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
      
      const payload = {
        frame: frame,
        timestamp: new Date().toISOString(),
        frame_id: frameCountRef.current,
        client_performance: {
          frames_sent: frameCountRef.current,
          connection_uptime: (Date.now() - connectionStartTimeRef.current) / 1000
        }
      };
      
      wsRef.current.send(JSON.stringify(payload));
      
      setStats(prev => ({
        ...prev,
        framesSent: frameCountRef.current
      }));
      
      return true;
      
    } catch (error) {
      console.error('Optimized frame send error:', error);
      return false;
    }
  };

  const startFrameProcessing = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Optimized frame sending rate (every 1.5 seconds to reduce server load)
    intervalRef.current = setInterval(() => {
      if (!detectionActiveRef.current || !mountedRef.current || !videoReadyRef.current) {
        return;
      }
      
      captureAndSendFrame();
    }, 1500); // Slightly slower rate for better performance
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
                console.log('📹 Optimized video ready for capture');
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
          }, 15000); // Increased timeout
        });
      }
      
      setCameraPermission('granted');
      
      await setupWebSocket();
      
      setIsDetectionActive(true);
      detectionActiveRef.current = true;
      
      setTimeout(() => {
        if (mountedRef.current && videoReadyRef.current) {
          startFrameProcessing();
          console.log('🚀 Optimized live detection started');
        }
      }, 2000);
      
    } catch (error) {
      console.error('Optimized camera start error:', error);
      setCameraError(error.message);
      setIsDetectionActive(false);
    } finally {
      setIsLoading(false);
    }
  };

  const stopDetection = () => {
    console.log('🛑 Stopping optimized detection...');
    
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
    totalProcessingTimeRef.current = 0;
    setStats({ 
      totalFrames: 0, 
      framesSent: 0, 
      detectionRate: 0,
      avgProcessingTime: 0,
      connectionUptime: 0
    });
    
    console.log('✅ Optimized detection stopped');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px', fontSize: '2rem', color: '#333' }}>
        Optimized Live Accident Detection v2.3.0
      </h1>

      {/* Enhanced API Connection Status */}
      <div style={{ 
        backgroundColor: apiConnected ? '#d4edda' : '#f8d7da', 
        border: `1px solid ${apiConnected ? '#c3e6cb' : '#f5c6cb'}`,
        borderRadius: '6px',
        padding: '1rem',
        marginBottom: '1rem',
        textAlign: 'center'
      }}>
        <h4 style={{ color: apiConnected ? '#155724' : '#721c24', marginBottom: '0.5rem' }}>
          Backend Connection: {apiConnected ? '✅ Connected (Optimized)' : '❌ Disconnected'}
        </h4>
        <p style={{ color: apiConnected ? '#155724' : '#721c24', margin: 0, fontSize: '0.9rem' }}>
          API URL: {apiUrl}
        </p>
        {performanceStats.version && (
          <p style={{ color: '#155724', margin: '0.5rem 0 0 0', fontSize: '0.8rem' }}>
            Server Version: {performanceStats.version} | 
            Max ML Time: {performanceStats.performance_config?.max_prediction_time}s |
            Thread Pool: {performanceStats.current_stats?.thread_pool?.active_threads}/{performanceStats.performance_config?.thread_pool_size}
          </p>
        )}
        {!apiConnected && (
          <div style={{ marginTop: '0.5rem' }}>
            <button
              onClick={checkApiConnection}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              Retry Connection
            </button>
          </div>
        )}
      </div>

      {/* Enhanced Status Bar with Performance Metrics */}
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
          Detection: {isDetectionActive ? 'Active (Optimized)' : 'Inactive'}
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
        {stats.avgProcessingTime > 0 && (
          <div style={{
            padding: '10px 20px',
            borderRadius: '15px',
            fontSize: '0.9rem',
            backgroundColor: '#e3f2fd',
            color: '#0d47a1'
          }}>
            Avg Time: {stats.avgProcessingTime.toFixed(3)}s
          </div>
        )}
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
              <h3>Optimized Camera Preview</h3>
              <p style={{ color: '#aaa', textAlign: 'center' }}>
                {isLoading ? 'Starting optimized detection...' : 'Click Start to begin'}
              </p>
              <p style={{ color: '#666', fontSize: '0.8rem', marginTop: '10px', textAlign: 'center' }}>
                v2.3.0 - Render Optimized
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
            ● {isDetectionActive ? 'LIVE (OPTIMIZED)' : 'OFFLINE'}
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
              {currentDetection.processing_time && (
                <>
                  <br />
                  {currentDetection.processing_time.toFixed(3)}s
                </>
              )}
            </div>
          )}

          {/* Frame counter and performance */}
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
              Frames: {stats.framesSent}
              {stats.avgProcessingTime > 0 && (
                <span> | Avg: {stats.avgProcessingTime.toFixed(3)}s</span>
              )}
            </div>
          )}

          {/* Performance indicator */}
          {isDetectionActive && performanceStats.current_stats && (
            <div style={{
              position: 'absolute',
              bottom: '10px',
              right: '10px',
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '0.6rem'
            }}>
              Threads: {performanceStats.current_stats.thread_pool?.active_threads || 0}/{performanceStats.performance_config?.thread_pool_size || 2}
            </div>
          )}
        </div>

        {/* Enhanced Detection Status */}
        <div style={{ 
          backgroundColor: currentDetection ? 
            (currentDetection.accident_detected ? '#fff5f5' : '#f0fff4') : '#f8f9fa', 
          border: `2px solid ${currentDetection ? 
            (currentDetection.accident_detected ? '#dc3545' : '#28a745') : '#dee2e6'}`, 
          borderRadius: '12px', 
          padding: '20px'
        }}>
          <h3 style={{ textAlign: 'center', marginBottom: '15px' }}>
            Optimized Detection Status
          </h3>
          
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
              <div style={{ fontSize: '1rem', color: '#666', marginBottom: '8px' }}>
                Confidence: {(currentDetection.confidence * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: '0.8rem', color: '#999', marginBottom: '5px' }}>
                Frame: {currentDetection.frame_id} | Class: {currentDetection.predicted_class}
              </div>
              {currentDetection.processing_time && (
                <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '5px' }}>
                  ML Time: {currentDetection.processing_time.toFixed(3)}s
                </div>
              )}
              {currentDetection.total_processing_time && (
                <div style={{ fontSize: '0.7rem', color: '#666' }}>
                  Total Time: {currentDetection.total_processing_time.toFixed(3)}s
                </div>
              )}
              {currentDetection.session_stats && (
                <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '8px', padding: '5px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '4px' }}>
                  Session Avg: {currentDetection.session_stats.avg_processing_time?.toFixed(3)}s
                  <br />
                  Uptime: {(currentDetection.session_stats.connection_uptime || 0).toFixed(0)}s
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: '2rem', marginBottom: '15px' }}>🤖</div>
              <div style={{ color: '#666' }}>
                {isDetectionActive ? 'Waiting for optimized results...' : 'Detection not active'}
              </div>
              {isDetectionActive && (
                <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '10px' }}>
                  Frames sent: {stats.framesSent}
                  <br />
                  Rate limited processing active
                </div>
              )}
            </div>
          )}
        </div>

        {/* Enhanced Recent Detections */}
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
                  {result.processingTime && (
                    <div style={{ color: '#888', fontSize: '0.7rem', marginTop: '2px' }}>
                      ML: {result.processingTime}s
                      {result.totalTime && ` | Total: ${result.totalTime}s`}
                    </div>
                  )}
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
          {isLoading ? '🔄 Starting Optimized...' : (isDetectionActive ? '✅ Active (Optimized)' : '🚀 Start Optimized Detection')}
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

      {/* Enhanced Performance Stats */}
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
              <div style={{ fontWeight: 'bold', color: '#ffc107' }}>Avg Processing</div>
              <div style={{ fontSize: '1.2rem' }}>
                {stats.avgProcessingTime > 0 ? `${stats.avgProcessingTime.toFixed(3)}s` : 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 'bold', color: '#17a2b8' }}>Results Saved</div>
              <div style={{ fontSize: '1.2rem' }}>{savedCount}</div>
            </div>
            <div>
              <div style={{ fontWeight: 'bold', color: '#dc3545' }}>Alerts Triggered</div>
              <div style={{ fontSize: '1.2rem' }}>{alertsTriggered}</div>
            </div>
            <div>
              <div style={{ fontWeight: 'bold', color: '#6f42c1' }}>Connection Uptime</div>
              <div style={{ fontSize: '1.2rem' }}>
                {stats.connectionUptime > 0 ? `${stats.connectionUptime.toFixed(0)}s` : 'N/A'}
              </div>
            </div>
          </div>
          
          {/* Server Performance Stats */}
          {performanceStats.current_stats && (
            <div style={{ 
              marginTop: '15px', 
              padding: '10px', 
              backgroundColor: 'rgba(0,0,0,0.05)', 
              borderRadius: '6px',
              fontSize: '0.8rem'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Server Status (Render Optimized)</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
                <span>Active Connections: {performanceStats.current_stats.active_websocket_connections || 0}</span>
                <span>Thread Pool: {performanceStats.current_stats.thread_pool?.active_threads || 0}/{performanceStats.performance_config?.thread_pool_size || 2}</span>
                <span>Model: {performanceStats.current_stats.model_loaded ? 'Loaded' : 'Mock'}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Performance Tips */}
      {isDetectionActive && (
        <div style={{
          backgroundColor: '#e3f2fd',
          border: '1px solid #bbdefb',
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '20px',
          fontSize: '0.85rem',
          color: '#0d47a1'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>🚀 Render Optimizations Active:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center' }}>
            <span>✅ Rate Limited Processing</span>
            <span>✅ Memory Optimized</span>
            <span>✅ Timeout Protected</span>
            <span>✅ Enhanced Error Handling</span>
          </div>
        </div>
      )}

      {/* Back to home link */}
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <Link href="/" style={{ color: '#666', textDecoration: 'none' }}>
          ← Back to Home
        </Link>
      </div>
    </div>
  );
};

export default OptimizedLiveDetection;
