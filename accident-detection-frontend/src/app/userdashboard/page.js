'use client';
import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { Bell, AlertTriangle, MapPin, Clock, Eye, CheckCircle, RefreshCw, User, Shield, Activity, TrendingUp } from 'lucide-react';

// Mock auth context for artifact environment
const AuthContext = React.createContext();
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: { 
        username: 'demo_user', 
        role: 'user', 
        department: 'Engineering',
        email: 'demo@example.com'
      },
      token: 'demo-token'
    };
  }
  return context;
};

const UserDashboard = () => {
  const { user, token } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [wsConnection, setWsConnection] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Use React state instead of localStorage for read alerts
  const [readAlerts, setReadAlerts] = useState(new Set());
  
  // WebSocket reference
  const wsRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const retryCount = useRef(0);
  const maxRetries = 5;

  // API configuration
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://accident-prediction-1-mpm0.onrender.com';
  
  // WebSocket URL
  const WS_URL = API_BASE_URL.replace('http', 'ws') + '/api/dashboard/ws/alerts';

  // Calculate unread count whenever alerts or readAlerts change
  useEffect(() => {
    const unread = alerts.filter(alert => {
      return !alert.read && !readAlerts.has(alert.id);
    }).length;
    
    setUnreadCount(unread);
  }, [alerts, readAlerts]);

  // Initialize component with real API calls
  useEffect(() => {
    loadRealTimeData();
    initializeWebSocket();
    
    // Auto-refresh every 30 seconds if enabled
    const interval = setInterval(() => {
      if (autoRefresh && !refreshing) {
        loadRealTimeData(false); // Silent refresh
      }
    }, 30000);

    return () => {
      clearInterval(interval);
      cleanupWebSocket();
    };
  }, [autoRefresh, refreshing]);

  const loadRealTimeData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    
    try {
      // Fetch alerts and stats in parallel
      const [alertsResponse, statsResponse] = await Promise.all([
        fetchWithAuth('/api/dashboard/user/alerts?limit=50'),
        fetchWithAuth('/api/dashboard/user/dashboard/stats')
      ]);

      if (alertsResponse.success) {
        setAlerts(alertsResponse.alerts);
      }

      if (statsResponse.success) {
        setStats(statsResponse.stats);
      }

      setLastUpdateTime(new Date());
      setConnectionStatus('connected');
      
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
      setConnectionStatus('disconnected');
      
      // Fall back to demo data if API fails
      loadDemoData();
    } finally {
      setLoading(false);
    }
  };

  const fetchWithAuth = async (endpoint) => {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        timeout: 10000, // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
      
    } catch (err) {
      if (err.name === 'AbortError' || err.message.includes('timeout')) {
        throw new Error('Request timeout - please check your connection');
      }
      throw new Error(err.message || 'Network request failed');
    }
  };

  const initializeWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      console.log('Initializing WebSocket connection...');
      wsRef.current = new WebSocket(WS_URL);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setConnectionStatus('connected');
        retryCount.current = 0;
        
        // Send subscription message
        wsRef.current.send(JSON.stringify({
          type: 'subscribe',
          timestamp: new Date().toISOString()
        }));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setConnectionStatus('disconnected');
        
        // Attempt to reconnect with exponential backoff
        if (retryCount.current < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, retryCount.current), 30000);
          retryTimeoutRef.current = setTimeout(() => {
            retryCount.current++;
            initializeWebSocket();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
      };

    } catch (err) {
      console.error('Failed to initialize WebSocket:', err);
      setConnectionStatus('error');
    }
  };

  const cleanupWebSocket = () => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const handleWebSocketMessage = (message) => {
    console.log('WebSocket message received:', message.type);
    
    switch (message.type) {
      case 'new_alert':
      case 'accident_alert':
        // Add new alert to the beginning of the list
        const newAlert = {
          id: message.data.id,
          message: message.data.message,
          timestamp: message.data.timestamp,
          severity: message.data.severity || 'medium',
          read: false,
          type: 'accident_detection',
          confidence: message.data.confidence,
          location: message.data.location,
          snapshot_url: message.data.snapshot_url,
          accident_log_id: message.data.id,
          video_source: message.data.video_source
        };
        
        setAlerts(prev => {
          // Check if alert already exists
          if (prev.some(alert => alert.id === newAlert.id)) {
            return prev;
          }
          return [newAlert, ...prev];
        });
        
        // Show browser notification
        showNotification(newAlert);
        
        // Play alert sound
        playAlertSound();
        
        // Update stats
        setStats(prev => prev ? {
          ...prev,
          total_alerts: prev.total_alerts + 1,
          unread_alerts: prev.unread_alerts + 1,
          last_24h_detections: prev.last_24h_detections + 1
        } : null);
        
        break;
        
      case 'connection':
        console.log('WebSocket connection confirmed');
        break;
        
      case 'subscribed':
        console.log('Subscribed to real-time alerts');
        break;
        
      case 'heartbeat':
        // Update connection info
        setLastUpdateTime(new Date());
        break;
        
      case 'pong':
        // Connection alive
        break;
        
      case 'error':
        console.error('WebSocket error message:', message.message);
        setError(`Real-time connection error: ${message.message}`);
        break;
        
      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  };

  const showNotification = (alert) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('New Accident Alert', {
        body: alert.message,
        icon: '/favicon.ico',
        tag: `alert-${alert.id}`,
        requireInteraction: true,
        data: { alertId: alert.id }
      });
      
      notification.onclick = () => {
        window.focus();
        setSelectedAlert(alert);
        notification.close();
      };
      
      // Auto close after 10 seconds
      setTimeout(() => notification.close(), 10000);
    }
  };

  const playAlertSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Create alert sound pattern
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Could not play alert sound:', error);
    }
  };

  const loadDemoData = () => {
    console.log('Loading demo data as fallback...');
    
    const demoAlerts = [
      {
        id: 1,
        message: "High confidence accident detected at Main Street intersection",
        timestamp: new Date().toISOString(),
        severity: 'high',
        read: false,
        type: 'accident_detection',
        confidence: 0.92,
        location: 'Main Street & 5th Avenue',
        snapshot_url: '/api/snapshots/accident_001.jpg',
        accident_log_id: 1
      },
      {
        id: 2,
        message: "Medium confidence incident detected at Highway 101",
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        severity: 'medium',
        read: false,
        type: 'accident_detection',
        confidence: 0.75,
        location: 'Highway 101, Mile 45',
        snapshot_url: '/api/snapshots/accident_002.jpg',
        accident_log_id: 2
      }
    ];

    const demoStats = {
      total_alerts: demoAlerts.length,
      unread_alerts: demoAlerts.filter(a => !a.read).length,
      last_24h_detections: 8,
      user_uploads: 12,
      user_accuracy: "94.5%",
      department: user?.department || 'Demo',
      last_activity: new Date().toISOString(),
      user_since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    setAlerts(demoAlerts);
    setStats(demoStats);
  };

  const fetchUserData = async () => {
    setRefreshing(true);
    await loadRealTimeData(false);
    setRefreshing(false);
  };

  const markAlertAsRead = async (alertId) => {
    try {
      // Optimistically update UI
      const newReadAlerts = new Set(readAlerts);
      newReadAlerts.add(alertId);
      setReadAlerts(newReadAlerts);
      
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, read: true, read_at: new Date().toISOString() }
          : alert
      ));
      
      // Make API call
      const response = await fetchWithAuth(`/api/dashboard/user/alerts/${alertId}/read`);
      
      if (!response.success) {
        throw new Error('Failed to mark alert as read');
      }
      
      console.log(`Alert ${alertId} marked as read successfully`);
      
    } catch (err) {
      console.error('Error marking alert as read:', err);
      
      // Revert optimistic update on error
      setReadAlerts(prev => {
        const updated = new Set(prev);
        updated.delete(alertId);
        return updated;
      });
      
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, read: false, read_at: undefined }
          : alert
      ));
      
      setError('Failed to mark alert as read. Please try again.');
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications');
      return;
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        alert('Browser notifications enabled! You will now receive real-time alerts.');
        
        // Send test notification
        new Notification('Notifications Enabled', {
          body: 'You will now receive real-time accident alerts',
          icon: '/favicon.ico'
        });
      } else {
        alert('Notifications permission denied. Please enable in browser settings.');
      }
    } else if (Notification.permission === 'granted') {
      alert('Browser notifications are already enabled!');
    } else {
      alert('Notifications are blocked. Please enable them in your browser settings.');
    }
  };

  const sendHeartbeat = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'ping',
        timestamp: new Date().toISOString()
      }));
    }
  }, []);

  // Send periodic heartbeat
  useEffect(() => {
    const heartbeatInterval = setInterval(sendHeartbeat, 30000);
    return () => clearInterval(heartbeatInterval);
  }, [sendHeartbeat]);

  const getAlertIcon = (alertType, severity) => {
    if (severity === 'high' || alertType === 'high_confidence') {
      return <AlertTriangle className="text-red-500" size={20} />;
    }
    return <Bell className="text-blue-500" size={20} />;
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'disconnected': return 'bg-red-500';
      case 'error': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Live';
      case 'disconnected': return 'Offline';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'unread') return !alert.read && !readAlerts.has(alert.id);
    if (filter === 'high_priority') return alert.severity === 'high';
    return true;
  });

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown time';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const isAlertRead = (alert) => {
    return alert.read || readAlerts.has(alert.id);
  };

  if (loading && alerts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <span className="mt-4 text-gray-600 block">Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-red-800 text-sm">{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-red-800 hover:text-red-900 font-bold text-lg leading-none"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Real-time Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {user?.username} | {user?.department}
              </p>
            </div>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              {/* Auto Refresh Toggle */}
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                <span>Auto-refresh</span>
              </label>
              
              {/* Connection Status */}
              <div className="flex items-center space-x-2 text-sm">
                <div className={`w-3 h-3 rounded-full ${getConnectionStatusColor()}`}></div>
                <span className="text-gray-600">{getConnectionStatusText()}</span>
              </div>
              
              {/* Last Update */}
              <span className="text-xs text-gray-500">
                Updated: {lastUpdateTime.toLocaleTimeString()}
              </span>
              
              {/* Refresh Button */}
              <button
                onClick={fetchUserData}
                disabled={refreshing}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh data"
              >
                <RefreshCw className={refreshing ? 'animate-spin' : ''} size={20} />
              </button>
              
              {/* Notification Bell */}
              <button
                onClick={requestNotificationPermission}
                className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Manage notifications"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-2xl font-bold text-blue-600">
                  {stats.total_alerts || 0}
                </h3>
                <p className="text-blue-700 text-sm font-medium">Total Alerts</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <h3 className="text-2xl font-bold text-red-600">
                  {unreadCount}
                </h3>
                <p className="text-red-700 text-sm font-medium">Unread</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <h3 className="text-2xl font-bold text-yellow-600">
                  {stats.last_24h_detections || 0}
                </h3>
                <p className="text-yellow-700 text-sm font-medium">Last 24h</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="text-2xl font-bold text-green-600">
                  {stats.user_accuracy || 'N/A'}
                </h3>
                <p className="text-green-700 text-sm font-medium">Accuracy</p>
              </div>
            </div>
          )}
        </div>

        {/* Alert Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all' 
                  ? 'bg-blue-100 text-blue-800 border-2 border-blue-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Alerts ({alerts.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'unread' 
                  ? 'bg-red-100 text-red-800 border-2 border-red-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('high_priority')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'high_priority' 
                  ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              High Priority
            </button>
            <button
              onClick={fetchUserData}
              disabled={refreshing}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                refreshing 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-green-100 text-green-800 hover:bg-green-200'
              }`}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-4">
          {filteredAlerts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <Bell className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No Alerts</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filter === 'unread' ? 'No unread alerts' : 
                 filter === 'high_priority' ? 'No high priority alerts' : 
                 'No alerts to display'}
              </p>
              {connectionStatus === 'connected' && (
                <p className="mt-2 text-xs text-green-600">
                  <Activity className="inline w-4 h-4 mr-1" />
                  Real-time monitoring active
                </p>
              )}
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`bg-white rounded-lg shadow-sm border-l-4 p-6 transition-all hover:shadow-md ${
                  alert.severity === 'high' 
                    ? 'border-red-500 bg-red-50' 
                    : alert.severity === 'medium' 
                    ? 'border-yellow-500 bg-yellow-50' 
                    : 'border-blue-500 bg-blue-50'
                } ${!isAlertRead(alert) ? 'ring-2 ring-blue-200' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      {getAlertIcon(alert.type, alert.severity)}
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Alert #{alert.id}
                          </h3>
                          {!isAlertRead(alert) && (
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              New
                            </span>
                          )}
                          {alert.severity && (
                            <span className={`px-2 py-1 text-xs font-medium rounded-full uppercase ${
                              alert.severity === 'high' 
                                ? 'bg-red-100 text-red-800'
                                : alert.severity === 'medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {alert.severity} SEVERITY
                            </span>
                          )}
                        </div>
                        <p className="text-gray-700 mt-1">{alert.message}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <MapPin size={14} />
                            <span>{alert.location || 'Unknown Location'}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock size={14} />
                            <span>{formatTimestamp(alert.timestamp)}</span>
                          </div>
                          {alert.confidence && (
                            <div className="flex items-center space-x-1">
                              <TrendingUp size={14} />
                              <span>Confidence: {(alert.confidence * 100).toFixed(1)}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    {alert.snapshot_url && (
                      <button
                        onClick={() => setSelectedAlert(alert)}
                        className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-1"
                      >
                        <Eye size={16} />
                        <span>View</span>
                      </button>
                    )}
                    {!isAlertRead(alert) && (
                      <button
                        onClick={() => markAlertAsRead(alert.id)}
                        className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1"
                      >
                        <CheckCircle size={16} />
                        <span>Mark Read</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Alert Detail Modal */}
        {selectedAlert && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">
                    Alert Details - #{selectedAlert.id}
                  </h3>
                  <button
                    onClick={() => setSelectedAlert(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Alert Information</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                      <p><strong>Message:</strong> {selectedAlert.message}</p>
                      <p><strong>Type:</strong> {selectedAlert.type}</p>
                      <p><strong>Severity:</strong> {selectedAlert.severity}</p>
                      <p><strong>Sent:</strong> {new Date(selectedAlert.timestamp).toLocaleString()}</p>
                      <p><strong>Status:</strong> {isAlertRead(selectedAlert) ? 'Read' : 'Unread'}</p>
                      {selectedAlert.read_at && (
                        <p><strong>Read at:</strong> {new Date(selectedAlert.read_at).toLocaleString()}</p>
                      )}
                      {selectedAlert.confidence && (
                        <p><strong>AI Confidence:</strong> {(selectedAlert.confidence * 100).toFixed(1)}%</p>
                      )}
                      {selectedAlert.video_source && (
                        <p><strong>Video Source:</strong> {selectedAlert.video_source}</p>
                      )}
                    </div>
                  </div>
                  
                  {selectedAlert.location && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Location Details</h4>
                      <div className="bg-gray-50 rounded-lg p-4 text-sm">
                        <p><strong>Location:</strong> {selectedAlert.location}</p>
                      </div>
                    </div>
                  )}
                  
                  {selectedAlert.snapshot_url && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Snapshot</h4>
                      <div className="bg-gray-100 rounded-lg p-8 text-center">
                        <div className="bg-white rounded border-2 border-dashed border-gray-300 p-8">
                          <span className="text-gray-500">Image placeholder - Snapshot would be displayed here</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  {!isAlertRead(selectedAlert) && (
                    <button
                      onClick={() => {
                        markAlertAsRead(selectedAlert.id);
                        setSelectedAlert(null);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Mark as Read
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedAlert(null)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* System Status Footer */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between text-sm">
            <div className="flex flex-col md:flex-row md:items-center md:space-x-6 space-y-2 md:space-y-0">
              <span className="flex items-center space-x-2">
                <strong>Real-time Status:</strong> 
                <span className={`font-medium ${
                  connectionStatus === 'connected' ? 'text-green-600' : 
                  connectionStatus === 'error' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {getConnectionStatusText()}
                </span>
              </span>
              {stats && (
                <span className="flex items-center space-x-2">
                  <strong>Data Source:</strong> 
                  <span className="text-blue-600 font-medium">
                    Live Database
                  </span>
                </span>
              )}
              {wsRef.current?.readyState === WebSocket.OPEN && (
                <span className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-green-500" />
                  <span className="text-green-600 font-medium">Live Monitoring</span>
                </span>
              )}
            </div>
            <div className="mt-2 md:mt-0 text-gray-500">
              Last updated: {lastUpdateTime.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
