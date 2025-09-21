// app/live/hooks/useWebSocket.js
import { useState, useRef, useCallback, useEffect } from 'react';
import { apiClient, getWebSocketUrl } from '../../../lib/api';

export const useWebSocket = () => {
  const [wsConnected, setWsConnected] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);
  const [connectionError, setConnectionError] = useState('');

  const wsRef = useRef(null);
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    checkApiConnection();
    
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, []);

  const checkApiConnection = useCallback(async () => {
    try {
      const health = await apiClient.healthCheck();
      
      if (health.fallback) {
        setApiConnected(false);
        setConnectionError('Cannot connect to backend server. Please ensure the backend is running.');
      } else {
        setApiConnected(true);
        setConnectionError('');
      }
    } catch (error) {
      setApiConnected(false);
      setConnectionError(`Connection failed: ${error.message}`);
    }
  }, []);

  const setupWebSocket = useCallback((onMessage) => {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = getWebSocketUrl() + '/api/live/ws';
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        const timeout = setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            ws.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);

        ws.onopen = () => {
          clearTimeout(timeout);
          setWsConnected(true);
          setConnectionError('');
          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'connection_established' || 
                data.type === 'ping' || 
                data.type === 'pong') {
              return;
            }
            
            if (data.error) {
              setConnectionError(`Analysis error: ${data.error}`);
              return;
            }
            
            if (onMessage) {
              onMessage(data);
            }
            
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onclose = (event) => {
          clearTimeout(timeout);
          setWsConnected(false);
          
          if (event.code !== 1000) { // Not a normal closure
            setConnectionError('WebSocket connection lost');
          }
        };

        ws.onerror = (error) => {
          clearTimeout(timeout);
          setWsConnected(false);
          setConnectionError('WebSocket connection error');
          reject(error);
        };

      } catch (error) {
        setConnectionError(`Failed to setup WebSocket: ${error.message}`);
        reject(error);
      }
    });
  }, []);

  const sendFrame = useCallback((frameData, frameId) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }

    if (!frameData) return false;

    try {
      const payload = {
        frame: frameData,
        timestamp: new Date().toISOString(),
        frame_id: frameId
      };
      
      wsRef.current.send(JSON.stringify(payload));
      return true;
      
    } catch (error) {
      console.error('Failed to send frame:', error);
      return false;
    }
  }, []);

  const startFrameProcessing = useCallback((captureFrameCallback, onFrameUpdate, onMessage) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => {
      if (!mountedRef.current || !wsConnected) {
        return;
      }
      
      const frameData = captureFrameCallback();
      if (frameData) {
        onFrameUpdate();
        const frameId = onFrameUpdate.current || 0;
        sendFrame(frameData, frameId);
      }
    }, 2000); // Process frame every 2 seconds
  }, [wsConnected, sendFrame]);

  const stopFrameProcessing = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    stopFrameProcessing();
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmounting');
      wsRef.current = null;
    }
    
    setWsConnected(false);
  }, [stopFrameProcessing]);

  const closeConnection = useCallback(() => {
    cleanup();
  }, [cleanup]);

  return {
    wsConnected,
    apiConnected,
    connectionError,
    wsRef,
    checkApiConnection,
    setupWebSocket,
    sendFrame,
    startFrameProcessing,
    stopFrameProcessing,
    closeConnection
  };
};
