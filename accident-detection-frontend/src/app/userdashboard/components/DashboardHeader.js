import React from 'react';
import { Activity, TrendingUp, Wifi, WifiOff } from 'lucide-react';

const DashboardHeader = ({ stats, lastUpdateTime, handleRefresh, unreadCount, isConnected, loading }) => {
  return (
    <div className="header-card">
      <div className="header-main">
        <div className="header-content">
          <h1 className="header-title">Safety Dashboard</h1>
          <p className="header-subtitle">
            Real-time monitoring and alert management system
            {isConnected !== undefined && (
              <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                {isConnected ? (
                  <>
                    <Wifi size={14} />
                    Connected
                  </>
                ) : (
                  <>
                    <WifiOff size={14} />
                    Disconnected
                  </>
                )}
              </span>
            )}
          </p>
        </div>
        <div className="header-actions">
          <span className="last-update">
            <span className="last-update-label">Updated:</span>
            <span className="last-update-time">{lastUpdateTime.toLocaleTimeString()}</span>
          </span>
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
              <Activity size={24} />
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
        </div>
      )}
    </div>
  );
};

export default DashboardHeader;
