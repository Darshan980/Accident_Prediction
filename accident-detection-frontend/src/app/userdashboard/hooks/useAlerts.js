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

  // Fetch alerts from your FastAPI backend
  const fetchAlerts = useCallback(async () => {
    if (!useRealTime) {
      const demoAlerts = getDemoAlerts();
      setAlerts(demoAlerts);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { baseURL, headers } = getApiConfig();
      const response = await fetch(`${baseURL}/api/dashboard/user/alerts?limit=50&offset=0`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please login.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setAlerts(data.alerts || []);
        setIsConnected(true);
        console.log(`Loaded ${data.alerts?.length || 0} alerts from ${data.source || 'unknown'} source`);
      } else {
        throw new Error(data.error || 'Failed to fetch alerts');
      }
      
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
      setError(err.message);
      setIsConnected(false);
      
      // Fallback to demo data on error
      const demoAlerts = getDemoAlerts();
      setAlerts(demoAlerts);
    } finally {
      setLoading(false);
    }
  }, [useRealTime]);

  // Initialize data
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

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
                  setAlerts(prev => [data.data, ...prev]);
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

  // Mark alert as read (with API call to your backend)
  const markAlertAsRead = useCallback(async (alertId) => {
    const newReadAlerts = new Set(readAlerts);
    newReadAlerts.add(alertId);
    setReadAlerts(newReadAlerts);
    
    // Optimistically update local state
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, read: true }
        : alert
    ));

    // Update server if using real-time
    if (useRealTime) {
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
      }
    }
  }, [readAlerts, useRealTime]);

  // Check if alert is read
  const isAlertRead = useCallback((alert) => {
    return alert.read || readAlerts.has(alert.id);
  }, [readAlerts]);

  // Filter alerts based on current filter
  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'unread') return !alert.read && !readAlerts.has(alert.id);
    if (filter === 'high_priority') return alert.severity === 'high';
    return true;
  });

  // Calculate unread count
  const unreadCount = alerts.filter(alert => !alert.read && !readAlerts.has(alert.id)).length;

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
    loading,
    error,
    isConnected
  };
};

