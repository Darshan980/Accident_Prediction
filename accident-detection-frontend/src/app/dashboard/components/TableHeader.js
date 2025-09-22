// app/dashboard/components/TableHeader.jsx
import React from 'react';

const TableHeader = () => {
  const headerStyle = {
    padding: '1rem',
    textAlign: 'left',
    borderBottom: '1px solid #dee2e6'
  };

  const centerHeaderStyle = {
    ...headerStyle,
    textAlign: 'center'
  };

  return (
    <thead>
      <tr style={{ backgroundColor: '#f8f9fa' }}>
        <th style={headerStyle}>Timestamp</th>
        <th style={headerStyle}>Source</th>
        <th style={centerHeaderStyle}>Detection</th>
        <th style={centerHeaderStyle}>Confidence</th>
        <th style={centerHeaderStyle}>Status</th>
        <th style={centerHeaderStyle}>Actions</th>
      </tr>
    </thead>
  );
};

export default TableHeader;
