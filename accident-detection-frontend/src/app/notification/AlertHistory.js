import React from 'react';
import { formatAlertTime } from './alertHelpers';

const AlertHistory = ({ alertHistory, onAcknowledge }) => {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ 
        fontSize: '1.5rem', 
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{ fontSize: '1.2rem' }}>📋</span>
        Alert History
        <span style={{ 
          backgroundColor: '#0070f3',
          color: 'white',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '0.8rem'
        }}>
          {alertHistory.length}
        </span>
      </h2>

      <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
        {alertHistory.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px',
            color: '#666'
          }}>
            <div style={{ fontSize: '3rem', opacity: 0.3, marginBottom: '16px' }}>🔔</div>
            <h3>No Alerts Yet</h3>
            <p>Real accident detection alerts from live camera and uploads will appear here</p>
          </div>
        ) : (
          alertHistory.map((alert) => (
            <div
              key={alert.id}
              style={{
                border: `2px solid ${alert.acknowledged ? '#28a745' : '#dc3545'}`,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '12px',
                backgroundColor: alert.acknowledged ? '#f8fff9' : '#fff5f5'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ fontSize: '1rem' }}>
                  {alert.acknowledged ? '✅' : '⚠️'}
                </span>
                <div style={{ flex: 1 }}>
                  <strong style={{ color: alert.acknowledged ? '#28a745' : '#dc3545' }}>
                    {alert.acknowledged ? 'Alert Acknowledged' : 'ACTIVE ALERT'}
                  </strong>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>
                    {formatAlertTime(alert.timestamp)}
                  </div>
                </div>
                <div style={{
                  backgroundColor: alert.severity === 'high' ? '#dc3545' : '#ffc107',
                  color: alert.severity === 'high' ? 'white' : '#212529',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  fontWeight: 'bold'
                }}>
                  {alert.severity.toUpperCase()}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem', marginBottom: '8px' }}>
                <div>
                  <strong>Source:</strong> {alert.source}
                </div>
                <div>
                  <strong>Confidence:</strong> {(alert.confidence * 100).toFixed(1)}%
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem', marginBottom: '8px' }}>
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
                <div style={{ 
                  fontSize: '0.8rem', 
                  color: '#666',
                  backgroundColor: '#f8f9fa',
                  padding: '8px',
                  borderRadius: '4px',
                  marginBottom: '8px'
                }}>
                  {alert.frame_id && <div>Frame ID: {alert.frame_id}</div>}
                  {alert.filename && <div>File: {alert.filename}</div>}
                  {alert.processing_time && <div>Processing Time: {alert.processing_time}s</div>}
                  {alert.analysis_type && <div>Type: {alert.analysis_type}</div>}
                </div>
              )}

              {alert.acknowledgedAt && (
                <div style={{
                  marginTop: '8px',
                  paddingTop: '8px',
                  borderTop: '1px solid #e0e0e0',
                  fontSize: '0.8rem',
                  color: '#666'
                }}>
                  Acknowledged: {formatAlertTime(alert.acknowledgedAt)}
                </div>
              )}

              {!alert.acknowledged && (
                <button
                  onClick={() => onAcknowledge(alert.id)}
                  style={{
                    marginTop: '12px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
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
