import React from 'react';
import { formatAlertTime } from './alertHelpers';

const ActiveAlertBanner = ({ activeAlert, onViewDetails, onAcknowledge, showModal }) => {
  if (!activeAlert || !showModal) return null;

  return (
    <div className="mobile-alert-banner">
      <div className="mobile-alert-content">
        <div className="mobile-alert-icon">⚠️</div>
        <div className="mobile-alert-text">
          <h3 className="mobile-alert-title">
            {activeAlert.accident_detected ? 'ACCIDENT DETECTED!' : 'DETECTION ALERT'}
          </h3>
          <p className="mobile-alert-details">
            {activeAlert.source} • Confidence: {(activeAlert.confidence * 100).toFixed(1)}% • 
            Location: {activeAlert.location} • 
            {formatAlertTime(activeAlert.timestamp)}
          </p>
        </div>
        <div className="mobile-alert-actions">
          <button
            onClick={onViewDetails}
            className="mobile-alert-button"
          >
            VIEW DETAILS
          </button>
          <button
            onClick={() => onAcknowledge(activeAlert.id)}
            className="mobile-alert-button"
          >
            ACKNOWLEDGE
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActiveAlertBanner;
