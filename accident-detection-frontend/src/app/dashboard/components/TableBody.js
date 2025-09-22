// app/dashboard/components/TableBody.jsx
import React, { useState } from 'react';
import { getStatusColor, getConfidenceColor, formatTimestamp } from '../utils/uiHelpers';

const TableBody = ({ logs, onUpdateStatus }) => {
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
      <tbody>
        <tr>
          <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
            No logs found matching the current filter.
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody>
      {logs.map((log) => (
        <TableRow 
          key={log.id}
          log={log}
          onUpdateStatus={handleStatusUpdate}
          isUpdating={statusUpdateLoading === log.id}
        />
      ))}
    </tbody>
  );
};

const TableRow = ({ log, onUpdateStatus, isUpdating }) => {
  return (
    <tr 
      data-log-id={log.id}
      style={{ 
        borderBottom: '1px solid #f1f3f4',
        transition: 'background-color 0.3s ease'
      }}
    >
      <td style={{ padding: '1rem' }}>
        <div style={{ fontSize: '0.9rem' }}>
          {formatTimestamp(log.timestamp)}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#666' }}>
          {log.location || 'Unknown Location'}
        </div>
      </td>
      
      <td style={{ padding: '1rem' }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
          {log.video_source}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#666' }}>
          {log.analysis_type} • {log.weather_conditions}
        </div>
      </td>
      
      <td style={{ padding: '1rem', textAlign: 'center' }}>
        <div style={{
          padding: '0.25rem 0.5rem',
          borderRadius: '4px',
          fontSize: '0.8rem',
          fontWeight: 'bold',
          backgroundColor: log.accident_detected ? '#f8d7da' : '#d4edda',
          color: log.accident_detected ? '#721c24' : '#155724'
        }}>
          {log.accident_detected ? 'ACCIDENT' : 'NORMAL'}
        </div>
      </td>
      
      <td style={{ padding: '1rem', textAlign: 'center' }}>
        <div style={{
          color: getConfidenceColor(log.confidence),
          fontWeight: 'bold',
          fontSize: '1rem'
        }}>
          {(log.confidence * 100).toFixed(1)}%
        </div>
      </td>
      
      <td style={{ padding: '1rem', textAlign: 'center' }}>
        <div style={{
          padding: '0.25rem 0.5rem',
          borderRadius: '4px',
          fontSize: '0.8rem',
          fontWeight: 'bold',
          backgroundColor: getStatusColor(log.status) + '20',
          color: getStatusColor(log.status),
          border: `1px solid ${getStatusColor(log.status)}40`
        }}>
          {log.status?.toUpperCase()}
        </div>
      </td>
      
      <td style={{ padding: '1rem', textAlign: 'center' }}>
        <ActionButtons 
          logId={log.id}
          onUpdateStatus={onUpdateStatus}
          isUpdating={isUpdating}
        />
      </td>
    </tr>
  );
};

const ActionButtons = ({ logId, onUpdateStatus, isUpdating }) => {
  const buttonStyle = {
    border: 'none',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    cursor: isUpdating ? 'not-allowed' : 'pointer',
    fontSize: '0.7rem',
    opacity: isUpdating ? 0.6 : 1,
    color: 'white'
  };

  return (
    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center', flexWrap: 'wrap' }}>
      <button
        onClick={() => onUpdateStatus(logId, 'verified')}
        disabled={isUpdating}
        style={{
          ...buttonStyle,
          backgroundColor: '#dc3545'
        }}
      >
        {isUpdating ? '...' : 'Verify'}
      </button>
      
      <button
        onClick={() => onUpdateStatus(logId, 'false_alarm')}
        disabled={isUpdating}
        style={{
          ...buttonStyle,
          backgroundColor: '#6c757d'
        }}
      >
        False
      </button>
      
      <button
        onClick={() => onUpdateStatus(logId, 'resolved')}
        disabled={isUpdating}
        style={{
          ...buttonStyle,
          backgroundColor: '#28a745'
        }}
      >
        Resolve
      </button>
    </div>
  );
};

export default TableBody;
