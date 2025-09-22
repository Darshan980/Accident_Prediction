// app/dashboard/components/TableControls.jsx
import React from 'react';

const TableControls = ({ 
  filter, 
  setFilter, 
  onRefresh, 
  isRefreshing, 
  filteredCount, 
  totalCount 
}) => {
  return (
    <div style={{ 
      display: 'flex', 
      gap: '1rem', 
      marginBottom: '1.5rem', 
      flexWrap: 'wrap',
      alignItems: 'center',
      backgroundColor: '#f8f9fa',
      padding: '1rem',
      borderRadius: '8px'
    }}>
      <div>
        <label style={{ marginRight: '0.5rem', fontWeight: 'bold' }}>Filter:</label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            padding: '0.5rem',
            borderRadius: '4px',
            border: '1px solid #ccc'
          }}
        >
          <option value="all">All Logs</option>
          <option value="accidents">Accidents Only</option>
          <option value="normal">Normal Only</option>
          <option value="unresolved">Unresolved</option>
          <option value="high_confidence">High Confidence (80%+)</option>
        </select>
      </div>

      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        style={{
          backgroundColor: '#0070f3',
          color: 'white',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '4px',
          cursor: isRefreshing ? 'not-allowed' : 'pointer',
          opacity: isRefreshing ? 0.6 : 1
        }}
      >
        {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
      </button>

      <div style={{ marginLeft: 'auto', color: '#666', fontSize: '0.9rem' }}>
        Showing {filteredCount} of {totalCount} logs
      </div>
    </div>
  );
};

export default TableControls;
