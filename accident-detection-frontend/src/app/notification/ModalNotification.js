import React from 'react';

const ModalNotification = ({ modal, onAcknowledge, onDismiss, alertSettings }) => {
  if (!modal.show) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(4px)'
    }}>
      <div 
        className="modal-pulse"
        style={{
          backgroundColor: modal.severity === 'high' ? '#dc3545' : '#ff6b35',
          color: 'white',
          padding: '40px',
          borderRadius: '16px',
          maxWidth: '600px',
          width: '90%',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          position: 'relative'
        }}
      >
        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>⚠️</div>
        
        <h2 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '2rem', 
          fontWeight: 'bold',
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
        }}>
          {modal.title}
        </h2>
        
        <div style={{ 
          margin: '0 0 24px 0', 
          fontSize: '1.2rem',
          opacity: 0.9,
          whiteSpace: 'pre-line'
        }}>
          {modal.message}
        </div>

        {/* Additional details if available */}
        {modal.data && (
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '0.95rem'
          }}>
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
          marginBottom: '24px' 
        }}>
          Time: {modal.timestamp?.toLocaleTimeString()}
        </div>
        
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={() => onAcknowledge(modal.alertId)}
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '2px solid rgba(255,255,255,0.3)',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold',
              backdropFilter: 'blur(10px)'
            }}
          >
            ACKNOWLEDGE
          </button>
          
          <button
            onClick={onDismiss}
            style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '2px solid rgba(255,255,255,0.2)',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
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
