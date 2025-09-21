'use client';
import React, { useState, useEffect, useRef } from 'react';
import { DEFAULT_ALERT_SETTINGS } from './constants';
import { useAudio } from './useAudio';
import { useNotifications } from './useNotifications';
import { useAlertHistory } from './useAlertHistory';
import { createAlert, createTestAlert, isInCooldown } from './alertHelpers';
import AlertControls from './AlertControls';
import AlertHistory from './AlertHistory';
import ModalNotification from './ModalNotification';
import ActiveAlertBanner from './ActiveAlertBanner';
import AlertStatistics from './AlertStatistics';
import IntegrationStatus from './IntegrationStatus';
import './responsive-styles.css';

const NotificationSystem = () => {
  const [isAlertsEnabled, setIsAlertsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeAlert, setActiveAlert] = useState(null);
  const [alertSettings, setAlertSettings] = useState(DEFAULT_ALERT_SETTINGS);
  const [notificationModal, setNotificationModal] = useState({
    show: false,
    title: '',
    message: '',
    severity: 'medium',
    timestamp: null,
    alertId: null,
    autoClose: true,
    data: null
  });

  const lastAlertRef = useRef(0);
  const alertTimeoutRef = useRef(null);

  // Custom hooks
  const { playAlarmSound } = useAudio(soundEnabled);
  const { 
    notificationPermission, 
    notificationsEnabled, 
    requestNotificationPermission, 
    showDesktopNotification 
  } = useNotifications();
  const {
    alertHistory,
    addAlert,
    acknowledgeAlert,
    clearAllAlerts,
    getActiveAlerts,
    getAlertStatistics,
    debugAlertHistory
  } = useAlertHistory();

  // Initialize global notification system
  useEffect(() => {
    window.GlobalNotificationSystem = {
      triggerAlert: triggerAccidentAlert,
      isEnabled: () => isAlertsEnabled
    };

    return () => {
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
      if (window.GlobalNotificationSystem) {
        delete window.GlobalNotificationSystem;
      }
    };
  }, [isAlertsEnabled]);

  const showModalNotification = (alertData) => {
    if (!alertSettings.modalNotifications) return;

    const severity = alertData.confidence > 0.8 ? 'high' : 'medium';
    const source = alertData.source || 'Unknown Source';
    const location = alertData.location || 'Unknown Location';
    
    setNotificationModal({
      show: true,
      title: alertData.accident_detected ? 'ACCIDENT DETECTED!' : 'DETECTION ALERT',
      message: `Source: ${source}\nConfidence: ${(alertData.confidence * 100).toFixed(1)}%\nLocation: ${location}`,
      severity,
      timestamp: new Date(),
      alertId: alertData.alertId,
      autoClose: alertSettings.autoAcknowledge,
      data: alertData
    });

    if (alertSettings.autoAcknowledge) {
      setTimeout(() => {
        setNotificationModal(prev => ({ ...prev, show: false }));
      }, alertSettings.alertDuration * 1000);
    }
  };

  const triggerAccidentAlert = (detectionData) => {
    console.log('🚨 GlobalNotificationSystem.triggerAlert called with:', detectionData);
    
    if (!isAlertsEnabled) {
      console.log('⚠️ Alerts disabled, skipping notification');
      return;
    }

    const now = Date.now();
    
    if (isInCooldown(lastAlertRef.current, alertSettings.cooldownTime)) {
      console.log('⏳ Alert in cooldown period, skipping');
      return;
    }

    lastAlertRef.current = now;
    const newAlert = createAlert(detectionData);
    
    console.log('📝 Created alert object:', newAlert);

    addAlert(newAlert);
    setActiveAlert(newAlert);

    const enhancedAlertData = { ...detectionData, alertId: newAlert.id };

    playAlarmSound();
    showModalNotification(enhancedAlertData);

    const notificationTitle = detectionData.accident_detected ? 'ACCIDENT DETECTED!' : 'DETECTION ALERT';
    const notificationBody = `${detectionData.source || 'Detection System'}: ${((detectionData.confidence || 0) * 100).toFixed(1)}% confidence`;
    
    if (alertSettings.desktopNotifications) {
      showDesktopNotification(notificationTitle, notificationBody, { 
        urgency: 'critical',
        actions: [
          { action: 'acknowledge', title: 'Acknowledge' },
          { action: 'view', title: 'View Details' }
        ]
      });
    }

    if (alertSettings.autoAcknowledge) {
      alertTimeoutRef.current = setTimeout(() => {
        handleAcknowledgeAlert(newAlert.id);
      }, alertSettings.alertDuration * 1000);
    }

    console.log('🚀 All notification components triggered');
  };

  const handleAcknowledgeAlert = (alertId) => {
    console.log('✅ Acknowledging alert:', alertId);
    
    setActiveAlert(null);
    acknowledgeAlert(alertId);
    
    if (notificationModal.alertId === alertId) {
      setNotificationModal(prev => ({ ...prev, show: false }));
    }
    
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = null;
    }

    console.log('✅ Alert acknowledged successfully');
  };

  const testAlert = () => {
    console.log('🧪 Testing alert system');
    const testData = createTestAlert();
    triggerAccidentAlert(testData);
  };

  return (
    <div className="notification-container">
      
      {/* Header */}
      <div className="notification-header">
        <h1>Global Notification System</h1>
        <p>Real-time alerts from live detection and file uploads</p>
      </div>

      {/* Debug Panel */}
      <div className="debug-panel">
        <h4>🔧 Debug Panel</h4>
        <div className="debug-buttons">
          <button
            onClick={debugAlertHistory}
            style={{ backgroundColor: '#17a2b8' }}
          >
            Debug History
          </button>
          <button
            onClick={() => {
              const stats = getAlertStatistics();
              alert(`Current alert count: ${stats.total}\nCheck console for details`);
              console.log('Alert History State:', alertHistory);
            }}
            style={{ backgroundColor: '#ffc107', color: '#212529' }}
          >
            Check State ({alertHistory.length})
          </button>
        </div>
      </div>

      {/* Modal Notification */}
      <ModalNotification
        modal={notificationModal}
        onAcknowledge={(alertId) => {
          handleAcknowledgeAlert(alertId);
          setNotificationModal(prev => ({ ...prev, show: false }));
        }}
        onDismiss={() => setNotificationModal(prev => ({ ...prev, show: false }))}
        alertSettings={alertSettings}
      />

      {/* Active Alert Banner */}
      <ActiveAlertBanner
        activeAlert={activeAlert}
        onViewDetails={() => setNotificationModal(prev => ({ ...prev, show: true }))}
        onAcknowledge={handleAcknowledgeAlert}
        showModal={!notificationModal.show}
      />

      <div className="mobile-grid">
        
        {/* Alert Controls */}
        <AlertControls
          isAlertsEnabled={isAlertsEnabled}
          setIsAlertsEnabled={setIsAlertsEnabled}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
          alertSettings={alertSettings}
          setAlertSettings={setAlertSettings}
          notificationPermission={notificationPermission}
          requestNotificationPermission={requestNotificationPermission}
          onTestAlert={testAlert}
          onClearAll={clearAllAlerts}
        />

        {/* Alert History */}
        <AlertHistory
          alertHistory={alertHistory}
          onAcknowledge={handleAcknowledgeAlert}
        />
      </div>

      {/* Statistics */}
      <AlertStatistics statistics={getAlertStatistics()} />

      {/* Integration Status */}
      <IntegrationStatus />
    </div>
  );
};

export default NotificationSystem;
