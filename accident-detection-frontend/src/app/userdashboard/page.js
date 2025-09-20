'use client';
import React from 'react';
import DashboardHeader from './components/DashboardHeader';
import AlertFilters from './components/AlertFilters';
import AlertCard from './components/AlertCard';
import AlertModal from './components/AlertModal';
import EmptyState from './components/EmptyState';
import { useAlerts } from './hooks/useAlerts';
import { useDashboardData } from './hooks/useDashboardData';
import './styles/dashboard.css';

export default function DashboardPage() {
  // Set useRealTime to true for production, false for demo
  const useRealTime = process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_USE_REAL_TIME === 'true';
  
  const { 
    alerts, 
    filteredAlerts, 
    filter, 
    setFilter, 
    selectedAlert, 
    setSelectedAlert, 
    markAlertAsRead, 
    isAlertRead,
    unreadCount,
    loading,
    error,
    isConnected,
    refreshAlerts
  } = useAlerts(useRealTime);

  const { stats, lastUpdateTime } = useDashboardData(alerts);

  // Loading State
  if (loading && alerts.length === 0) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-content">
          <div className="loading-state">
            <div className="loading-content">
              <div className="loading-spinner"></div>
              <h2 className="loading-title">Loading Dashboard</h2>
              <p className="loading-subtitle">Fetching latest alerts and data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error State (only show if no alerts and there's an error)
  if (error && alerts.length === 0) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-content">
          <div className="error-state">
            <div className="error-content">
              <div className="error-icon">⚠️</div>
              <h2 className="error-title">Connection Error</h2>
              <p className="error-subtitle">Unable to connect to the monitoring system</p>
              <div className="error-details">
                <p><strong>Error:</strong> {error}</p>
              </div>
              <button 
                onClick={refreshAlerts}
                className="error-retry-button"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        <DashboardHeader 
          stats={stats}
          lastUpdateTime={lastUpdateTime}
          unreadCount={unreadCount}
          isConnected={isConnected}
          loading={loading}
        />

        <AlertFilters 
          filter={filter}
          setFilter={setFilter}
          alerts={alerts}
          unreadCount={unreadCount}
        />

        <div className="alerts-section">
          {error && alerts.length > 0 && (
            <div className="error-banner">
              <span>⚠️ Connection issue: {error}</span>
            </div>
          )}
          
          {filteredAlerts.length === 0 ? (
            <EmptyState filter={filter} loading={loading} />
          ) : (
            <div className="alerts-grid">
              {filteredAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  isRead={isAlertRead(alert)}
                  onMarkAsRead={() => markAlertAsRead(alert.id)}
                  onViewDetails={() => setSelectedAlert(alert)}
                />
              ))}
            </div>
          )}
        </div>

        {selectedAlert && (
          <AlertModal
            alert={selectedAlert}
            isRead={isAlertRead(selectedAlert)}
            onClose={() => setSelectedAlert(null)}
            onMarkAsRead={() => {
              markAlertAsRead(selectedAlert.id);
              setSelectedAlert(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
