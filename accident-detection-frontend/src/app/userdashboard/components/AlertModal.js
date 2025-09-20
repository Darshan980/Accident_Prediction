import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const AlertModal = ({ alert, isRead, onClose, onMarkAsRead }) => {
  // Close modal with ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="modal-content">
        <div className="modal-header">
          <h3 id="modal-title" className="modal-title">
            Alert Details - #{alert.id}
          </h3>
          <button
            onClick={onClose}
            className="modal-close"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="modal-body">
          <div className="detail-sections">
            <div className="detail-section">
              <h4 className="detail-title">Alert Information</h4>
              <div className="detail-content">
                <div className="detail-grid">
                  <div className="detail-item">
                    <strong>Message:</strong>
                    <span>{alert.message}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Type:</strong>
                    <span>{alert.type?.replace('_', ' ')}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Severity:</strong>
                    <span className={`severity-text ${alert.severity}`}>
                      {alert.severity?.toUpperCase()}
                    </span>
                  </div>
                  <div className="detail-item">
                    <strong>Timestamp:</strong>
                    <span>{new Date(alert.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Status:</strong>
                    <span className={isRead ? 'status-read' : 'status-unread'}>
                      {isRead ? 'Read' : 'Unread'}
                    </span>
                  </div>
                  {alert.confidence && (
                    <div className="detail-item">
                      <strong>AI Confidence:</strong>
                      <span>{(alert.confidence * 100).toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="detail-section">
              <h4 className="detail-title">Location Details</h4>
              <div className="detail-content">
                <div className="location-info">
                  <strong>Location:</strong>
                  <span>{alert.location}</span>
                </div>
              </div>
            </div>
            
            <div className="detail-section">
              <h4 className="detail-title">Snapshot</h4>
              <div className="snapshot-container">
                {alert.snapshot_url ? (
                  <div className="snapshot-placeholder available">
                    <div className="snapshot-content">
                      <span className="snapshot-title">Snapshot Available</span>
                      <span className="snapshot-note">
                        Image preview would be displayed here
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="snapshot-placeholder unavailable">
                    <span>No snapshot available for this alert</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <div className="modal-actions">
            {!isRead && (
              <button
                onClick={onMarkAsRead}
                className="modal-button primary"
              >
                Mark as Read & Close
              </button>
            )}
            <button
              onClick={onClose}
              className="modal-button secondary"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;
