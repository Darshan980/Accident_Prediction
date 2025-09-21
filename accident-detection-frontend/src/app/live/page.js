// app/live/page.js - Truly Simplified Live Detection
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
          setResults(prev => [{
            id: Date.now(),
            type: data.accident_detected ? 'Accident' : 'Normal',
            confidence: Math.round(data.confidence * 100),
            time: new Date().toLocaleTimeString()
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
      <h1 style={styles.title}>🚨 Live Detection</h1>

      {/* Video */}
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
            <div style={styles.icon}>📹</div>
            <p>Tap Start to begin</p>
          </div>
        )}

        {isActive && (
          <>
            <div style={styles.liveBadge}>
              <span style={styles.dot}></span>
              LIVE
            </div>
            <div style={styles.frameCount}>Frame: {frameCount}</div>
            <button 
              style={styles.switchBtn} 
              onClick={switchCamera}
              disabled={switching}
            >
              {switching ? '🔄' : facingMode === 'user' ? '📷' : '🤳'}
            </button>
          </>
        )}
      </div>

      {/* Current Detection */}
      {detection && (
        <div style={{
          ...styles.detectionCard,
          backgroundColor: detection.accident_detected ? '#ff5252' : '#4caf50'
        }}>
          <span style={styles.detectionIcon}>
            {detection.accident_detected ? '🚨' : '✅'}
          </span>
          <div>
            <div style={styles.detectionText}>
              {detection.accident_detected ? 'ACCIDENT DETECTED' : 'NORMAL TRAFFIC'}
            </div>
            <div style={styles.confidence}>
              {(detection.confidence * 100).toFixed(1)}% confidence
            </div>
          </div>
        </div>
      )}

      {/* Recent Results */}
      {results.length > 0 && (
        <div style={styles.resultsBox}>
          <h3 style={styles.resultsTitle}>Recent Results</h3>
          {results.map(result => (
            <div key={result.id} style={styles.resultItem}>
              <span>{result.type === 'Accident' ? '🚨' : '✅'}</span>
              <span>{result.type}</span>
              <span>{result.confidence}%</span>
              <span style={styles.time}>{result.time}</span>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={styles.error}>⚠️ {error}</div>
      )}

      {/* Controls */}
      <div style={styles.controls}>
        <button 
          style={{...styles.btn, ...styles.startBtn}} 
          onClick={startDetection}
          disabled={isActive}
        >
          {isActive ? '✅ Active' : '🚀 Start'}
        </button>
        <button 
          style={{...styles.btn, ...styles.stopBtn}} 
          onClick={stopDetection}
          disabled={!isActive}
        >
          🛑 Stop
        </button>
      </div>

      {/* Navigation */}
      <div style={styles.nav}>
        <Link href="/results" style={styles.navBtn}>📊 Results</Link>
        <Link href="/notification" style={styles.navBtn}>🔔 Alerts</Link>
        <Link href="/" style={styles.navBtn}>← Home</Link>
      </div>
    </div>
  );
};

// Simplified styles
const styles = {
  container: {
    padding: '1rem',
    maxWidth: '500px',
    margin: '0 auto',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontFamily: 'system-ui, sans-serif'
  },

  title: {
    textAlign: 'center',
    margin: '0 0 1.5rem 0',
    fontSize: '1.5rem',
    fontWeight: '600'
  },

  videoBox: {
    position: 'relative',
    width: '100%',
    height: '50vh',
    background: '#000',
    borderRadius: '12px',
    overflow: 'hidden',
    marginBottom: '1rem'
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
    textAlign: 'center'
  },

  icon: {
    fontSize: '3rem',
    marginBottom: '0.5rem',
    opacity: 0.7
  },

  liveBadge: {
    position: 'absolute',
    top: '1rem',
    right: '1rem',
    background: '#4caf50',
    padding: '0.5rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },

  dot: {
    width: '6px',
    height: '6px',
    background: 'white',
    borderRadius: '50%',
    animation: 'pulse 1.5s infinite'
  },

  frameCount: {
    position: 'absolute',
    bottom: '1rem',
    left: '1rem',
    background: 'rgba(0,0,0,0.7)',
    padding: '0.3rem 0.6rem',
    borderRadius: '8px',
    fontSize: '0.8rem'
  },

  switchBtn: {
    position: 'absolute',
    bottom: '1rem',
    right: '1rem',
    background: 'rgba(0,0,0,0.8)',
    border: 'none',
    color: 'white',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    fontSize: '1.2rem',
    cursor: 'pointer'
  },

  detectionCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    borderRadius: '12px',
    marginBottom: '1rem'
  },

  detectionIcon: {
    fontSize: '2rem'
  },

  detectionText: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    marginBottom: '0.25rem'
  },

  confidence: {
    opacity: 0.9
  },

  resultsBox: {
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '1rem',
    marginBottom: '1rem'
  },

  resultsTitle: {
    margin: '0 0 0.75rem 0',
    fontSize: '1rem'
  },

  resultItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    fontSize: '0.9rem'
  },

  time: {
    opacity: 0.7,
    fontSize: '0.8rem'
  },

  error: {
    background: 'rgba(255,0,0,0.2)',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    textAlign: 'center'
  },

  controls: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1rem'
  },

  btn: {
    flex: 1,
    padding: '1rem',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer'
  },

  startBtn: {
    background: '#4caf50',
    color: 'white'
  },

  stopBtn: {
    background: '#f44336',
    color: 'white'
  },

  nav: {
    display: 'flex',
    gap: '0.75rem'
  },

  navBtn: {
    flex: 1,
    padding: '0.75rem',
    background: 'rgba(255,255,255,0.1)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    textAlign: 'center',
    fontSize: '0.9rem'
  }
};

export default LiveDetection;
