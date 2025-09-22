// app/dashboard/components/TableFooter.jsx
import React from 'react';

const TableFooter = ({ totalLogs, filteredLogs }) => {
  return (
    <div style={{ 
      backgroundColor: '#f8f9fa', 
      padding: '1.5rem', 
      borderRadius: '8px', 
      border: '1px solid #dee2e6',
      textAlign: 'center'
    }}>
      <div style={{ 
        fontSize: '0.9rem',
        color: '#666'
      }}>
        <strong>System Status:</strong> Online | 
        <strong> Total Records:</strong> {totalLogs} | 
        <strong> Filtered Records:</strong> {filteredLogs} |
        <strong> Last Updated:</strong> {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default TableFooter;
