import React from 'react';

const ModalNotification = ({ modal, onAcknowledge, onDismiss, alertSettings }) => {
  if (!modal.show) return null;

  return (
    <div className="mobile-modal-overlay">
      <div className="mobile-modal">
        <div className="mobile-modal-icon">⚠️</div>
        
        <h2>{modal.title}</h2>
        
        <div className="mobile-modal-message">
          {modal.message}
        </div>

        {/* Additional details if available */}
        {modal.data && (
          <div className="mobile-modal-details">
            {modal.data.predicted_class && (
              <div>Prediction: {modal.data.predicted_class}</div>
            )}
            {modal.data.frame_id && (
              <div>Frame ID: {modal.data.frame_id}</div>
            )}
            {modal.data.filename && (
              <div>File: {modal.data.filename}</div>
            )}
            {modal.data.processing_time && (
              <div>Processing Time: {modal.data.processing_time}s</div>
            )}
          </div>
        )}
        
        <div style={{ 
          fontSize: '0.9rem', 
          opacity: 0.8, 
          marginBottom: '20px' 
        }}>
          Time: {modal.timestamp?.toLocaleTimeString()}
        </div>
        
        <div className="mobile-modal-buttons">
          <button
            onClick={() => onAcknowledge(modal.alertId)}
            className="mobile-modal-button"
          >
            ACKNOWLEDGE
          </button>
          
          <button
            onClick={onDismiss}
            className="mobile-modal-button"
          >
            DISMISS
          </button>
        </div>

        {/* Auto-close countdown */}
        {modal.autoClose && (
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '0.8rem',
            opacity: 0.7
          }}>
            Auto-closes in {alertSettings.alertDuration}s
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalNotification;
