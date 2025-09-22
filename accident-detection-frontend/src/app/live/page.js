// app/live/page.js - Professional Live Detection with Color Template
'use client';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

const LiveDetection = () => {
  // Core state - only what we need
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState('');
  const [detection, setDetection] = useState(null);
  const [results, setResults] = useState([]);
  const [frameCount, setFrameCount] = useState(0);
  const [facingMode, setFacingMode] = useState('environment'); // back camera
  const [switching, setSwitching] = useState(false);

  // Refs
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const wsRef = useRef(null);
  const intervalRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => () => cleanup(), []);

  const cleanup = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (wsRef.current) wsRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  };

  const startDetection = async () => {
    try {
      setError('');
      
      // Start camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false
      });
      
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      await videoRef.current.play();

      // Connect WebSocket - Dynamic URL for dev/production
      const isDev = process.env.NODE_ENV === 'development';
      const wsUrl = isDev 
        ? 'ws://localhost:8000/api/live/ws'
        : 'wss://accident-prediction-7i4e.onrender.com/api/live/ws';
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.accident_detected !== undefined) {
          setDetection(data);
          
          // Capture image when accident is detected
          let imageData = null;
          if (data.accident_detected && videoRef.current) {
            try {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              
              // Use full video resolution for saved image
              canvas.width = videoRef.current.videoWidth || 640;
              canvas.height = videoRef.current.videoHeight || 480;
              
              ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
              imageData = canvas.toDataURL('image/jpeg', 0.9); // Higher quality for saving
              
              console.log('Image captured for accident detection');
            } catch (err) {
              console.error('Failed to capture image:', err);
            }
          }
          
          // Save to dashboard (for accidents only)
          if (data.accident_detected) {
            const dashboardEntry = {
              id: Date.now(),
              timestamp: new Date().toISOString(),
              severity: data.confidence > 0.8 ? 'critical' : data.confidence > 0.6 ? 'high' : 'medium',
              title: 'Live Accident Detection',
              description: `Camera detected potential accident with ${(data.confidence * 100).toFixed(1)}% confidence`,
              source: 'Live Detection Camera',
              confidence: data.confidence,
              status: 'active',
              location: 'Camera Feed',
              type: 'accident',
              read: false,
              image: imageData, // Add captured image
              hasImage: !!imageData
            };
            
            try {
              const existingDashboardLogs = JSON.parse(localStorage.getItem('accidentDashboardLogs') || '[]');
              const updatedDashboardLogs = [dashboardEntry, ...existingDashboardLogs.slice(0, 49)];
              localStorage.setItem('accidentDashboardLogs', JSON.stringify(updatedDashboardLogs));
              console.log('Accident logged to dashboard with image');
            } catch (err) {
              console.error('Failed to log to dashboard:', err);
            }

            // INTEGRATE WITH NOTIFICATION SYSTEM
            try {
              if (window.GlobalNotificationSystem && window.GlobalNotificationSystem.triggerAlert) {
                const notificationData = {
                  accident_detected: true,
                  confidence: data.confidence,
                  source: 'Live Detection Camera',
                  location: 'Camera Feed',
                  analysis_type: 'live_detection',
                  filename: `live_frame_${frameCount + 1}.jpg`,
                  timestamp: new Date().toISOString(),
                  image: imageData,
                  frame_id: frameCount + 1,
                  processing_time: data.processing_time || 0,
                  predicted_class: data.predicted_class || 'accident'
                };
                
                window.GlobalNotificationSystem.triggerAlert(notificationData);
                console.log('Accident sent to notification system');
              } else {
                console.warn('GlobalNotificationSystem not available');
              }
            } catch (notificationError) {
              console.error('Failed to send notification:', notificationError);
            }
          }
          
          // Save to results page (for both accidents and normal)
          const resultEntry = {
            id: `live-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            accident_detected: data.accident_detected,
            confidence: data.confidence,
            analysis_type: 'live_detection',
            detection_source: 'live_camera',
            source: 'live',
            filename: `live_frame_${frameCount + 1}.jpg`,
            file_size: 0,
            content_type: 'image/jpeg',
            processing_time: data.processing_time || 0,
            predicted_class: data.predicted_class || 'unknown',
            threshold: 0.5,
            frames_analyzed: 1,
            avg_confidence: data.confidence,
            location: 'Live Detection Camera',
            time_of_day: new Date().toLocaleTimeString(),
            notes: `Live detection - Frame ${frameCount + 1}`,
            frame_id: frameCount + 1,
            image: data.accident_detected ? imageData : null, // Only save images for accidents
            hasImage: data.accident_detected ? !!imageData : false
          };
          
          try {
            const existingResultHistory = JSON.parse(localStorage.getItem('detectionHistory') || '[]');
            const updatedResultHistory = [resultEntry, ...existingResultHistory.slice(0, 99)];
            localStorage.setItem('detectionHistory', JSON.stringify(updatedResultHistory));
            console.log('Detection saved to results history');
          } catch (err) {
            console.error('Failed to save to results:', err);
          }
          
          // Update UI results
          setResults(prev => [{
            id: Date.now(),
            type: data.accident_detected ? 'Accident' : 'Normal',
            confidence: Math.round(data.confidence * 100),
            time: new Date().toLocaleTimeString(),
            hasImage: data.accident_detected ? !!imageData : false
          }, ...prev.slice(0, 4)]);
        }
      };

      // Start frame processing
      intervalRef.current = setInterval(() => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.height = 128;
        ctx.drawImage(videoRef.current, 0, 0, 128, 128);
        
        const frame = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ 
            frame, 
            frame_id: frameCount + 1 
          }));
          setFrameCount(prev => prev + 1);
        }
      }, 2000);

      setIsActive(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const stopDetection = () => {
    cleanup();
    setIsActive(false);
    setDetection(null);
    setFrameCount(0);
  };

  const switchCamera = async () => {
    if (switching) return;
    setSwitching(true);
    
    try {
      // Stop current stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      
      // Switch mode and restart
      const newMode = facingMode === 'user' ? 'environment' : 'user';
      setFacingMode(newMode);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newMode },
        audio: false
      });
      
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      
    } catch (err) {
      setError('Camera switch failed');
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Live Traffic Detection</h1>
        <p style={styles.subtitle}>Real-time accident monitoring system</p>
      </div>

      {/* Video Feed */}
      <div style={styles.videoContainer}>
        <div style={styles.videoBox}>
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline 
            style={styles.video}
          />
          
          {!isActive && (
            <div style={styles.placeholder}>
              <div style={styles.placeholderIcon}>📹</div>
              <p style={styles.placeholderText}>Camera Ready</p>
              <p style={styles.placeholderSubtext}>Click Start Detection to begin monitoring</p>
            </div>
          )}

          {isActive && (
            <>
              <div style={styles.liveBadge}>
                <span style={styles.pulseDot}></span>
                <span style={styles.liveText}>LIVE</span>
              </div>
              <div style={styles.frameCounter}>
                <span style={styles.frameLabel}>Frame:</span>
                <span style={styles.frameNumber}>{frameCount}</span>
              </div>
              <button 
                style={styles.switchCameraBtn} 
                onClick={switchCamera}
                disabled={switching}
                title="Switch Camera"
              >
                {switching ? '⟳' : facingMode === 'user' ? '📷' : '🤳'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Current Detection Status */}
      {detection && (
        <div style={{
          ...styles.detectionStatus,
          backgroundColor: detection.accident_detected ? styles.colors.danger : styles.colors.success,
          borderColor: detection.accident_detected ? '#B91C1C' : '#15803D'
        }}>
          <div style={styles.detectionIcon}>
            {detection.accident_detected ? '🚨' : '✅'}
          </div>
          <div style={styles.detectionInfo}>
            <div style={styles.detectionTitle}>
              {detection.accident_detected ? 'ACCIDENT DETECTED' : 'NORMAL TRAFFIC'}
            </div>
            <div style={styles.detectionConfidence}>
              Confidence: {(detection.confidence * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* Recent Detection History */}
      {results.length > 0 && (
        <div style={styles.resultsSection}>
          <h3 style={styles.sectionTitle}>Recent Detections</h3>
          <div style={styles.resultsList}>
            {results.map((result, index) => (
              <div key={result.id} style={{
                ...styles.resultItem,
                borderBottom: index === results.length - 1 ? 'none' : '1px solid #F3F4F6'
              }}>
                <div style={styles.resultIcon}>
                  {result.type === 'Accident' ? '🚨' : '✅'}
                </div>
                <div style={styles.resultContent}>
                  <span style={styles.resultType}>{result.type}</span>
                  <span style={styles.resultTime}>{result.time}</span>
                </div>
                <div style={styles.resultConfidence}>
                  {result.confidence}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={styles.errorMessage}>
          <span style={styles.errorIcon}>⚠️</span>
          <span style={styles.errorText}>{error}</span>
        </div>
      )}

      {/* Control Buttons */}
      <div style={styles.controlsSection}>
        <button 
          style={isActive ? styles.activeButton : styles.startButton} 
          onClick={startDetection}
          disabled={isActive}
        >
          {isActive ? (
            <>
              <span style={styles.buttonIcon}>✓</span>
              <span>Detection Active</span>
            </>
          ) : (
            <>
              <span style={styles.buttonIcon}>▶</span>
              <span>Start Detection</span>
            </>
          )}
        </button>
        
        <button 
          style={isActive ? styles.stopButton : styles.disabledButton} 
          onClick={stopDetection}
          disabled={!isActive}
        >
          <span style={styles.buttonIcon}>⏹</span>
          <span>Stop Detection</span>
        </button>
      </div>

      {/* Navigation */}
      <div style={styles.navigationSection}>
        <Link href="/results" style={styles.navButton}>
          <span style={styles.navIcon}>📊</span>
          <span>View Results</span>
        </Link>
        <Link href="/notification" style={styles.navButton}>
          <span style={styles.navIcon}>🔔</span>
          <span>Notifications</span>
        </Link>
        <Link href="/" style={styles.navButton}>
          <span style={styles.navIcon}>🏠</span>
          <span>Dashboard</span>
        </Link>
      </div>
    </div>
  );
};

// Professional styling with color template
const styles = {
  colors: {
    primary: '#1E3A8A',      // Navy Blue
    secondary: '#2563EB',     // Medium Blue
    success: '#16A34A',       // Green
    warning: '#D97706',       // Amber
    danger: '#DC2626',        // Red
    neutral: '#F9FAFB',       // Light Gray
    textDark: '#111827',      // Almost Black
    textLight: '#FFFFFF',     // White
    textMuted: '#6B7280',     // Gray
    disabled: '#9CA3AF'       // Gray
  },

  container: {
    minHeight: '100vh',
    backgroundColor: '#F9FAFB',
    fontFamily: '"Inter", "Roboto", "Helvetica Neue", sans-serif',
    color: '#111827',
    padding: '24px',
    maxWidth: '600px',
    margin: '0 auto'
  },

  header: {
    textAlign: 'center',
    marginBottom: '32px',
    paddingBottom: '16px',
    borderBottom: '1px solid #E5E7EB'
  },

  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1E3A8A',
    margin: '0 0 8px 0',
    lineHeight: '1.3'
  },

  subtitle: {
    fontSize: '16px',
    color: '#6B7280',
    margin: '0',
    fontWeight: '400'
  },

  videoContainer: {
    marginBottom: '24px'
  },

  videoBox: {
    position: 'relative',
    width: '100%',
    height: '400px',
    backgroundColor: '#000000',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '2px solid #E5E7EB',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  },

  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },

  placeholder: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    color: '#FFFFFF'
  },

  placeholderIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    opacity: '0.8'
  },

  placeholderText: {
    fontSize: '18px',
    fontWeight: '600',
    margin: '0 0 8px 0'
  },

  placeholderSubtext: {
    fontSize: '14px',
    opacity: '0.7',
    margin: '0'
  },

  liveBadge: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    backgroundColor: '#16A34A',
    color: '#FFFFFF',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
  },

  pulseDot: {
    width: '8px',
    height: '8px',
    backgroundColor: '#FFFFFF',
    borderRadius: '50%',
    animation: typeof window !== 'undefined' ? 'pulse 1.5s ease-in-out infinite' : 'none'
  },

  liveText: {
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '0.5px'
  },

  frameCounter: {
    position: 'absolute',
    bottom: '16px',
    left: '16px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: '#FFFFFF',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500'
  },

  frameLabel: {
    opacity: '0.8'
  },

  frameNumber: {
    fontWeight: '700',
    marginLeft: '4px'
  },

  switchCameraBtn: {
    position: 'absolute',
    bottom: '16px',
    right: '16px',
    backgroundColor: 'rgba(30, 58, 138, 0.9)',
    border: 'none',
    color: '#FFFFFF',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
  },

  detectionStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '24px',
    border: '2px solid',
    color: '#FFFFFF',
    fontWeight: '500'
  },

  detectionIcon: {
    fontSize: '32px',
    flexShrink: 0
  },

  detectionInfo: {
    flex: 1
  },

  detectionTitle: {
    fontSize: '18px',
    fontWeight: '700',
    marginBottom: '4px',
    letterSpacing: '0.5px'
  },

  detectionConfidence: {
    fontSize: '14px',
    opacity: '0.9'
  },

  resultsSection: {
    marginBottom: '24px'
  },

  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: '16px',
    margin: '0 0 16px 0'
  },

  resultsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    overflow: 'hidden'
  },

  resultItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    borderBottom: '1px solid #F3F4F6',
    transition: 'background-color 0.2s ease'
  },

  resultIcon: {
    fontSize: '24px',
    flexShrink: 0
  },

  resultContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },

  resultType: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827'
  },

  resultTime: {
    fontSize: '14px',
    color: '#6B7280'
  },

  resultConfidence: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1E3A8A',
    minWidth: '60px',
    textAlign: 'right'
  },

  errorMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #FECACA',
    marginBottom: '24px'
  },

  errorIcon: {
    fontSize: '20px',
    flexShrink: 0
  },

  errorText: {
    fontSize: '16px',
    fontWeight: '500'
  },

  controlsSection: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px'
  },

  startButton: {
    flex: 1,
    backgroundColor: '#1E3A8A',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    padding: '16px 20px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
  },

  activeButton: {
    flex: 1,
    backgroundColor: '#16A34A',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    padding: '16px 20px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'not-allowed',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    opacity: '0.8'
  },

  stopButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    padding: '16px 20px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
  },

  disabledButton: {
    flex: 1,
    backgroundColor: '#9CA3AF',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    padding: '16px 20px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'not-allowed',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    opacity: '0.6'
  },

  buttonIcon: {
    fontSize: '18px'
  },

  navigationSection: {
    display: 'flex',
    gap: '12px'
  },

  navButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    color: '#1E3A8A',
    textDecoration: 'none',
    border: '2px solid #E5E7EB',
    borderRadius: '8px',
    padding: '16px 12px',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s ease',
    textAlign: 'center'
  },

  navIcon: {
    fontSize: '20px'
  }
};

// Add CSS animations only on client side
useEffect(() => {
  if (typeof document !== 'undefined') {
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
      
      button:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
      }
      
      a:hover {
        background-color: #F3F4F6 !important;
        border-color: #1E3A8A !important;
      }
    `;
    document.head.appendChild(styleSheet);
    
    return () => {
      if (document.head.contains(styleSheet)) {
        document.head.removeChild(styleSheet);
      }
    };
  }
}, []);

export default LiveDetection;
