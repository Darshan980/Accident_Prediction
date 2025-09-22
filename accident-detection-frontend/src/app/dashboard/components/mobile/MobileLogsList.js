// app/dashboard/components/mobile/MobileLogsList.jsx
import React, { useState } from 'react';
import { getStatusColor, getConfidenceColor, formatTimestamp } from '../../utils/uiHelpers';

const MobileLogsList = ({ 
  logs, 
  onUpdateStatus, 
  currentPage, 
  totalPages, 
  onPageChange,
  filteredCount 
}) => {
  const [expandedLog, setExpandedLog] = useState(null);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(null);

  const handleStatusUpdate = async (logId, newStatus) => {
    setStatusUpdateLoading(logId);
    try {
      await onUpdateStatus(logId, newStatus);
    } finally {
      setStatusUpdateLoading(null);
    }
  };

  if (logs.length === 0) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '2rem',
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
        <p style={{ color: '#666', margin: 0 }}>
          No logs found matching the current filter.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
          📋 Detection Logs
        </h3>
        <span style={{ fontSize: '0.8rem', color: '#666' }}>
          {filteredCount} logs
        </span>
      </div>

      {/* Log Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {logs.map((log) => (
          <MobileLogCard
            key={log.id}
            log={log}
            isExpanded={expandedLog === log.id}
            onToggleExpand={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
            onUpdateStatus={handleStatusUpdate}
            isUpdating={statusUpdateLoading === log.id}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '0.5rem',
          marginTop: '1.5rem',
          padding: '1rem 0'
        }}>
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #ccc',
              borderRadius: '6px',
              backgroundColor: currentPage === 1 ? '#f8f9fa' : 'white',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Previous
          </button>
          
          <span style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 1rem',
            fontSize: '0.9rem',
            color: '#666'
          }}>
            {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #ccc',
              borderRadius: '6px',
              backgroundColor: currentPage === totalPages ? '#f8f9fa' : 'white',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

const MobileLogCard = ({ log, isExpanded, onToggleExpand, onUpdateStatus, isUpdating }) => {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      border: log.accident_detected ? '2px solid #dc354530' : '1px solid #e5e5e5',
      boxShadow: log.accident_detected ? '0 4px 12px rgba(220, 53, 69, 0.1)' : '0 2px 8px rgba(0,0,0,0.05)',
      overflow: 'hidden'
    }}>
      {/* Main Card Content */}
      <div style={{ padding: '1rem' }} onClick={onToggleExpand}>
        {/* Header Row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '0.75rem'
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.25rem'
            }}>
              <span style={{ fontSize: '1.2rem' }}>
                {log.accident_detected ? '🚨' : '✅'}
              </span>
              <span style={{
                fontSize: '0.9rem',
                fontWeight: 'bold',
                color: log.accident_detected ? '#dc3545' : '#28a745'
              }}>
                {log.accident_detected ? 'ACCIDENT' : 'NORMAL'}
              </span>
              <div style={{
                padding: '0.125rem 0.5rem',
                borderRadius: '12px',
                fontSize: '0.7rem',
                fontWeight: 'bold',
                backgroundColor: getConfidenceColor(log.confidence) + '20',
                color: getConfidenceColor(log.confidence)
              }}>
                {(log.confidence * 100).toFixed(0)}%
              </div>
            </div>
            
            <div style={{ fontSize: '0.8rem', color: '#666' }}>
              {log.video_source} • {log.location}
            </div>
          </div>

          <div style={{
            padding: '0.25rem 0.5rem',
            borderRadius: '6px',
            fontSize: '0.7rem',
            fontWeight: 'bold',
            backgroundColor: getStatusColor(log.status) + '20',
            color: getStatusColor(log.status),
            textAlign: 'center',
            minWidth: '60px'
          }}>
            {log.status?.replace('_', ' ').toUpperCase()}
          </div>
        </div>

        {/* Time and expand indicator */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          color: '#666'
        }}>
          <span>{formatTimestamp(log.timestamp)}</span>
          <span style={{
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }}>
            ▼
          </span>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div style={{
          borderTop: '1px solid #f0f0f0',
          padding: '1rem',
          backgroundColor: '#fafafa'
        }}>
          {/* Additional Details */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem',
            marginBottom: '1rem',
            fontSize: '0.8rem'
          }}>
            <div>
              <strong>Analysis Type:</strong><br />
              <span style={{ color: '#666' }}>{log.analysis_type}</span>
            </div>
            <div>
              <strong>Weather:</strong><br />
              <span style={{ color: '#666' }}>{log.weather_conditions}</span>
            </div>
            <div>
              <strong>Processing Time:</strong><br />
              <span style={{ color: '#666' }}>{log.processing_time?.toFixed(2)}s</span>
            </div>
            <div>
              <strong>Severity:</strong><br />
              <span style={{ 
                color: log.severity_estimate === 'high' ? '#dc3545' : 
                       log.severity_estimate === 'medium' ? '#ffc107' : '#28a745'
              }}>
                {log.severity_estimate}
              </span>
            </div>
          </div>

          {log.notes && (
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '0.75rem',
              borderRadius: '6px',
              marginBottom: '1rem',
              fontSize: '0.8rem'
            }}>
              <strong>Notes:</strong><br />
              {log.notes}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.5rem'
          }}>
            <ActionButton
              onClick={() => onUpdateStatus(log.id, 'verified')}
              disabled={isUpdating}
              color="#dc3545"
              text={isUpdating ? '...' : 'Verify'}
            />
            <ActionButton
              onClick={() => onUpdateStatus(log.id, 'false_alarm')}
              disabled={isUpdating}
              color="#6c757d"
              text={isUpdating ? '...' : 'False'}
            />
            <ActionButton
              onClick={() => onUpdateStatus(log.id, 'resolved')}
              disabled={isUpdating}
              color="#28a745"
              text={isUpdating ? '...' : 'Resolve'}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const ActionButton = ({ onClick, disabled, color, text }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      backgroundColor: disabled ? '#f8f9fa' : color,
      color: disabled ? '#666' : 'white',
      border: 'none',
      padding: '0.5rem',
      borderRadius: '6px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: '0.8rem',
      fontWeight: 'bold',
      opacity: disabled ? 0.6 : 1
    }}
  >
    {text}
  </button>
);

export default MobileLogsList;
