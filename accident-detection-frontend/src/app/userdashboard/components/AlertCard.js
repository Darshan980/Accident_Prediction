import React from 'react';
import { AlertTriangle, Bell, CheckCircle, MapPin, Clock, TrendingUp, Shield, Eye } from 'lucide-react';
import { formatTimestamp } from '../utils/dateUtils';

const AlertCard = ({ alert, isRead, onMarkAsRead, onViewDetails }) => {
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="alert-icon high" size={20} />;
      case 'low':
        return <CheckCircle className="alert-icon low" size={20} />;
      default:
        return <Bell className="alert-icon" size={20} />;
    }
  };

  return (
    <div className={`alert-card ${alert.severity} ${!isRead ? 'unread' : ''}`}>
      <div className="alert-content">
        <div className="alert-main">
          <div className="alert-header">
            {getSeverityIcon(alert.severity)}
            <div className="alert-info">
              <div className="alert-title-row">
                <h3 className="alert-title">Alert #{alert.id}</h3>
                <div className="alert-badges">
                  {!isRead && <span className="new-badge">New</span>}
                  {alert.severity && (
                    <span className={`severity-badge ${alert.severity}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <p className="alert-message">{alert.message}</p>
              <div className="alert-metadata">
                <div className="metadata-row">
                  <div className="metadata-item">
                    <MapPin size={14} />
                    <span className="metadata-text">{alert.location}</span>
                  </div>
                  <div className="metadata-item">
                    <Clock size={14} />
                    <span className="metadata-text">{formatTimestamp(alert.timestamp)}</span>
                  </div>
                </div>
                <div className="metadata-row">
                  {alert.confidence && (
                    <div className="metadata-item">
                      <TrendingUp size={14} />
                      <span className="metadata-text">
                        Confidence: {(alert.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                  <div className="metadata-item">
                    <Shield size={14} />
                    <span className="metadata-text">
                      Type: {alert.type.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="alert-actions">
          <div className="alert-actions-row">
            {alert.snapshot_url && (
              <button
                onClick={onViewDetails}
                className="action-button view"
                aria-label="View alert details"
              >
                <Eye size={16} />
                <span>View</span>
              </button>
            )}
            {!isRead && (
              <button
                onClick={onMarkAsRead}
                className="action-button primary"
                aria-label="Mark alert as read"
              >
                <CheckCircle size={16} />
                <span>Mark Read</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertCard;
