'use client';
import React, { useState, useEffect, useContext } from 'react';
import { Bell, AlertTriangle, MapPin, Clock, Eye, CheckCircle, RefreshCw, User, Shield } from 'lucide-react';
import './UserDashboard.css'; // Import the CSS file

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
      <div className="loading-container">
        <div className="loading-content">
          <div className="spinner"></div>
          <span className="loading-text">Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-wrapper">
        {/* Error Banner */}
        {error && (
          <div className="error-banner">
            <div className="error-content">
              <span className="error-message">{error}</span>
              <button
                onClick={() => setError(null)}
                className="error-close"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="card dashboard-section">
          <div className="card-header">
            <div>
              <h1>User Dashboard</h1>
              <p className="card-subtitle">
                Welcome back, {user?.username} | {user?.department}
              </p>
            </div>
            <div className="card-actions">
              {/* Connection Status */}
              <div className="status-indicator">
                <div className={`status-dot ${connectionStatus === 'connected' ? 'connected' : 'disconnected'}`}></div>
                <span className="status-text">
                  {connectionStatus === 'connected' ? 'Live' : 'Offline'}
                </span>
              </div>
              
              {/* Refresh Button */}
              <button
                onClick={fetchUserData}
                disabled={refreshing}
                className="btn btn-icon"
              >
                <RefreshCw className={refreshing ? 'animate-spin' : ''} size={20} />
              </button>
              
              {/* Notification Bell */}
              <button
                onClick={requestNotificationPermission}
                className="btn btn-icon"
                style={{ position: 'relative' }}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="notification-badge">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          {stats && (
            <div className="stats-grid">
              <div className="stat-card blue">
                <h3 className="stat-number blue">
                  {stats.user_alerts?.total_alerts || 0}
                </h3>
                <p className="stat-label blue">Total Alerts</p>
              </div>
              <div className="stat-card red">
                <h3 className="stat-number red">
                  {unreadCount}
                </h3>
                <p className="stat-label red">Unread</p>
              </div>
              <div className="stat-card yellow">
                <h3 className="stat-number yellow">
                  {stats.user_alerts?.recent_alerts_24h || 0}
                </h3>
                <p className="stat-label yellow">Last 24h</p>
              </div>
              <div className="stat-card green">
                <h3 className="stat-number green">
                  {stats.system_status?.recent_accidents_24h || 0}
                </h3>
                <p className="stat-label green">System Detections</p>
              </div>
            </div>
          )}
        </div>

        {/* Alert Filters */}
        <div className="card dashboard-section">
          <div className="filters">
            <button
              onClick={() => setFilter('all')}
              className={`filter-btn ${filter === 'all' ? 'active' : 'inactive'}`}
            >
              All Alerts ({alerts.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`filter-btn ${filter === 'unread' ? 'active red' : 'inactive'}`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('high_priority')}
              className={`filter-btn ${filter === 'high_priority' ? 'active yellow' : 'inactive'}`}
            >
              High Priority
            </button>
            <button
              onClick={fetchUserData}
              disabled={refreshing}
              className={`filter-btn ${refreshing ? '' : 'active green'}`}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Alerts List */}
        <div className="dashboard-section">
          {filteredAlerts.length === 0 ? (
            <div className="card empty-state">
              <Bell className="empty-icon" />
              <h3 className="empty-title">No Alerts</h3>
              <p className="empty-description">
                {filter === 'unread' ? 'No unread alerts' : 
                 filter === 'high_priority' ? 'No high priority alerts' : 
                 'No alerts to display'}
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`alert-card ${
                  alert.accident_log?.severity_estimate === 'high' 
                    ? 'high-severity' 
                    : alert.accident_log?.severity_estimate === 'medium' 
                    ? 'medium-severity' 
                    : 'low-severity'
                } ${!isAlertRead(alert) ? 'unread' : ''}`}
              >
                <div className="alert-content">
                  <div className="alert-main">
                    <div className="alert-icon">
                      {getAlertIcon(alert.alert_type, alert.accident_log?.severity_estimate)}
                    </div>
                    <div className="alert-details">
                      <div className="alert-header">
                        <h3 className="alert-title">
                          Alert #{alert.id}
                        </h3>
                        {!isAlertRead(alert) && (
                          <span className="alert-badge new">
                            New
                          </span>
                        )}
                        {alert.accident_log?.severity_estimate && (
                          <span className={`alert-badge ${
                            alert.accident_log.severity_estimate === 'high' 
                              ? 'high'
                              : alert.accident_log.severity_estimate === 'medium'
                              ? 'medium'
                              : 'low'
                          }`}>
                            {alert.accident_log.severity_estimate.toUpperCase()} SEVERITY
                          </span>
                        )}
                      </div>
                      <p className="alert-message">{alert.message}</p>
                      <div className="alert-meta">
                        <div className="alert-meta-item">
                          <MapPin size={14} />
                          <span>{alert.accident_log?.location || 'Unknown Location'}</span>
                        </div>
                        <div className="alert-meta-item">
                          <Clock size={14} />
                          <span>{formatTimestamp(alert.sent_at)}</span>
                        </div>
                        {alert.accident_log?.confidence && (
                          <div className="alert-meta-item">
                            <span>
                              Confidence: {(alert.accident_log.confidence * 100).toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="alert-actions">
                    {alert.accident_log?.snapshot_url && (
                      <button
                        onClick={() => setSelectedAlert(alert)}
                        className="btn btn-secondary"
                      >
                        <Eye size={16} />
                        View
                      </button>
                    )}
                    {!isAlertRead(alert) && (
                      <button
                        onClick={() => markAlertAsRead(alert.id)}
                        className="btn btn-primary"
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
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="card-content">
                <div className="modal-header">
                  <h3 className="modal-title">
                    Alert Details - #{selectedAlert.id}
                  </h3>
                  <button
                    onClick={() => setSelectedAlert(null)}
                    className="modal-close"
                  >
                    ×
                  </button>
                </div>
                
                <div>
                  <div className="modal-section">
                    <h4 className="modal-section-title">Alert Information</h4>
                    <div className="modal-info">
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
                    <div className="modal-section">
                      <h4 className="modal-section-title">Incident Details</h4>
                      <div className="modal-info">
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
                    <div className="modal-section">
                      <h4 className="modal-section-title">Snapshot</h4>
                      <div className="modal-image-placeholder">
                        <div className="modal-image-box">
                          <span className="modal-image-text">Image placeholder</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="modal-actions">
                  {!isAlertRead(selectedAlert) && (
                    <button
                      onClick={() => {
                        markAlertAsRead(selectedAlert.id);
                        setSelectedAlert(null);
                      }}
                      className="btn btn-primary"
                    >
                      Mark as Read
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedAlert(null)}
                    className="btn btn-secondary"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="card dashboard-section">
          <h3 className="modal-section-title" style={{ marginBottom: '16px' }}>Quick Actions</h3>
          <div className="quick-actions-grid">
            <button className="quick-action-btn green">
              <div className="quick-action-emoji">🔴</div>
              <div className="quick-action-label green">Live Detection</div>
            </button>
            <button
              onClick={fetchUserData}
              disabled={refreshing}
              className={`quick-action-btn ${refreshing ? 'gray' : 'blue'}`}
            >
              <div className="quick-action-emoji">🔄</div>
              <div className={`quick-action-label ${refreshing ? 'disabled' : 'blue'}`}>
                {refreshing ? 'Refreshing...' : 'Refresh Alerts'}
              </div>
            </button>
            <button
              onClick={requestNotificationPermission}
              className="quick-action-btn yellow"
            >
              <div className="quick-action-emoji">🔔</div>
              <div className="quick-action-label yellow">Enable Notifications</div>
            </button>
            <button className="quick-action-btn gray">
              <div className="quick-action-emoji">👤</div>
              <div className="quick-action-label gray">Profile Settings</div>
            </button>
          </div>
        </div>

        {/* Status Footer */}
        <div className="card dashboard-section">
          <div className="status-footer">
            <div className="status-info">
              <span>
                <strong>System Status:</strong> 
                <span className={connectionStatus === 'connected' ? 'status-value online' : 'status-value offline'}>
                  {connectionStatus === 'connected' ? 'Online' : 'Offline'}
                </span>
              </span>
              {stats && (
                <span>
                  <strong>Model Status:</strong> 
                  <span className={stats.system_status?.model_status === 'loaded' ? 'status-value active' : 'status-value inactive'}>
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
