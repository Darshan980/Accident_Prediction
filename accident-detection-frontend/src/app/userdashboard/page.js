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

  const { stats, lastUpdateTime, handleRefresh } = useDashboardData(alerts);

  // Combined refresh function
  const handleRefreshAll = () => {
    handleRefresh();
    refreshAlerts();
  };

  if (loading && alerts.length === 0) {
    return <LoadingState />;
  }

  if (error && alerts.length === 0) {
    return <ErrorState error={error} onRetry={refreshAlerts} />;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        <DashboardHeader 
          stats={stats}
          lastUpdateTime={lastUpdateTime}
          handleRefresh={handleRefreshAll}
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
