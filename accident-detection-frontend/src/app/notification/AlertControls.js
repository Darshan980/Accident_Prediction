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
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ 
        fontSize: '1.5rem', 
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{ fontSize: '1.2rem' }}>⚙️</span>
        Alert Controls
      </h2>

      {/* Master Toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        marginBottom: '16px'
      }}>
        <div>
          <strong>Master Alert System</strong>
          <div style={{ color: '#666', fontSize: '0.9rem' }}>
            Enable/disable all accident alerts
          </div>
        </div>
        <label style={{ position: 'relative', display: 'inline-block', width: '60px', height: '34px' }}>
          <input
            type="checkbox"
            checked={isAlertsEnabled}
            onChange={(e) => setIsAlertsEnabled(e.target.checked)}
            style={{ opacity: 0, width: 0, height: 0 }}
          />
          <span style={{
            position: 'absolute',
            cursor: 'pointer',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: isAlertsEnabled ? '#28a745' : '#ccc',
            borderRadius: '34px',
            transition: '0.3s'
          }}>
            <div style={{
              position: 'absolute',
              height: '26px',
              width: '26px',
              left: isAlertsEnabled ? '30px' : '4px',
              bottom: '4px',
              backgroundColor: 'white',
              borderRadius: '50%',
              transition: '0.3s'
            }} />
          </span>
        </label>
      </div>

      {/* Notification Types */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ marginBottom: '12px' }}>Notification Types</h4>
        
        {/* Modal Notifications */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px',
          border: '1px solid #e0e0e0',
          borderRadius: '6px',
          marginBottom: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🖥️</span>
            <div>
              <strong>Modal Alerts</strong>
              <div style={{ color: '#666', fontSize: '0.8rem' }}>
                Full-screen popup alerts
              </div>
            </div>
          </div>
          <button
            onClick={() => setAlertSettings(prev => ({
              ...prev,
              modalNotifications: !prev.modalNotifications
            }))}
            style={{
              backgroundColor: alertSettings.modalNotifications ? '#28a745' : '#dc3545',
              color: 'white',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.7rem'
            }}
          >
            {alertSettings.modalNotifications ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Desktop Notifications */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px',
          border: '1px solid #e0e0e0',
          borderRadius: '6px',
          marginBottom: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🔔</span>
            <div>
              <strong>Desktop Notifications</strong>
              <div style={{ color: '#666', fontSize: '0.8rem' }}>
                Browser notifications
              </div>
            </div>
          </div>
          {notificationPermission === 'granted' ? (
            <button
              onClick={() => setAlertSettings(prev => ({
                ...prev,
                desktopNotifications: !prev.desktopNotifications
              }))}
              style={{
                backgroundColor: alertSettings.desktopNotifications ? '#28a745' : '#dc3545',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.7rem'
              }}
            >
              {alertSettings.desktopNotifications ? 'ON' : 'OFF'}
            </button>
          ) : (
            <button
              onClick={requestNotificationPermission}
              style={{
                backgroundColor: '#0070f3',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.7rem'
              }}
            >
              ENABLE
            </button>
          )}
        </div>

        {/* Sound Alerts */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px',
          border: '1px solid #e0e0e0',
          borderRadius: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{soundEnabled ? '🔊' : '🔇'}</span>
            <div>
              <strong>Audio Alerts</strong>
              <div style={{ color: '#666', fontSize: '0.8rem' }}>
                Play alarm sound
              </div>
            </div>
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{
              backgroundColor: soundEnabled ? '#28a745' : '#dc3545',
              color: 'white',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.7rem'
            }}
          >
            {soundEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Test and Clear Buttons */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          onClick={onTestAlert}
          disabled={!isAlertsEnabled}
          style={{
            backgroundColor: isAlertsEnabled ? '#dc3545' : '#6c757d',
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '4px',
            cursor: isAlertsEnabled ? 'pointer' : 'not-allowed',
            fontSize: '0.8rem',
            fontWeight: 'bold',
            flex: 1
          }}
        >
          🚨 TEST ALERT
        </button>
        
        <button
          onClick={onClearAll}
          style={{
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.8rem',
            flex: 1
          }}
        >
          🗑️ CLEAR ALL
        </button>
      </div>

      {/* Settings */}
      <div style={{ paddingTop: '20px', borderTop: '1px solid #e0e0e0' }}>
        <h4 style={{ marginBottom: '12px' }}>Alert Settings</h4>
        
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>
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
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>
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
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            fontSize: '0.9rem',
            cursor: 'pointer'
          }}>
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
