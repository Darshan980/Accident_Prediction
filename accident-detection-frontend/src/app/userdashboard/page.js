'use client';
import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, MapPin, Clock, Eye, CheckCircle, RefreshCw, User, Shield, Activity, TrendingUp } from 'lucide-react';
import './dashboard.css';

const UserDashboard = () => {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [filter, setFilter] = useState('all');
  const [readAlerts, setReadAlerts] = useState(new Set());
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());

  // Initialize with demo data
  useEffect(() => {
    const now = new Date();
    const demoAlerts = [
      {
        id: 1,
        message: "High confidence accident detected at Main Street intersection",
        timestamp: now.toISOString(),
        severity: 'high',
        read: false,
        type: 'accident_detection',
        confidence: 0.92,
        location: 'Main Street & 5th Avenue',
        snapshot_url: '/api/snapshots/accident_001.jpg'
      },
      {
        id: 2,
        message: "Medium confidence incident detected at Highway 101",
        timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
        severity: 'medium',
        read: false,
        type: 'accident_detection',
        confidence: 0.75,
        location: 'Highway 101, Mile 45',
        snapshot_url: '/api/snapshots/accident_002.jpg'
      },
      {
        id: 3,
        message: "Low confidence event detected at Oak Street",
        timestamp: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
        severity: 'low',
        read: true,
        type: 'accident_detection',
        confidence: 0.58,
        location: 'Oak Street & 3rd Avenue',
        snapshot_url: '/api/snapshots/accident_003.jpg'
      },
      {
        id: 4,
        message: "Traffic anomaly detected near City Center",
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        severity: 'medium',
        read: false,
        type: 'traffic_anomaly',
        confidence: 0.68,
        location: 'City Center Plaza'
      },
      {
        id: 5,
        message: "Emergency vehicle route optimization alert",
        timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
        severity: 'high',
        read: false,
        type: 'emergency_route',
        confidence: 0.89,
        location: 'Downtown District'
      }
    ];

    const demoStats = {
      total_alerts: demoAlerts.length,
      unread_alerts: demoAlerts.filter(a => !a.read).length,
      last_24h_detections: 12,
      user_accuracy: "94.5%"
    };

    setAlerts(demoAlerts);
    setStats(demoStats);
  }, []);

  const markAlertAsRead = (alertId) => {
    const newReadAlerts = new Set(readAlerts);
    newReadAlerts.add(alertId);
    setReadAlerts(newReadAlerts);
    
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, read: true }
        : alert
    ));
  };

  const handleRefresh = () => {
    setLastUpdateTime(new Date());
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

  const unreadCount = alerts.filter(alert => !alert.read && !readAlerts.has(alert.id)).length;

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        {/* Header */}
        <div className="header-card">
          <div className="header-main">
            <div>
              <h1 className="header-title">Safety Dashboard</h1>
              <p className="header-subtitle">
                Real-time monitoring and alert management system
              </p>
            </div>
            <div className="header-actions">
              {/* Last Update */}
              <span className="last-update">
                Updated: {lastUpdateTime.toLocaleTimeString()}
              </span>
              
              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                className="icon-button"
                title="Refresh data"
              >
                <RefreshCw size={20} />
              </button>
              
              {/* Notification Bell */}
              <button
                className="icon-button notification-button"
                title="Notifications"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="notification-badge">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* User Menu */}
              <button
                className="icon-button"
                title="User menu"
              >
                <User size={20} />
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          {stats && (
            <div className="stats-grid">
              <div className="stat-card blue">
                <h3 className="stat-number">
                  {stats.total_alerts}
                </h3>
                <p className="stat-label">Total Alerts</p>
              </div>
              <div className="stat-card red">
                <h3 className="stat-number">
                  {unreadCount}
                </h3>
                <p className="stat-label">Unread</p>
              </div>
              <div className="stat-card yellow">
                <h3 className="stat-number">
                  {stats.last_24h_detections}
                </h3>
                <p className="stat-label">Last 24h</p>
              </div>
              <div className="stat-card green">
                <h3 className="stat-number">
                  {stats.user_accuracy}
                </h3>
                <p className="stat-label">Accuracy</p>
              </div>
            </div>
          )}
        </div>

        {/* Alert Filters */}
        <div className="filters-card">
          <div className="filters-container">
            <button
              onClick={() => setFilter('all')}
              className={`filter-button ${filter === 'all' ? 'active' : ''}`}
            >
              All Alerts ({alerts.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`filter-button ${filter === 'unread' ? 'active unread' : ''}`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('high_priority')}
              className={`filter-button ${filter === 'high_priority' ? 'active priority' : ''}`}
            >
              High Priority ({alerts.filter(a => a.severity === 'high').length})
            </button>
          </div>
        </div>

        {/* Alerts List */}
        <div className="alerts-section">
          {filteredAlerts.length === 0 ? (
            <div className="empty-state">
              <Bell className="empty-icon" />
              <h3 className="empty-title">No Alerts</h3>
              <p className="empty-subtitle">
                {filter === 'unread' ? 'No unread alerts' : 
                 filter === 'high_priority' ? 'No high priority alerts' : 
                 'No alerts to display'}
              </p>
              <p className="live-monitoring">
                <Activity className="activity-icon" />
                System monitoring active
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`alert-card ${alert.severity} ${!isAlertRead(alert) ? 'unread' : ''}`}
              >
                <div className="alert-content">
                  <div className="alert-main">
                    <div className="alert-header">
                      {alert.severity === 'high' ? (
                        <AlertTriangle className="alert-icon high" size={20} />
                      ) : alert.severity === 'low' ? (
                        <CheckCircle className="alert-icon low" size={20} />
                      ) : (
                        <Bell className="alert-icon" size={20} />
                      )}
                      <div className="alert-info">
                        <div className="alert-title-row">
                          <h3 className="alert-title">
                            Alert #{alert.id}
                          </h3>
                          {!isAlertRead(alert) && (
                            <span className="new-badge">
                              New
                            </span>
                          )}
                          {alert.severity && (
                            <span className={`severity-badge ${alert.severity}`}>
                              {alert.severity.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <p className="alert-message">{alert.message}</p>
                        <div className="alert-metadata">
                          <div className="metadata-item">
                            <MapPin size={14} />
                            <span>{alert.location}</span>
                          </div>
                          <div className="metadata-item">
                            <Clock size={14} />
                            <span>{formatTimestamp(alert.timestamp)}</span>
                          </div>
                          {alert.confidence && (
                            <div className="metadata-item">
                              <TrendingUp size={14} />
                              <span>Confidence: {(alert.confidence * 100).toFixed(1)}%</span>
                            </div>
                          )}
                          <div className="metadata-item">
                            <Shield size={14} />
                            <span>Type: {alert.type.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="alert-actions">
                    {alert.snapshot_url && (
                      <button
                        onClick={() => setSelectedAlert(alert)}
                        className="action-button view"
                      >
                        <Eye size={16} />
                        <span>View</span>
                      </button>
                    )}
                    {!isAlertRead(alert) && (
                      <button
                        onClick={() => markAlertAsRead(alert.id)}
                        className="action-button primary"
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
          <div className="modal-overlay">
            <div className="modal-content">
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
              
              <div className="modal-body">
                <div className="detail-section">
                  <h4 className="detail-title">Alert Information</h4>
                  <div className="detail-content">
                    <p><strong>Message:</strong> {selectedAlert.message}</p>
                    <p><strong>Type:</strong> {selectedAlert.type?.replace('_', ' ')}</p>
                    <p><strong>Severity:</strong> <span className={`severity-text ${selectedAlert.severity}`}>
                      {selectedAlert.severity?.toUpperCase()}</span></p>
                    <p><strong>Timestamp:</strong> {new Date(selectedAlert.timestamp).toLocaleString()}</p>
                    <p><strong>Status:</strong> {isAlertRead(selectedAlert) ? 'Read' : 'Unread'}</p>
                    {selectedAlert.confidence && (
                      <p><strong>AI Confidence:</strong> {(selectedAlert.confidence * 100).toFixed(1)}%</p>
                    )}
                  </div>
                </div>
                
                <div className="detail-section">
                  <h4 className="detail-title">Location Details</h4>
                  <div className="detail-content">
                    <p><strong>Location:</strong> {selectedAlert.location}</p>
                  </div>
                </div>
                
                <div className="detail-section">
                  <h4 className="detail-title">Snapshot</h4>
                  <div className="snapshot-container">
                    {selectedAlert.snapshot_url ? (
                      <div className="snapshot-placeholder">
                        <span>
                          Snapshot Available
                          <br />
                          <span className="snapshot-note">Image preview would be displayed here</span>
                        </span>
                      </div>
                    ) : (
                      <div className="snapshot-placeholder">
                        <span>No snapshot available for this alert</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                {!isAlertRead(selectedAlert) && (
                  <button
                    onClick={() => {
                      markAlertAsRead(selectedAlert.id);
                      setSelectedAlert(null);
                    }}
                    className="modal-button primary"
                  >
                    Mark as Read & Close
                  </button>
                )}
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="modal-button secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
