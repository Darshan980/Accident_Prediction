// app/dashboard/components/ChartsSection.jsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getStatusColor } from '../utils/uiHelpers';

const ChartsSection = ({ stats }) => {
  if (!stats) return null;

  // Chart data preparation
  const overviewData = [
    { name: 'Total Logs', value: stats.total_logs, color: '#0070f3' },
    { name: 'Accidents', value: stats.accidents_detected, color: '#dc3545' },
    { name: 'Normal', value: stats.normal_detected, color: '#28a745' }
  ];

  const statusData = Object.entries(stats.status_breakdown).map(([key, value]) => ({
    name: key.replace('_', ' ').toUpperCase(),
    value,
    color: getStatusColor(key)
  }));

  const confidenceData = [
    { name: 'High (80%+)', value: stats.confidence_distribution.high, color: '#dc3545' },
    { name: 'Medium (50-80%)', value: stats.confidence_distribution.medium, color: '#ffc107' },
    { name: 'Low (<50%)', value: stats.confidence_distribution.low, color: '#28a745' }
  ];

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
      gap: '2rem', 
      marginBottom: '2rem' 
    }}>
      <ChartContainer title="Detection Overview">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={overviewData}
              cx="50%"
              cy="50%"
              outerRadius={70}
              fill="#8884d8"
              dataKey="value"
              label={({name, value}) => `${name}: ${value}`}
            >
              {overviewData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </ChartContainer>

      <ChartContainer title="Status Breakdown">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={statusData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      <ChartContainer title="Confidence Distribution">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={confidenceData}
              cx="50%"
              cy="50%"
              outerRadius={70}
              fill="#8884d8"
              dataKey="value"
              label={({name, value}) => `${name}: ${value}`}
            >
              {confidenceData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
};

const ChartContainer = ({ title, children }) => (
  <div style={{
    backgroundColor: '#fff',
    padding: '1.5rem',
    borderRadius: '8px',
    border: '1px solid #dee2e6'
  }}>
    <h3 style={{ marginBottom: '1rem', color: '#333' }}>{title}</h3>
    {children}
  </div>
);

export default ChartsSection;
