import React from 'react';

const AlertStatistics = ({ statistics }) => {
  const statItems = [
    { label: 'Total Alerts', value: statistics.total, color: '#0070f3' },
    { label: 'Active Alerts', value: statistics.active, color: '#dc3545' },
    { label: 'Acknowledged', value: statistics.acknowledged, color: '#28a745' },
    { label: 'High Priority', value: statistics.highPriority, color: '#ffc107' },
    { label: 'Live Detection', value: statistics.liveDetection, color: '#17a2b8' },
    { label: 'File Upload', value: statistics.fileUpload, color: '#6f42c1' }
  ];

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '20px',
      marginTop: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>Alert Statistics</h3>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
        gap: '16px' 
      }}>
        {statItems.map((item, index) => (
          <div key={index} style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '2rem', 
              fontWeight: 'bold', 
              color: item.color 
            }}>
              {item.value}
            </div>
            <div style={{ color: '#666' }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlertStatistics;
