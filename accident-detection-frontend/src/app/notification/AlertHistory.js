import React from 'react';
import { formatAlertTime } from './alertHelpers';

const AlertHistory = ({ alertHistory, onAcknowledge }) => {
  return (
    <div className="mobile-history">
      <h2>
        <span>📋</span>
        Alert History
        <span className="mobile-history-count">
          {alertHistory.length}
        </span>
      </h2>

      <div className="mobile-history-list">
        {alertHistory.length === 0 ? (
          <div className="mobile-history-empty">
            <div className="mobile-history-empty-icon">🔔</div>
            <h3>No Alerts Yet</h3>
            <p>Real accident detection alerts from live camera and uploads will appear here</p>
          </div>
        ) : (
          alertHistory.map((alert) => (
            <div
              key={alert.id}
              className={`mobile-alert-item ${alert.acknowledged ? 'acknowledged' : 'active'}`}
            >
              <div className="mobile-alert-header">
                <span style={{ fontSize: '1rem' }}>
                  {alert.acknowledged ? '✅' : '⚠️'}
                </span>
                <div className="mobile-alert-status">
                  <strong style={{ color: alert.acknowledged ? '#28a745' : '#dc3545' }}>
                    {alert.acknowledged ? 'Alert Acknowledged' : 'ACTIVE ALERT'}
                  </strong>
                  <div className="mobile-alert-timestamp">
                    {formatAlertTime(alert.timestamp)}
                  </div>
                </div>
                <div className={`mobile-severity-badge ${alert.severity}`}>
                  {alert.severity.toUpperCase()}
                </div>
              </div>

              <div className="mobile-alert-details">
                <div>
                  <strong>Source:</strong> {alert.source}
                </div>
                <div>
                  <strong>Confidence:</strong> {(alert.confidence * 100).toFixed(1)}%
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.8rem' }}>📍</span>
                  {alert.location}
                </div>
                {alert.predicted_class && (
                  <div>
                    <strong>Class:</strong> {alert.predicted_class}
                  </div>
                )}
              </div>

              {(alert.frame_id || alert.filename || alert.processing_time) && (
                <div className="mobile-alert-meta">
                  {alert.frame_id && <div>Frame ID: {alert.frame_id}</div>}
                  {alert.filename && <div>File: {alert.filename}</div>}
                  {alert.processing_time && <div>Processing Time: {alert.processing_time}s</div>}
                  {alert.analysis_type && <div>Type: {alert.analysis_type}</div>}
                </div>
              )}

              {alert.acknowledgedAt && (
                <div className="mobile-acknowledged-time">
                  Acknowledged: {formatAlertTime(alert.acknowledgedAt)}
                </div>
              )}

              {!alert.acknowledged && (
                <button
                  onClick={() => onAcknowledge(alert.id)}
                  className="mobile-acknowledge-button"
                >
                  Acknowledge
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AlertHistory;
