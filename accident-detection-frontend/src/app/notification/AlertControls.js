import React from 'react';

const AlertControls = ({
  isAlertsEnabled,
  setIsAlertsEnabled,
  soundEnabled,
  setSoundEnabled,
  alertSettings,
  setAlertSettings,
  notificationPermission,
  requestNotificationPermission,
  onTestAlert,
  onClearAll
}) => {
  return (
    <div className="mobile-controls">
      <h2>
        <span>⚙️</span>
        Alert Controls
      </h2>

      {/* Master Toggle */}
      <div className="mobile-master-toggle">
        <div>
          <strong>Master Alert System</strong>
          <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
            Enable/disable all accident alerts
          </div>
        </div>
        <div 
          className={`mobile-toggle-switch ${isAlertsEnabled ? 'active' : ''}`}
          onClick={() => setIsAlertsEnabled(!isAlertsEnabled)}
        >
          <div className="mobile-toggle-slider" />
        </div>
      </div>

      {/* Notification Types */}
      <div className="mobile-notification-types">
        <h4 style={{ marginBottom: '12px' }}>Notification Types</h4>
        
        {/* Modal Notifications */}
        <div className="mobile-notification-item">
          <div className="mobile-notification-info">
            <span>🖥️</span>
            <div className="mobile-notification-text">
              <strong>Modal Alerts</strong>
              <small>Full-screen popup alerts</small>
            </div>
          </div>
          <button
            onClick={() => setAlertSettings(prev => ({
              ...prev,
              modalNotifications: !prev.modalNotifications
            }))}
            className={`mobile-toggle-button ${alertSettings.modalNotifications ? 'on' : 'off'}`}
          >
            {alertSettings.modalNotifications ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Desktop Notifications */}
        <div className="mobile-notification-item">
          <div className="mobile-notification-info">
            <span>🔔</span>
            <div className="mobile-notification-text">
              <strong>Desktop Notifications</strong>
              <small>Browser notifications</small>
            </div>
          </div>
          {notificationPermission === 'granted' ? (
            <button
              onClick={() => setAlertSettings(prev => ({
                ...prev,
                desktopNotifications: !prev.desktopNotifications
              }))}
              className={`mobile-toggle-button ${alertSettings.desktopNotifications ? 'on' : 'off'}`}
            >
              {alertSettings.desktopNotifications ? 'ON' : 'OFF'}
            </button>
          ) : (
            <button
              onClick={requestNotificationPermission}
              className="mobile-toggle-button enable"
            >
              ENABLE
            </button>
          )}
        </div>

        {/* Sound Alerts */}
        <div className="mobile-notification-item">
          <div className="mobile-notification-info">
            <span>{soundEnabled ? '🔊' : '🔇'}</span>
            <div className="mobile-notification-text">
              <strong>Audio Alerts</strong>
              <small>Play alarm sound</small>
            </div>
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`mobile-toggle-button ${soundEnabled ? 'on' : 'off'}`}
          >
            {soundEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Test and Clear Buttons */}
      <div className="mobile-action-buttons">
        <button
          onClick={onTestAlert}
          disabled={!isAlertsEnabled}
          className="mobile-action-button test"
        >
          🚨 TEST ALERT
        </button>
        
        <button
          onClick={onClearAll}
          className="mobile-action-button clear"
        >
          🗑️ CLEAR ALL
        </button>
      </div>

      {/* Settings */}
      <div className="mobile-settings">
        <h4 style={{ marginBottom: '12px' }}>Alert Settings</h4>
        
        <div className="mobile-setting-item">
          <label className="mobile-setting-label">
            Cooldown Time: {alertSettings.cooldownTime}s
          </label>
          <input
            type="range"
            min="5"
            max="60"
            value={alertSettings.cooldownTime}
            onChange={(e) => setAlertSettings(prev => ({
              ...prev,
              cooldownTime: parseInt(e.target.value)
            }))}
            className="mobile-slider"
          />
        </div>

        <div className="mobile-setting-item">
          <label className="mobile-setting-label">
            Alert Duration: {alertSettings.alertDuration}s
          </label>
          <input
            type="range"
            min="3"
            max="30"
            value={alertSettings.alertDuration}
            onChange={(e) => setAlertSettings(prev => ({
              ...prev,
              alertDuration: parseInt(e.target.value)
            }))}
            className="mobile-slider"
          />
        </div>

        <div className="mobile-setting-item">
          <label className="mobile-checkbox">
            <input
              type="checkbox"
              checked={alertSettings.autoAcknowledge}
              onChange={(e) => setAlertSettings(prev => ({
                ...prev,
                autoAcknowledge: e.target.checked
              }))}
            />
            Auto-acknowledge alerts
          </label>
        </div>
      </div>
    </div>
  );
};

export default AlertControls;
