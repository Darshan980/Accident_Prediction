// app/dashboard/components/DashboardHeader.jsx
import React from 'react';

const DashboardHeader = ({ user, onRefresh, isRefreshing }) => {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#333' }}>
            Admin Dashboard
          </h1>
          <p style={{ color: '#666', fontSize: '1.1rem' }}>
            Monitor and manage accident detection logs and statistics
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ 
            backgroundColor: '#e8f4fd', 
            padding: '0.75rem 1rem', 
            borderRadius: '6px',
            fontSize: '0.9rem',
            color: '#0c5aa6'
          }}>
            <strong>Welcome, {user?.username || 'Admin'}</strong><br />
            <small>Role: {user?.role || 'admin'}</small>
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            style={{
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '4px',
              cursor: isRefreshing ? 'not-allowed' : 'pointer',
              opacity: isRefreshing ? 0.6 : 1
            }}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
