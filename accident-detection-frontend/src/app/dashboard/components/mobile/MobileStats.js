// app/dashboard/components/mobile/MobileStats.jsx
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { getAccuracyColor } from '../../utils/uiHelpers';

const MobileStats = ({ stats }) => {
  if (!stats) return null;

  const criticalStats = [
    {
      label: 'Accidents Today',
      value: stats.recent_activity.accidents_24h,
      icon: '🚨',
      color: '#dc3545',
      bgColor: '#fff5f5'
    },
    {
      label: 'Unresolved',
      value: stats.status_breakdown.unresolved,
      icon: '⏱️',
      color: '#ffc107',
      bgColor: '#fff8f0'
    },
    {
      label: 'Accuracy Rate',
      value: stats.accuracy_rate === 'N/A' ? 'N/A' : `${stats.accuracy_rate}%`,
      icon: '🎯',
      color: getAccuracyColor(stats.accuracy_rate),
      bgColor: stats.accuracy_rate === 'N/A' ? '#f8f9fa' : 
               parseFloat(stats.accuracy_rate) >= 80 ? '#f0fff4' : 
               parseFloat(stats.accuracy_rate) >= 60 ? '#fff8f0' : '#fff5f5'
    }
  ];

  const chartData = [
    { name: 'Accidents', value: stats.accidents_detected, color: '#dc3545' },
    { name: 'Normal', value: stats.normal_detected, color: '#28a745' }
  ];

  return (
    <div style={{ padding: '0.5rem 0' }}>
      {/* Critical Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1.5rem'
      }}>
        {criticalStats.map((stat, index) => (
          <div
            key={index}
            style={{
              backgroundColor: stat.bgColor,
              padding: '1rem 0.75rem',
              borderRadius: '12px',
              textAlign: 'center',
              border: `1px solid ${stat.color}20`
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
              {stat.icon}
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: stat.color,
              marginBottom: '0.25rem'
            }}>
              {stat.value}
            </div>
            <div style={{
              fontSize: '0.7rem',
              color: '#666',
              lineHeight: 1.2
            }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1rem',
        marginBottom: '1rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>
          📊 Overview
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          marginBottom: '1rem'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#0070f3' }}>
              {stats.total_logs}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>Total Logs</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#17a2b8' }}>
              {stats.recent_activity.total_logs_24h}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>Last 24h</div>
          </div>
        </div>

        {/* Mini Chart */}
        <div style={{ height: '120px', marginTop: '1rem' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={25}
                outerRadius={45}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          marginTop: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#dc3545', borderRadius: '2px' }}></div>
            <span style={{ fontSize: '0.8rem' }}>Accidents ({stats.accidents_detected})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#28a745', borderRadius: '2px' }}></div>
            <span style={{ fontSize: '0.8rem' }}>Normal ({stats.normal_detected})</span>
          </div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>
          📋 Status Breakdown
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <StatusItem 
            label="Verified" 
            value={stats.status_breakdown.verified} 
            color="#dc3545"
            icon="✅"
          />
          <StatusItem 
            label="Resolved" 
            value={stats.status_breakdown.resolved} 
            color="#28a745"
            icon="✅"
          />
          <StatusItem 
            label="False Alarms" 
            value={stats.status_breakdown.false_alarm} 
            color="#6c757d"
            icon="❌"
          />
          <StatusItem 
            label="Pending" 
            value={stats.status_breakdown.unresolved} 
            color="#ffc107"
            icon="⏳"
          />
        </div>
      </div>
    </div>
  );
};

const StatusItem = ({ label, value, color, icon }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem',
    backgroundColor: `${color}10`,
    borderRadius: '8px',
    border: `1px solid ${color}20`
  }}>
    <span style={{ fontSize: '1rem' }}>{icon}</span>
    <div>
      <div style={{ fontWeight: 'bold', color, fontSize: '1.1rem' }}>
        {value}
      </div>
      <div style={{ fontSize: '0.7rem', color: '#666' }}>
        {label}
      </div>
    </div>
  </div>
);

export default MobileStats;
