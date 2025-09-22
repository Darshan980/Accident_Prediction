// app/dashboard/components/StatsOverview.jsx
import React from 'react';
import { getAccuracyColor, getAccuracyBgColor, getAccuracyBorderColor } from '../utils/uiHelpers';

const StatsOverview = ({ stats }) => {
  if (!stats) return null;

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
      gap: '1rem', 
      marginBottom: '2rem' 
    }}>
      <StatCard
        value={stats.total_logs}
        label="Total Logs"
        bgColor="#f8f9fa"
        borderColor="#dee2e6"
        textColor="#0070f3"
      />

      <StatCard
        value={stats.accidents_detected}
        label="Accidents Detected"
        bgColor="#fff5f5"
        borderColor="#fed7d7"
        textColor="#dc3545"
      />

      <StatCard
        value={stats.normal_detected}
        label="Normal Traffic"
        bgColor="#f0fff4"
        borderColor="#c3e6cb"
        textColor="#28a745"
      />

      <StatCard
        value={stats.status_breakdown.unresolved}
        label="Unresolved"
        bgColor="#fff8f0"
        borderColor="#ffd6a3"
        textColor="#ffc107"
      />

      <StatCard
        value={stats.recent_activity.total_logs_24h}
        label="Last 24h"
        bgColor="#e8f4fd"
        borderColor="#b3d9ff"
        textColor="#17a2b8"
      />

      <div style={{
        backgroundColor: getAccuracyBgColor(stats.accuracy_rate),
        padding: '1.5rem',
        borderRadius: '8px',
        border: `1px solid ${getAccuracyBorderColor(stats.accuracy_rate)}`,
        textAlign: 'center'
      }}>
        <h3 style={{ 
          color: getAccuracyColor(stats.accuracy_rate), 
          fontSize: '2rem', 
          margin: '0 0 0.5rem 0' 
        }}>
          {stats.accuracy_rate === 'N/A' ? 'N/A' : `${stats.accuracy_rate}%`}
        </h3>
        <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
          Accuracy Rate
        </p>
        <p style={{ margin: 0, color: '#666', fontSize: '0.7rem' }}>
          ({stats.reviewed_logs} reviewed)
        </p>
      </div>
    </div>
  );
};

const StatCard = ({ value, label, bgColor, borderColor, textColor }) => (
  <div style={{
    backgroundColor: bgColor,
    padding: '1.5rem',
    borderRadius: '8px',
    border: `1px solid ${borderColor}`,
    textAlign: 'center'
  }}>
    <h3 style={{ color: textColor, fontSize: '2rem', margin: '0 0 0.5rem 0' }}>
      {value}
    </h3>
    <p style={{ margin: 0, color: '#666' }}>{label}</p>
  </div>
);

export default StatsOverview;
