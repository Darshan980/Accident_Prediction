import React from 'react';
import { formatAlertTime } from './alertHelpers';

const ActiveAlertBanner = ({ activeAlert, onViewDetails, onAcknowledge, showModal }) => {
  if (!activeAlert || !showModal) return null;

  return (
    <div 
      className="alert-pulse"
      style={{
        backgroundColor: '#dc3545',
        color: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        position: 'relative',
        boxShadow: '0 4px 12px rgba(220, 53, 69, 0.3)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ fontSize: '2rem' }}>⚠️</div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 'bold' }}>
            {activeAlert.accident_detected ? 'ACCIDENT DETECTED!' : 'DETECTION ALERT'}
          </h3>
          <p style={{ margin: '4px 0 0 0', opacity: 0.9 }}>
            {activeAlert.source} • Confidence: {(activeAlert.confidence * 100).toFixed(1)}% • 
            Location: {activeAlert.location} • 
            {formatAlertTime(activeAlert.timestamp)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onViewDetails}
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 'bold'
            }}
          >
            VIEW DETAILS
          </button>
          <button
            onClick={() => onAcknowledge(activeAlert.id)}
            style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            ACKNOWLEDGE
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActiveAlertBanner;
