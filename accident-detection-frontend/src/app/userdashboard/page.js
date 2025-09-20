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
  const { 
    alerts, 
    filteredAlerts, 
    filter, 
    setFilter, 
    selectedAlert, 
    setSelectedAlert, 
    markAlertAsRead, 
    isAlertRead,
    unreadCount 
  } = useAlerts();

  const { stats, lastUpdateTime, handleRefresh } = useDashboardData(alerts);

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        <DashboardHeader 
          stats={stats}
          lastUpdateTime={lastUpdateTime}
          handleRefresh={handleRefresh}
          unreadCount={unreadCount}
        />

        <AlertFilters 
          filter={filter}
          setFilter={setFilter}
          alerts={alerts}
          unreadCount={unreadCount}
        />

        <div className="alerts-section">
          {filteredAlerts.length === 0 ? (
            <EmptyState filter={filter} />
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
