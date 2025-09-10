'use client';
import React, { useState, useEffect, useContext } from 'react';
import { Bell, AlertTriangle, MapPin, Clock, Eye, CheckCircle, RefreshCw, User, Shield } from 'lucide-react';

// Mock auth context for artifact environment
const AuthContext = React.createContext();
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // Fallback auth data for artifact environment
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
  
  // Use React state instead of localStorage for read alerts
  const [readAlerts, setReadAlerts] = useState(new Set());

  // Mock API base URL for demo
  const API_BASE_URL = 'https://accident-prediction-1-mpm0.onrender.com';

  // Calculate unread count whenever alerts or readAlerts change
  useEffect(() => {
    const unread = alerts.filter(alert => {
      return !alert.is_read && !readAlerts.has(alert.id);
    }).length;
    
    setUnreadCount(unread);
  }, [alerts, readAlerts]);

  // Initialize component with mock data
  useEffect(() => {
    loadMockData();
    
    // Simulate periodic updates
    const interval = setInterval(() => {
      if (Math.random() > 0.8) { // 20% chance to add new alert
        addRandomAlert();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const loadMockData = () => {
    setLoading(true);
    
    // Simulate API delay
    setTimeout(() => {
      const mockAlerts = [
        {
          id: 1,
          message: "High confidence accident detected at Main Street intersection",
          sent_at: new Date().toISOString(),
          is_read: false,
          accident_log: {
            confidence: 0.92,
            severity_estimate: 'high',
            location: 'Main Street & 5th Avenue',
            snapshot_url: '/api/snapshots/accident_001.jpg',
            detected_at: new Date().toISOString()
          },
          alert_type: 'high_confidence'
        },
        {
          id: 2,
          message: "Medium confidence incident detected at Highway 101",
          sent_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          is_read: false,
          accident_log: {
            confidence: 0.75,
            severity_estimate: 'medium',
            location: 'Highway 101, Mile 45',
            snapshot_url: '/api/snapshots/accident_002.jpg',
            detected_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
          },
          alert_type: 'medium_confidence'
        },
        {
          id: 3,
          message: "System maintenance completed successfully",
          sent_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          is_read: true,
          accident_log: null,
          alert_type: 'system'
        }
      ];

      const mockStats = {
        user_alerts: {
          total_alerts: mockAlerts.length,
          unread_alerts: mockAlerts.filter(a => !a.is_read).length,
          recent_alerts_24h: mockAlerts.length
        },
        system_status: {
          recent_accidents_24h: 8,
          model_status: 'loaded',
          active_connections: 3
        },
        user_info: {
          username: user.username,
          department: user.department,
          role: user.role
        }
      };

      setAlerts(mockAlerts);
      setStats(mockStats);
      setLoading(false);
      setConnectionStatus('connected');
    }, 1000);
  };

  const addRandomAlert = () => {
    const newAlert = {
      id: Date.now(),
      message: "New accident detected with AI analysis",
      sent_at: new Date().toISOString(),
      is_read: false,
      accident_log: {
        confidence: Math.random() * 0.3 + 0.7, // 0.7 to 1.0
        severity_estimate: Math.random() > 0.5 ? 'high' : 'medium',
        location: `Intersection ${Math.floor(Math.random() * 100)}`,
        snapshot_url: '/api/snapshots/new_accident.jpg',
        detected_at: new Date().toISOString()
      },
      alert_type: 'high_confidence'
    };

    setAlerts(prev => [newAlert, ...prev]);
    
    // Show browser notification if available
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('New Accident Alert', {
        body: newAlert.message,
        icon: '🚨'
      });
    }
    
    playAlertSound();
  };

  const playAlertSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
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

  const fetchUserData = () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setRefreshing(false);
      setError(null);
    }, 1000);
  };

  const markAlertAsRead = (alertId) => {
    // Update local state immediately
    const newReadAlerts = new Set(readAlerts);
    newReadAlerts.add(alertId);
    setReadAlerts(newReadAlerts);
    
    // Update the alerts array
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, is_read: true, read_at: new Date().toISOString() }
        : alert
    ));
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        alert('Browser notifications enabled! You will now receive real-time alerts.');
      }
    } else if (Notification.permission === 'granted') {
      alert('Browser notifications are already enabled!');
    } else {
      alert('Browser notifications are blocked. Please enable them in your browser settings.');
    }
  };

  const getAlertIcon = (alertType, severity) => {
    if (severity === 'high' || alertType === 'high_confidence') {
      return <AlertTriangle className="text-red-500" size={20} />;
    }
    return <Bell className="text-blue-500" size={20} />;
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'unread') return !alert.is_read && !readAlerts.has(alert.id);
    if (filter === 'high_priority') return alert.accident_log?.severity_estimate === 'high';
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
    return alert.is_read || readAlerts.has(alert.id);
  };

  if (loading && alerts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <span className="text-gray-600">Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-red-700">{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700 text-xl font-bold"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">User Dashboard</h1>
              <p className="text-gray-600">
                Welcome back, {user?.username} | {user?.department}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Connection Status */}
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
                <span className="text-sm font-medium text-gray-700">
                  {connectionStatus === 'connected' ? 'Live' : 'Offline'}
                </span>
              </div>
              
              {/* Refresh Button */}
              <button
                onClick={fetchUserData}
                disabled={refreshing}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <RefreshCw className={refreshing ? 'animate-spin' : ''} size={20} />
              </button>
              
              {/* Notification Bell */}
              <button
                onClick={requestNotificationPermission}
                className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-2xl font-bold text-blue-600">
                  {stats.user_alerts?.total_alerts || 0}
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
                  {stats.user_alerts?.recent_alerts_24h || 0}
                </h3>
                <p className="text-yellow-700 text-sm font-medium">Last 24h</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="text-2xl font-bold text-green-600">
                  {stats.system_status?.recent_accidents_24h || 0}
                </h3>
                <p className="text-green-700 text-sm font-medium">System Detections</p>
              </div>
            </div>
          )}
        </div>

        {/* Alert Filters */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Alerts ({alerts.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'unread' 
                  ? 'bg-red-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('high_priority')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'high_priority' 
                  ? 'bg-yellow-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              High Priority
            </button>
            <button
              onClick={fetchUserData}
              disabled={refreshing}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                refreshing 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-4">
          {filteredAlerts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No Alerts</h3>
              <p className="text-gray-500">
                {filter === 'unread' ? 'No unread alerts' : 
                 filter === 'high_priority' ? 'No high priority alerts' : 
                 'No alerts to display'}
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`bg-white rounded-xl shadow-lg p-6 border-l-4 ${
                  alert.accident_log?.severity_estimate === 'high' 
                    ? 'border-red-500' 
                    : alert.accident_log?.severity_estimate === 'medium' 
                    ? 'border-yellow-500' 
                    : 'border-blue-500'
                } ${!isAlertRead(alert) ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1">
                      {getAlertIcon(alert.alert_type, alert.accident_log?.severity_estimate)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Alert #{alert.id}
                        </h3>
                        {!isAlertRead(alert) && (
                          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                            New
                          </span>
                        )}
                        {alert.accident_log?.severity_estimate && (
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            alert.accident_log.severity_estimate === 'high' 
                              ? 'bg-red-100 text-red-800'
                              : alert.accident_log.severity_estimate === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {alert.accident_log.severity_estimate.toUpperCase()} SEVERITY
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700 mb-3">{alert.message}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <MapPin size={14} />
                          <span>{alert.accident_log?.location || 'Unknown Location'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          <span>{formatTimestamp(alert.sent_at)}</span>
                        </div>
                        {alert.accident_log?.confidence && (
                          <div className="flex items-center gap-1">
                            <span>
                              Confidence: {(alert.accident_log.confidence * 100).toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {alert.accident_log?.snapshot_url && (
                      <button
                        onClick={() => setSelectedAlert(alert)}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Eye size={16} />
                        View
                      </button>
                    )}
                    {!isAlertRead(alert) && (
                      <button
                        onClick={() => markAlertAsRead(alert.id)}
                        className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-1"
                      >
                        <CheckCircle size={16} />
                        Mark Read
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">
                    Alert Details - #{selectedAlert.id}
                  </h3>
                  <button
                    onClick={() => setSelectedAlert(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Alert Information</h4>
                    <div className="space-y-2 text-sm">
                      <p><strong>Message:</strong> {selectedAlert.message}</p>
                      <p><strong>Type:</strong> {selectedAlert.alert_type}</p>
                      <p><strong>Sent:</strong> {new Date(selectedAlert.sent_at).toLocaleString()}</p>
                      <p><strong>Status:</strong> {isAlertRead(selectedAlert) ? 'Read' : 'Unread'}</p>
                      {selectedAlert.read_at && (
                        <p><strong>Read at:</strong> {new Date(selectedAlert.read_at).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                  
                  {selectedAlert.accident_log && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Incident Details</h4>
                      <div className="space-y-2 text-sm">
                        <p><strong>Location:</strong> {selectedAlert.accident_log.location}</p>
                        <p><strong>Confidence:</strong> {(selectedAlert.accident_log.confidence * 100).toFixed(1)}%</p>
                        <p><strong>Severity:</strong> {selectedAlert.accident_log.severity_estimate}</p>
                        {selectedAlert.accident_log.detected_at && (
                          <p><strong>Detected at:</strong> {new Date(selectedAlert.accident_log.detected_at).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {selectedAlert.accident_log?.snapshot_url && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Snapshot</h4>
                      <div className="bg-gray-100 rounded-lg p-4 text-center">
                        <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                          <span className="text-gray-500">Image placeholder</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3 mt-6 pt-6 border-t">
                  {!isAlertRead(selectedAlert) && (
                    <button
                      onClick={() => {
                        markAlertAsRead(selectedAlert.id);
                        setSelectedAlert(null);
                      }}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                    >
                      Mark as Read
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedAlert(null)}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button className="p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-center">
              <div className="text-2xl mb-2">🔴</div>
              <div className="text-green-800 font-medium">Live Detection</div>
            </button>
            <button
              onClick={fetchUserData}
              disabled={refreshing}
              className={`p-4 rounded-lg transition-colors text-center ${
                refreshing 
                  ? 'bg-gray-100 text-gray-400' 
                  : 'bg-blue-50 hover:bg-blue-100'
              }`}
            >
              <div className="text-2xl mb-2">🔄</div>
              <div className="text-blue-800 font-medium">
                {refreshing ? 'Refreshing...' : 'Refresh Alerts'}
              </div>
            </button>
            <button
              onClick={requestNotificationPermission}
              className="p-4 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors text-center"
            >
              <div className="text-2xl mb-2">🔔</div>
              <div className="text-yellow-800 font-medium">Enable Notifications</div>
            </button>
            <button className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-center">
              <div className="text-2xl mb-2">👤</div>
              <div className="text-gray-800 font-medium">Profile Settings</div>
            </button>
          </div>
        </div>

        {/* Status Footer */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span>
                <strong>System Status:</strong> 
                <span className={connectionStatus === 'connected' ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                  {connectionStatus === 'connected' ? 'Online' : 'Offline'}
                </span>
              </span>
              {stats && (
                <span>
                  <strong>Model Status:</strong> 
                  <span className={stats.system_status?.model_status === 'loaded' ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                    {stats.system_status?.model_status === 'loaded' ? 'Active' : 'Inactive'}
                  </span>
                </span>
              )}
            </div>
            <div>
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
