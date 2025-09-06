'use client';
import React, { useState, useEffect, useContext } from 'react';
import { Bell, AlertTriangle, MapPin, Clock, Eye, CheckCircle, RefreshCw } from 'lucide-react';
import './UserDashboard.css';

// Import your actual auth context - replace this import path with your actual AuthProvider location
// import { useAuth } from '@/contexts/AuthContext'; // Uncomment and use your actual auth context

// Temporary fallback - this should be removed once you import the real auth context
const AuthContext = React.createContext();
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // Try to get user data from localStorage first
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser && storedUser !== 'null') {
        const userData = JSON.parse(storedUser);
        const storedToken = localStorage.getItem('token');
        
        return {
          user: {
            username: userData.username || 'unknown_user',
            role: userData.role || 'user',
            department: userData.department || 'General',
            email: userData.email || 'user@localhost'
          },
          token: storedToken || 'no-token'
        };
      }
    } catch (error) {
      console.error('Error reading user from localStorage:', error);
    }
    
    // Final fallback
    return {
      user: { 
        username: 'guest_user', 
        role: 'user', 
        department: 'General',
        email: 'guest@localhost'
      },
      token: 'no-token'
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
  const [wsConnection, setWsConnection] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  
  // Store read alerts in localStorage to persist across refreshes
  const [readAlerts, setReadAlerts] = useState(() => {
    try {
      const stored = localStorage.getItem('readAlerts');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert array back to Set
        return new Set(Array.isArray(parsed) ? parsed : []);
      }
      return new Set();
    } catch {
      return new Set();
    }
  });

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Save read alerts to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('readAlerts', JSON.stringify(Array.from(readAlerts)));
    } catch (error) {
      console.error('Error saving read alerts to localStorage:', error);
    }
  }, [readAlerts]);

  // Calculate unread count whenever alerts or readAlerts change
  useEffect(() => {
    const unread = alerts.filter(alert => {
      // Check both server-side is_read and local readAlerts
      return !alert.is_read && !readAlerts.has(alert.id);
    }).length;
    
    setUnreadCount(unread);
  }, [alerts, readAlerts]);

  // Initialize WebSocket connection for real-time alerts
  useEffect(() => {
    connectToAlerts();
    fetchUserData();

    // Set up periodic refresh for data that might not come through WebSocket
    const refreshInterval = setInterval(fetchUserData, 60000); // Every minute

    return () => {
      if (wsConnection) {
        wsConnection.close();
      }
      clearInterval(refreshInterval);
    };
  }, []);

  const connectToAlerts = () => {
    try {
      // Fixed WebSocket URL construction
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = API_BASE_URL.replace('http://', '').replace('https://', '');
      const wsUrl = `${wsProtocol}//${wsHost}/ws/alerts`; // Updated endpoint path
      
      console.log('Connecting to WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('Connected to real-time alert system');
        setConnectionStatus('connected');
        setError(null);
        
        // Send authentication if token exists
        if (token && token !== 'sample-token') {
          ws.send(JSON.stringify({
            type: 'auth',
            token: token
          }));
        } else {
          // For demo/development mode
          ws.send(JSON.stringify({
            type: 'auth',
            user: user.username
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleAlertMessage(data);
        } catch (error) {
          console.error('Error parsing alert message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('Alert WebSocket disconnected', event.code, event.reason);
        setConnectionStatus('disconnected');
        
        // Attempt to reconnect after 5 seconds if not a clean close
        if (event.code !== 1000) {
          setTimeout(() => {
            if (connectionStatus !== 'connected') {
              console.log('Attempting to reconnect...');
              connectToAlerts();
            }
          }, 5000);
        }
      };

      ws.onerror = (error) => {
        console.error('Alert WebSocket error:', error);
        setConnectionStatus('error');
        setError('Failed to connect to real-time alerts. Using polling mode.');
      };

      setWsConnection(ws);
    } catch (error) {
      console.error('Failed to connect to alerts:', error);
      setConnectionStatus('error');
      setError('WebSocket connection failed. Using polling mode.');
    }
  };

  const handleAlertMessage = (data) => {
    switch (data.type) {
      case 'new_alert':
        setAlerts(prev => [data.alert, ...prev]);
        
        // Show browser notification if permission granted
        if (Notification.permission === 'granted') {
          new Notification('New Accident Alert', {
            body: data.alert.message || 'New accident detected',
            icon: '/alert-icon.png'
          });
        }
        
        playAlertSound();
        break;
        
      case 'alert_updated':
        setAlerts(prev => prev.map(alert => 
          alert.id === data.alert.id ? data.alert : alert
        ));
        break;
        
      case 'alert_status_changed':
        setAlerts(prev => prev.map(alert => 
          alert.id === data.alert_id 
            ? { ...alert, status: data.status, updated_at: data.timestamp }
            : alert
        ));
        break;
        
      case 'connection_confirmed':
        console.log('Real-time connection confirmed for user:', data.user);
        setConnectionStatus('connected');
        break;
        
      default:
        console.log('Unknown alert message type:', data.type);
    }
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

  const fetchUserData = async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      // Create headers object
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Add authorization header if we have a real token
      if (token && token !== 'sample-token') {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log('Fetching user data with headers:', headers);
      
      // Try to fetch user-specific alerts first
      let alertsData = [];
      let statsData = null;
      
      if (token && token !== 'sample-token') {
        // Authenticated user - try user-specific endpoints
        try {
          const alertsResponse = await fetch(`${API_BASE_URL}/api/user/alerts`, {
            headers: headers
          });
          
          if (alertsResponse.ok) {
            alertsData = await alertsResponse.json();
            console.log('Fetched user alerts:', alertsData.length);
          } else if (alertsResponse.status === 404) {
            console.log('User alerts endpoint not found, falling back to general logs');
            // Fallback to general logs endpoint
            const logsResponse = await fetch(`${API_BASE_URL}/api/logs?limit=50`, {
              headers: { 'Content-Type': 'application/json' }
            });
            if (logsResponse.ok) {
              alertsData = await logsResponse.json();
            }
          } else {
            throw new Error(`Failed to fetch user alerts: ${alertsResponse.status}`);
          }
          
          // Try to fetch user dashboard stats
          const statsResponse = await fetch(`${API_BASE_URL}/api/user/dashboard/stats`, {
            headers: headers
          });
          
          if (statsResponse.ok) {
            statsData = await statsResponse.json();
          } else if (statsResponse.status === 404) {
            console.log('User dashboard stats not found, falling back to general stats');
            // Fallback to general dashboard stats
            const generalStatsResponse = await fetch(`${API_BASE_URL}/api/dashboard/stats`);
            if (generalStatsResponse.ok) {
              const generalStats = await generalStatsResponse.json();
              statsData = {
                user_alerts: {
                  total_alerts: alertsData.length,
                  unread_alerts: alertsData.filter(alert => !alert.is_read && !readAlerts.has(alert.id)).length,
                  recent_alerts_24h: alertsData.filter(alert => 
                    new Date(alert.timestamp || alert.created_at) > new Date(Date.now() - 24*60*60*1000)
                  ).length
                },
                system_status: {
                  recent_accidents_24h: generalStats.recent_activity?.accidents_24h || 0,
                  model_status: generalStats.model_status || 'unknown',
                  active_connections: generalStats.active_connections || 0
                },
                user_info: {
                  username: user.username,
                  department: user.department,
                  role: user.role
                }
              };
            }
          }
        } catch (authError) {
          console.log('Authenticated endpoints failed:', authError);
          // Fall back to public endpoints
        }
      }
      
      // If we don't have data yet, try public endpoints
      if (alertsData.length === 0) {
        try {
          console.log('Trying public logs endpoint');
          const logsResponse = await fetch(`${API_BASE_URL}/api/logs?limit=50`, {
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (logsResponse.ok) {
            const logsData = await logsResponse.json();
            // Convert logs to alerts format
            alertsData = logsData.map(log => ({
              id: log.id,
              message: `${log.accident_detected ? 'Accident detected' : 'No accident'} with ${(log.confidence * 100).toFixed(1)}% confidence`,
              sent_at: log.timestamp,
              is_read: false, // Default to unread, will be overridden by local storage
              accident_log: {
                confidence: log.confidence,
                severity_estimate: log.severity_estimate,
                location: log.location || 'Unknown Location',
                snapshot_url: log.snapshot_url,
                detected_at: log.timestamp
              },
              alert_type: log.accident_detected ? 'high_confidence' : 'low_confidence'
            }));
            console.log('Converted logs to alerts:', alertsData.length);
          } else {
            throw new Error(`Failed to fetch logs: ${logsResponse.status}`);
          }
        } catch (logsError) {
          console.error('Failed to fetch logs:', logsError);
          throw logsError;
        }
      }
      
      // Apply local read status to alerts
      alertsData = alertsData.map(alert => ({
        ...alert,
        is_read: alert.is_read || readAlerts.has(alert.id)
      }));
      
      // If we don't have stats yet, try public stats endpoint
      if (!statsData) {
        try {
          const statsResponse = await fetch(`${API_BASE_URL}/api/dashboard/stats`);
          if (statsResponse.ok) {
            const generalStats = await statsResponse.json();
            const unreadAlertsCount = alertsData.filter(alert => !alert.is_read && !readAlerts.has(alert.id)).length;
            
            statsData = {
              user_alerts: {
                total_alerts: alertsData.length,
                unread_alerts: unreadAlertsCount,
                recent_alerts_24h: alertsData.filter(alert => 
                  new Date(alert.sent_at || alert.timestamp) > new Date(Date.now() - 24*60*60*1000)
                ).length
              },
              system_status: {
                recent_accidents_24h: generalStats.recent_activity?.accidents_24h || 0,
                model_status: generalStats.model_status || 'unknown',
                active_connections: generalStats.active_connections || 0
              },
              user_info: {
                username: user.username,
                department: user.department,
                role: user.role
              }
            };
          }
        } catch (statsError) {
          console.error('Failed to fetch stats:', statsError);
        }
      }
      
      // Update state with fetched data
      setAlerts(alertsData);
      
      if (statsData) {
        setStats(statsData);
      } else {
        // Provide fallback stats
        const unreadAlertsCount = alertsData.filter(alert => !alert.is_read && !readAlerts.has(alert.id)).length;
        
        setStats({
          user_alerts: {
            total_alerts: alertsData.length,
            unread_alerts: unreadAlertsCount,
            recent_alerts_24h: alertsData.filter(alert => 
              new Date(alert.sent_at || alert.timestamp) > new Date(Date.now() - 24*60*60*1000)
            ).length
          },
          system_status: {
            recent_accidents_24h: 0,
            model_status: 'unknown',
            active_connections: 0
          },
          user_info: {
            username: user.username,
            department: user.department,
            role: user.role
          }
        });
      }
      
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError(`Failed to load data: ${error.message}`);
      
      // Set minimal fallback data
      if (alerts.length === 0) {
        setStats({
          user_alerts: {
            total_alerts: 0,
            unread_alerts: 0,
            recent_alerts_24h: 0
          },
          system_status: {
            recent_accidents_24h: 0,
            model_status: 'unknown',
            active_connections: 0
          },
          user_info: {
            username: user.username,
            department: user.department,
            role: user.role
          }
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markAlertAsRead = async (alertId) => {
    try {
      // Immediately update local state and localStorage
      const newReadAlerts = new Set(readAlerts);
      newReadAlerts.add(alertId);
      setReadAlerts(newReadAlerts);
      
      // Update the alerts array
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, is_read: true, read_at: new Date().toISOString() }
          : alert
      ));
      
      // Try to update server-side as well (but don't block on it)
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Add authorization header if we have a real token
      if (token && token !== 'sample-token') {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_BASE_URL}/api/user/alerts/${alertId}/read`, {
        method: 'POST',
        headers: headers
      });
      
      if (response.ok) {
        console.log('Successfully marked alert as read on server');
      } else if (response.status === 404) {
        console.log('Mark as read endpoint not available, using local storage only');
      } else if (response.status === 401) {
        console.warn('Authentication failed for mark as read, using local storage only');
      } else {
        console.warn('Failed to mark alert as read on server, using local storage only');
      }
    } catch (error) {
      console.error('Error marking alert as read:', error);
      // Local state is already updated, so this is fine
    }
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
      return <AlertTriangle className="alert-icon alert-icon-high" />;
    }
    return <Bell className="alert-icon alert-icon-medium" />;
  };

  const getAlertBorderColor = (alert) => {
    if (alert.accident_log?.severity_estimate === 'high') {
      return 'border-red';
    } else if (alert.accident_log?.severity_estimate === 'medium') {
      return 'border-yellow';
    }
    return 'border-blue';
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

  const getConnectionStatusClass = () => {
    switch (connectionStatus) {
      case 'connected': return 'status-connected';
      case 'connecting': return 'status-connecting';
      case 'error': return 'status-error';
      default: return 'status-disconnected';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Live';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Error';
      default: return 'Disconnected';
    }
  };

  // Check if alert is read (either server-side or locally)
  const isAlertRead = (alert) => {
    return alert.is_read || readAlerts.has(alert.id);
  };

  if (loading && alerts.length === 0) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <span className="loading-text">Loading your dashboard...</span>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        {/* Error Banner */}
        {error && (
          <div className="error-banner">
            <div className="error-banner-content">
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="error-close-btn"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="header-card">
          <div className="header-content">
            <div className="header-info">
              <h1 className="header-title">User Dashboard</h1>
              <p className="header-subtitle">
                Welcome back, {user?.username} | {user?.department}
              </p>
            </div>
            <div className="header-actions">
              {/* Connection Status */}
              <div className="connection-status">
                <div className={`status-indicator ${
                  connectionStatus === 'connected' ? 'connected' : 
                  connectionStatus === 'error' ? 'error' : 'disconnected'
                }`}></div>
                <span className={`status-text ${getConnectionStatusClass()}`}>
                  {getConnectionStatusText()}
                </span>
              </div>
              
              {/* Refresh Button */}
              <button
                onClick={fetchUserData}
                disabled={refreshing}
                className="icon-btn"
              >
                <RefreshCw className={`icon ${refreshing ? 'spinning' : ''}`} />
              </button>
              
              {/* Notification Bell */}
              <button
                onClick={requestNotificationPermission}
                className="notification-btn"
              >
                <Bell className="icon" />
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
              <div className="stat-card stat-blue">
                <h3 className="stat-number">
                  {stats.user_alerts?.total_alerts || 0}
                </h3>
                <p className="stat-label">Total Alerts</p>
              </div>
              <div className="stat-card stat-red">
                <h3 className="stat-number">
                  {unreadCount}
                </h3>
                <p className="stat-label">Unread</p>
              </div>
              <div className="stat-card stat-yellow">
                <h3 className="stat-number">
                  {stats.user_alerts?.recent_alerts_24h || 0}
                </h3>
                <p className="stat-label">Last 24h</p>
              </div>
              <div className="stat-card stat-green">
                <h3 className="stat-number">
                  {stats.system_status?.recent_accidents_24h || 0}
                </h3>
                <p className="stat-label">System Detections</p>
              </div>
            </div>
          )}
        </div>

        {/* Alert Filters */}
        <div className="filter-card">
          <div className="filter-buttons">
            <button
              onClick={() => setFilter('all')}
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            >
              All Alerts ({alerts.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('high_priority')}
              className={`filter-btn ${filter === 'high_priority' ? 'active' : ''}`}
            >
              High Priority
            </button>
            <button
              onClick={fetchUserData}
              disabled={refreshing}
              className={`refresh-btn ${refreshing ? 'disabled' : ''}`}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Alerts List */}
        <div className="alerts-container">
          {filteredAlerts.length === 0 ? (
            <div className="no-alerts">
              <Bell className="no-alerts-icon" />
              <h3 className="no-alerts-title">No Alerts</h3>
              <p className="no-alerts-text">
                {filter === 'unread' ? 'No unread alerts' : 
                 filter === 'high_priority' ? 'No high priority alerts' : 
                 'No alerts to display'}
              </p>
              {connectionStatus !== 'connected' && connectionStatus !== 'disabled' && (
                <p className="no-alerts-warning">
                  Real-time updates unavailable. Click refresh to check for new alerts.
                </p>
              )}
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`alert-card ${getAlertBorderColor(alert)} ${
                  !isAlertRead(alert) ? 'unread' : ''
                }`}
              >
                <div className="alert-content">
                  <div className="alert-main">
                    <div className="alert-left">
                      <div className="alert-icon-container">
                        {getAlertIcon(alert.alert_type, alert.accident_log?.severity_estimate)}
                      </div>
                      <div className="alert-details">
                        <div className="alert-header">
                          <h3 className="alert-title">
                            Alert #{alert.id}
                          </h3>
                          {!isAlertRead(alert) && (
                            <span className="badge badge-new">New</span>
                          )}
                          <span className={`badge severity-${alert.accident_log?.severity_estimate || 'low'}`}>
                            {alert.accident_log?.severity_estimate?.toUpperCase() || 'LOW'} SEVERITY
                          </span>
                        </div>
                        <p className="alert-message">{alert.message}</p>
                        <div className="alert-meta">
                          <div className="meta-item">
                            <MapPin className="meta-icon" />
                            <span>{alert.accident_log?.location || 'Unknown Location'}</span>
                          </div>
                          <div className="meta-item">
                            <Clock className="meta-icon" />
                            <span>{formatTimestamp(alert.sent_at)}</span>
                          </div>
                          {alert.accident_log?.confidence && (
                            <div className="meta-item">
                              <span className="confidence">
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
                          className="action-btn secondary"
                        >
                          <Eye className="btn-icon" />
                          View
                        </button>
                      )}
                      {!isAlertRead(alert) && (
                        <button
                          onClick={() => markAlertAsRead(alert.id)}
                          className="action-btn primary"
                        >
                          <CheckCircle className="btn-icon" />
                          Mark Read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Alert Detail Modal */}
        {selectedAlert && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-content">
                <div className="modal-header">
                  <h3 className="modal-title">Alert Details - #{selectedAlert.id}</h3>
                  <button
                    onClick={() => setSelectedAlert(null)}
                    className="modal-close"
                  >
                    ×
                  </button>
                </div>
                
                <div className="modal-body">
                  <div className="modal-info">
                    <h4 className="modal-section-title">Alert Information</h4>
                    <div className="info-list">
                      <p><strong>Message:</strong> {selectedAlert.message}</p>
                      <p><strong>Type:</strong> {selectedAlert.alert_type}</p>
                      <p><strong>Sent:</strong> {new Date(selectedAlert.sent_at).toLocaleString()}</p>
                      <p><strong>Status:</strong> {isAlertRead(selectedAlert) ? 'Read' : 'Unread'}</p>
                      {selectedAlert.read_at && (
                        <p><strong>Read at:</strong> {new Date(selectedAlert.read_at).toLocaleString()}</p>
                      )}
                    </div>
                    
                    {selectedAlert.accident_log && (
                      <div className="modal-incident-details">
                        <h4 className="modal-section-title">Incident Details</h4>
                        <div className="info-list">
                          <p><strong>Location:</strong> {selectedAlert.accident_log.location}</p>
                          <p><strong>Confidence:</strong> {(selectedAlert.accident_log.confidence * 100).toFixed(1)}%</p>
                          <p><strong>Severity:</strong> {selectedAlert.accident_log.severity_estimate}</p>
                          {selectedAlert.accident_log.detected_at && (
                            <p><strong>Detected at:</strong> {new Date(selectedAlert.accident_log.detected_at).toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="modal-image">
                    {selectedAlert.accident_log?.snapshot_url && (
                      <div>
                        <h4 className="modal-section-title">Snapshot</h4>
                        <img
                          src={`${API_BASE_URL}${selectedAlert.accident_log.snapshot_url}`}
                          alt="Incident snapshot"
                          className="incident-image"
                          onError={(e) => {
                            e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%23f3f4f6"/><text x="150" y="100" text-anchor="middle" fill="%236b7280">Image not available</text></svg>';
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="modal-footer">
                  {!isAlertRead(selectedAlert) && (
                    <button
                      onClick={() => {
                        markAlertAsRead(selectedAlert.id);
                        setSelectedAlert(null);
                      }}
                      className="action-btn primary"
                    >
                      Mark as Read
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedAlert(null)}
                    className="action-btn secondary"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="quick-actions-card">
          <h3 className="quick-actions-title">Quick Actions</h3>
          <div className="quick-actions-grid">
            <button
              onClick={() => window.location.href = '/live'}
              className="quick-action-btn green"
            >
              <div className="quick-action-content">
                <div className="quick-action-icon">🔴</div>
                <div className="quick-action-label">Live Detection</div>
              </div>
            </button>
            <button
              onClick={fetchUserData}
              disabled={refreshing}
              className={`quick-action-btn blue ${refreshing ? 'disabled' : ''}`}
            >
              <div className="quick-action-content">
                <div className="quick-action-icon">🔄</div>
                <div className="quick-action-label">
                  {refreshing ? 'Refreshing...' : 'Refresh Alerts'}
                </div>
              </div>
            </button>
            <button
              onClick={requestNotificationPermission}
              className="quick-action-btn yellow"
            >
              <div className="quick-action-content">
                <div className="quick-action-icon">🔔</div>
                <div className="quick-action-label">Enable Notifications</div>
              </div>
            </button>
            <button
              onClick={() => window.location.href = '/profile'}
              className="quick-action-btn gray"
            >
              <div className="quick-action-content">
                <div className="quick-action-icon">👤</div>
                <div className="quick-action-label">Profile Settings</div>
              </div>
            </button>
          </div>
        </div>

        {/* Connection Status Footer */}
        <div className="status-footer">
          <div className="status-footer-content">
            <div className="status-info">
              <span className="status-item">
                <strong>System Status:</strong> 
                <span className={connectionStatus === 'connected' ? 'status-online' : 'status-offline'}>
                  {connectionStatus === 'connected' ? ' Online' : ' Offline'}
                </span>
              </span>
              {stats && (
                <span className="status-item">
                  <strong>Model Status:</strong> 
                  <span className={stats.system_status?.model_status === 'loaded' ? 'status-online' : 'status-offline'}>
                    {stats.system_status?.model_status === 'loaded' ? ' Active' : ' Inactive'}
                  </span>
                </span>
              )}
            </div>
            <div className="last-updated">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;