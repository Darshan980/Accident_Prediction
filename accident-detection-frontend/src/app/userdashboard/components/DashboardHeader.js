import React from 'react';
import { Bell, RefreshCw, User, Activity, TrendingUp } from 'lucide-react';

const DashboardHeader = ({ stats, lastUpdateTime, handleRefresh, unreadCount }) => {
  return (
    <div className="header-card">
      <div className="header-main">
        <div className="header-content">
          <h1 className="header-title">Safety Dashboard</h1>
          <p className="header-subtitle">
            Real-time monitoring and alert management system
          </p>
        </div>
        <div className="header-actions">
          <span className="last-update">
            <span className="last-update-label">Updated:</span>
            <span className="last-update-time">{lastUpdateTime.toLocaleTimeString()}</span>
          </span>
          
          <button
            onClick={handleRefresh}
            className="icon-button refresh-button"
            title="Refresh data"
            aria-label="Refresh data"
          >
            <RefreshCw size={20} />
          </button>
          
          <button
            className="icon-button notification-button"
            title="Notifications"
            aria-label={`${unreadCount} unread notifications`}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="notification-badge">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          <button
            className="icon-button user-button"
            title="User menu"
            aria-label="User menu"
          >
            <User size={20} />
          </button>
        </div>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card blue">
            <div className="stat-icon">
              <Activity size={24} />
            </div>
            <div className="stat-content">
              <h3 className="stat-number">{stats.total_alerts}</h3>
              <p className="stat-label">Total Alerts</p>
            </div>
          </div>
          
          <div className="stat-card red">
            <div className="stat-icon">
              <Bell size={24} />
            </div>
            <div className="stat-content">
              <h3 className="stat-number">{unreadCount}</h3>
              <p className="stat-label">Unread</p>
            </div>
          </div>
          
          <div className="stat-card yellow">
            <div className="stat-icon">
              <TrendingUp size={24} />
            </div>
            <div className="stat-content">
              <h3 className="stat-number">{stats.last_24h_detections}</h3>
              <p className="stat-label">Last 24h</p>
            </div>
          </div>
          
          <div className="stat-card green">
            <div className="stat-icon">
              <Activity size={24} />
            </div>
            <div className="stat-content">
              <h3 className="stat-number">{stats.user_accuracy}</h3>
              <p className="stat-label">Accuracy</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardHeader;
