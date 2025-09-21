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
    <div className="mobile-statistics">
      <h3>Alert Statistics</h3>
      <div className="mobile-stats-grid">
        {statItems.map((item, index) => (
          <div key={index} className="mobile-stat-item">
            <div 
              className="mobile-stat-value"
              style={{ color: item.color }}
            >
              {item.value}
            </div>
            <div className="mobile-stat-label">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlertStatistics;
