import { useState, useEffect, useCallback } from 'react';
import { getDemoAlerts } from '../data/demoData';

export const useAlerts = (useRealTime = true) => {
  const [alerts, setAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [filter, setFilter] = useState('all');
  const [readAlerts, setReadAlerts] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Get API configuration
  const getApiConfig = () => {
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'https://accident-prediction-7i4e.onrender.com';
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    return {
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    };
  };

  // 🚨 NEW: Load live detection logs from localStorage
  const loadLiveDetectionLogs = useCallback(() => {
    try {
      const savedLogs = localStorage.getItem('accidentDashboardLogs');
      if (savedLogs) {
        const parsedLogs = JSON.parse(savedLogs);
        console.log(`📋 Loaded ${parsedLogs.length} live detection logs from localStorage`);
        return parsedLogs;
      }
    } catch (err) {
      console.error('❌ Failed to load live detection logs:', err);
    }
    return [];
  }, []);

  // Fetch alerts from your FastAPI backend + merge with live detection logs
  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let serverAlerts = [];
      
      if (useRealTime) {
        // Try to fetch from server
        try {
          const { baseURL, headers } = getApiConfig();
          const response = await fetch(`${baseURL}/api/dashboard/user/alerts?limit=50&offset=0`, {
            method: 'GET',
            headers,
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              serverAlerts = data.alerts || [];
              setIsConnected(true);
              console.log(`📡 Loaded ${serverAlerts.length} alerts from server`);
            }
          } else if (response.status === 401) {
            throw new Error('Authentication required. Please login.');
          }
        } catch (serverErr) {
          console.warn('⚠️ Server alerts failed, using demo data:', serverErr.message);
          setError(serverErr.message);
          setIsConnected(false);
        }
      }
      
      // Load live detection logs from localStorage
      const liveDetectionLogs = loadLiveDetectionLogs();
      
      // If no server alerts, use demo alerts
      if (serverAlerts.length === 0 && !useRealTime) {
        serverAlerts = getDemoAlerts();
        console.log(`🎭 Using ${serverAlerts.length} demo alerts`);
      }
      
      // 🎯 MERGE: Combine server alerts + live detection logs
      const allAlerts = [...liveDetectionLogs, ...serverAlerts];
      
      // Remove duplicates by ID and sort by timestamp (newest first)
      const uniqueAlerts = allAlerts
        .filter((alert, index, arr) => 
          arr.findIndex(a => a.id === alert.id) === index
        )
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      setAlerts(uniqueAlerts);
      console.log(`✅ Total dashboard alerts: ${uniqueAlerts.length} (${liveDetectionLogs.length} from live + ${serverAlerts.length} from server/demo)`);
      
    } catch (err) {
      console.error('❌ Failed to fetch alerts:', err);
      setError(err.message);
      setIsConnected(false);
      
      // Fallback: Just show live detection logs + demo data
      const liveDetectionLogs = loadLiveDetectionLogs();
      const demoAlerts = getDemoAlerts();
      const fallbackAlerts = [...liveDetectionLogs, ...demoAlerts]
        .filter((alert, index, arr) => 
          arr.findIndex(a => a.id === alert.id) === index
        )
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      setAlerts(fallbackAlerts);
      console.log(`🔄 Fallback: ${fallbackAlerts.length} alerts (${liveDetectionLogs.length} live + ${demoAlerts.length} demo)`);
    } finally {
      setLoading(false);
    }
  }, [useRealTime, loadLiveDetectionLogs]);

  // Initialize data
  useEffect(() => {
    // Load read alerts from localStorage on startup
    try {
      const storedReadAlerts = JSON.parse(localStorage.getItem('readAlerts') || '[]');
      const readAlertsSet = new Set(storedReadAlerts);
      setReadAlerts(readAlertsSet);
    } catch (err) {
      console.error('Failed to load read alerts from localStorage:', err);
    }
    
    fetchAlerts();
    
    // 🚨 NEW: Listen for localStorage changes (when live detection adds new logs)
    const handleStorageChange = (e) => {
      if (e.key === 'accidentDashboardLogs') {
        console.log('📡 Live detection added new log, refreshing dashboard...');
        fetchAlerts();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also check every 10 seconds for new logs (in case storage event doesn't fire)
    const pollInterval = setInterval(() => {
      const currentLogCount = loadLiveDetectionLogs().length;
      const currentLiveAlerts = alerts.filter(alert => alert.source === 'Live Detection Camera');
      
      if (currentLogCount !== currentLiveAlerts.length) {
        console.log('🔄 New live detection logs found, refreshing...');
        fetchAlerts();
      }
    }, 10000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
    };
  }, [fetchAlerts, loadLiveDetectionLogs, alerts]);

  // Set up WebSocket connection for real-time updates
  useEffect(() => {
    if (!useRealTime) return;

    let websocket;
    let reconnectTimeout;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const connectWebSocket = () => {
      try {
        const { baseURL } = getApiConfig();
        const wsUrl = baseURL.replace('http', 'ws') + '/api/dashboard/ws/alerts';
        
        console.log('Connecting to WebSocket:', wsUrl);
        websocket = new WebSocket(wsUrl);

        websocket.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          setError(null);
          reconnectAttempts = 0;
          
          // Send subscription message
          websocket.send(JSON.stringify({
            type: 'subscribe',
            user_info: {
              username: 'current_user' // You can get this from your auth context
            }
          }));
        };

        websocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message:', data);
            
            switch (data.type) {
              case 'connection':
              case 'subscribed':
                console.log('WebSocket subscribed:', data.message);
                break;
                
              case 'new_alert':
                if (data.data) {
                  setAlerts(prev => {
                    // Make sure we don't duplicate live detection logs
                    const exists = prev.find(alert => alert.id === data.data.id);
                    if (exists) return prev;
                    
                    return [data.data, ...prev];
                  });
                  console.log('New alert received:', data.data);
                }
                break;
                
              case 'update_alert':
                if (data.data) {
                  setAlerts(prev => prev.map(alert => 
                    alert.id === data.data.id ? { ...alert, ...data.data } : alert
                  ));
                }
                break;
                
              case 'heartbeat':
                // WebSocket is alive
                break;
                
              case 'pong':
                // Response to ping
                break;
                
              default:
                console.log('Unknown WebSocket message type:', data.type);
            }
          } catch (err) {
            console.error('Error parsing WebSocket data:', err);
          }
        };

        websocket.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
        };

        websocket.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          setIsConnected(false);
          
          // Attempt to reconnect
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
            console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts})`);
            
            reconnectTimeout = setTimeout(connectWebSocket, delay);
          } else {
            console.log('Max reconnection attempts reached');
            setError('WebSocket connection failed. Using polling fallback.');
            // Start polling as fallback
            const pollInterval = setInterval(fetchAlerts, 30000);
            return () => clearInterval(pollInterval);
          }
        };

        // Send ping every 30 seconds to keep connection alive
        const pingInterval = setInterval(() => {
          if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);

        return () => {
          clearInterval(pingInterval);
        };

      } catch (err) {
        console.error('Failed to setup WebSocket:', err);
        setError('WebSocket setup failed. Using polling fallback.');
        // Fallback to polling
        const pollInterval = setInterval(fetchAlerts, 30000);
        return () => clearInterval(pollInterval);
      }
    };

    // Check if WebSocket is available
    if (typeof WebSocket !== 'undefined') {
      connectWebSocket();
    } else {
      // Fallback to polling
      const pollInterval = setInterval(fetchAlerts, 30000);
      return () => clearInterval(pollInterval);
    }

    // Cleanup
    return () => {
      if (websocket) {
        websocket.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [useRealTime, fetchAlerts]);

  // Mark alert as read (with localStorage persistence for live detection logs)
  const markAlertAsRead = useCallback(async (alertId) => {
    const newReadAlerts = new Set(readAlerts);
    newReadAlerts.add(alertId);
    setReadAlerts(newReadAlerts);
    
    // Save to localStorage for persistence
    try {
      const readAlertsArray = JSON.parse(localStorage.getItem('readAlerts') || '[]');
      if (!readAlertsArray.includes(alertId)) {
        readAlertsArray.push(alertId);
        localStorage.setItem('readAlerts', JSON.stringify(readAlertsArray));
      }
    } catch (err) {
      console.error('Failed to save read status to localStorage:', err);
    }
    
    // Optimistically update local state
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, read: true }
        : alert
    ));

    // Update server if using real-time (but not for live detection logs)
    const alert = alerts.find(a => a.id === alertId);
    if (useRealTime && alert && alert.source !== 'Live Detection Camera') {
      try {
        const { baseURL, headers } = getApiConfig();
        const response = await fetch(`${baseURL}/api/dashboard/user/alerts/${alertId}/read`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ read: true })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Alert marked as read:', result);
      } catch (err) {
        console.error('Failed to mark alert as read on server:', err);
        // Revert optimistic update on error
        const revertedReadAlerts = new Set(readAlerts);
        revertedReadAlerts.delete(alertId);
        setReadAlerts(revertedReadAlerts);
        
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, read: false }
            : alert
        ));
        
        // Also revert localStorage
        try {
          const readAlertsArray = JSON.parse(localStorage.getItem('readAlerts') || '[]');
          const updatedArray = readAlertsArray.filter(id => id !== alertId);
          localStorage.setItem('readAlerts', JSON.stringify(updatedArray));
        } catch (storageErr) {
          console.error('Failed to revert localStorage read status:', storageErr);
        }
      }
    }
  }, [readAlerts, useRealTime, alerts]);

  // Check if alert is read (check both React state and localStorage)
  const isAlertRead = useCallback((alert) => {
    if (alert.read) return true;
    if (readAlerts.has(alert.id)) return true;
    
    // Also check localStorage for persistence
    try {
      const storedReadAlerts = JSON.parse(localStorage.getItem('readAlerts') || '[]');
      return storedReadAlerts.includes(alert.id);
    } catch (err) {
      console.error('Failed to check localStorage read status:', err);
      return false;
    }
  }, [readAlerts]);

  // Filter alerts based on current filter
  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'unread') return !alert.read && !readAlerts.has(alert.id);
    if (filter === 'high_priority') return alert.severity === 'high' || alert.severity === 'critical';
    if (filter === 'live_detection') return alert.source === 'Live Detection Camera';
    return true;
  });

  // Calculate unread count (check both React state and localStorage)
  const unreadCount = alerts.filter(alert => {
    if (alert.read) return false;
    if (readAlerts.has(alert.id)) return false;
    
    // Also check localStorage
    try {
      const storedReadAlerts = JSON.parse(localStorage.getItem('readAlerts') || '[]');
      return !storedReadAlerts.includes(alert.id);
    } catch (err) {
      console.error('Failed to check localStorage for unread count:', err);
      return !readAlerts.has(alert.id);
    }
  }).length;

  // Add new alert (for manual additions)
  const addAlert = useCallback(async (newAlert) => {
    // Optimistically add to local state
    setAlerts(prev => [newAlert, ...prev]);

    if (useRealTime) {
      try {
        const { baseURL, headers } = getApiConfig();
        await fetch(`${baseURL}/api/dashboard/alerts`, {
          method: 'POST',
          headers,
          body: JSON.stringify(newAlert)
        });
      } catch (err) {
        console.error('Failed to add alert to server:', err);
        // Revert optimistic update
        setAlerts(prev => prev.filter(alert => alert.id !== newAlert.id));
      }
    }
  }, [useRealTime]);

  // Remove alert
  const removeAlert = useCallback(async (alertId) => {
    // Optimistically remove from local state
    const removedAlert = alerts.find(alert => alert.id === alertId);
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));

    if (useRealTime) {
      try {
        const { baseURL, headers } = getApiConfig();
        await fetch(`${baseURL}/api/dashboard/alerts/${alertId}`, {
          method: 'DELETE',
          headers
        });
      } catch (err) {
        console.error('Failed to remove alert from server:', err);
        // Revert optimistic update
        if (removedAlert) {
          setAlerts(prev => [removedAlert, ...prev]);
        }
      }
    }
  }, [alerts, useRealTime]);

  // Mark all alerts as read
  const markAllAsRead = useCallback(async () => {
    const allAlertIds = new Set(alerts.map(alert => alert.id));
    setReadAlerts(allAlertIds);
    
    // Optimistically update local state
    setAlerts(prev => prev.map(alert => ({ ...alert, read: true })));

    if (useRealTime) {
      try {
        const { baseURL, headers } = getApiConfig();
        await fetch(`${baseURL}/api/dashboard/alerts/mark-all-read`, {
          method: 'PATCH',
          headers
        });
      } catch (err) {
        console.error('Failed to mark all alerts as read on server:', err);
        // Could implement revert logic here if needed
      }
    }
  }, [alerts, useRealTime]);

  // Refresh alerts manually
  const refreshAlerts = useCallback(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // 🚨 NEW: Clear all live detection logs
  const clearLiveDetectionLogs = useCallback(() => {
    try {
      localStorage.removeItem('accidentDashboardLogs');
      setAlerts(prev => prev.filter(alert => alert.source !== 'Live Detection Camera'));
      console.log('✅ Cleared all live detection logs');
    } catch (err) {
      console.error('❌ Failed to clear live detection logs:', err);
    }
  }, []);

  return {
    alerts,
    filteredAlerts,
    selectedAlert,
    setSelectedAlert,
    filter,
    setFilter,
    readAlerts,
    markAlertAsRead,
    isAlertRead,
    unreadCount,
    addAlert,
    removeAlert,
    markAllAsRead,
    refreshAlerts,
    clearLiveDetectionLogs, // 🚨 NEW: Function to clear live logs
    loading,
    error,
    isConnected
  };
};
