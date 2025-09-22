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
    // Create enhanced global system for integration
    window.GlobalNotificationSystem = {
      triggerAlert: triggerAccidentAlert,
      isEnabled: () => isAlertsEnabled,
      // Additional methods for integration
      getAlertCount: () => alertHistory.length,
      getActiveAlertCount: () => getActiveAlerts().length,
      getCurrentSettings: () => alertSettings,
      // Method for external systems to check if notifications are working
      testConnection: () => {
        console.log('GlobalNotificationSystem connection test - OK');
        return {
          status: 'connected',
          alertsEnabled: isAlertsEnabled,
          soundEnabled: soundEnabled,
          modalEnabled: alertSettings.modalNotifications,
          desktopEnabled: alertSettings.desktopNotifications,
          totalAlerts: alertHistory.length
        };
      }
    };

    // Log initialization for debugging
    console.log('🔔 GlobalNotificationSystem initialized:', {
      alertsEnabled: isAlertsEnabled,
      soundEnabled,
      modalNotifications: alertSettings.modalNotifications,
      desktopNotifications: alertSettings.desktopNotifications
    });

    return () => {
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
      if (window.GlobalNotificationSystem) {
        delete window.GlobalNotificationSystem;
      }
    };
  }, [isAlertsEnabled, soundEnabled, alertSettings, alertHistory]);

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
      return false;
    }

    const now = Date.now();
    
    if (isInCooldown(lastAlertRef.current, alertSettings.cooldownTime)) {
      console.log('⏳ Alert in cooldown period, skipping');
      return false;
    }

    lastAlertRef.current = now;
    const newAlert = createAlert(detectionData);
    
    console.log('📝 Created alert object:', newAlert);

    addAlert(newAlert);
    setActiveAlert(newAlert);

    const enhancedAlertData = { ...detectionData, alertId: newAlert.id };

    // Play sound
    playAlarmSound();

    // Show modal notification (in-page)
    showModalNotification(enhancedAlertData);

    // Show desktop notification (browser notification)
    const notificationTitle = detectionData.accident_detected ? 'ACCIDENT DETECTED!' : 'DETECTION ALERT';
    let notificationBody = `Confidence: ${((detectionData.confidence || 0) * 100).toFixed(1)}%`;
    
    // Add source-specific details
    if (detectionData.analysis_type === 'live_detection') {
      notificationBody = `Live Camera: ${notificationBody}`;
    } else if (detectionData.analysis_type === 'file_upload') {
      notificationBody = `File Upload: ${notificationBody} - ${detectionData.filename || 'Unknown file'}`;
    } else {
      notificationBody = `${detectionData.source || 'Detection System'}: ${notificationBody}`;
    }
    
    if (alertSettings.desktopNotifications) {
      showDesktopNotification(notificationTitle, notificationBody, { 
        urgency: 'critical',
        actions: [
          { action: 'acknowledge', title: 'Acknowledge' },
          { action: 'view', title: 'View Details' }
        ]
      });
    }

    // Auto-acknowledge if enabled
    if (alertSettings.autoAcknowledge) {
      alertTimeoutRef.current = setTimeout(() => {
        handleAcknowledgeAlert(newAlert.id);
      }, alertSettings.alertDuration * 1000);
    }

    console.log('🚀 All notification components triggered');
    return true; // Return success status
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
    const success = triggerAccidentAlert(testData);
    
    if (!success) {
      alert('Test alert failed - check console for details');
    }
  };

  // Test connection to external systems
  const testIntegration = () => {
    console.log('🔗 Testing integration connections...');
    
    // Check if upload system is available
    const uploadAvailable = typeof window !== 'undefined' && window.location.pathname.includes('/upload');
    
    // Check if live detection is available  
    const liveAvailable = typeof window !== 'undefined' && window.location.pathname.includes('/live');
    
    // Simulate integration test
    if (window.GlobalNotificationSystem) {
      const testResult = window.GlobalNotificationSystem.testConnection();
      console.log('Integration test result:', testResult);
      
      alert(`Integration Test Results:
Status: ${testResult.status}
Alerts Enabled: ${testResult.alertsEnabled}
Sound Enabled: ${testResult.soundEnabled}
Modal Enabled: ${testResult.modalEnabled}
Desktop Enabled: ${testResult.desktopEnabled}
Total Alerts: ${testResult.totalAlerts}

Upload System: ${uploadAvailable ? 'Available' : 'Not on upload page'}
Live Detection: ${liveAvailable ? 'Available' : 'Not on live page'}`);
    }
  };

  return (
    <div className="notification-container">
      
      {/* Header */}
      <div className="notification-header">
        <h1>Global Notification System</h1>
        <p>Real-time alerts from live detection and file uploads</p>
        {/* Integration Status Indicator */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          marginTop: '1rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: isAlertsEnabled ? '#d4edda' : '#f8d7da',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: '600'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isAlertsEnabled ? '#28a745' : '#dc3545'
            }} />
            System {isAlertsEnabled ? 'Active' : 'Disabled'}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: '#e8f4fd',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: '600'
          }}>
            📊 {alertHistory.length} Total Alerts
          </div>
        </div>
      </div>

      {/* Debug Panel */}
      <div className="debug-panel">
        <h4>🔧 Debug & Integration Panel</h4>
        <div className="debug-buttons">
          <button
            onClick={debugAlertHistory}
            style={{ backgroundColor: '#17a2b8' }}
          >
            Debug History
          </button>
          <button
            onClick={testIntegration}
            style={{ backgroundColor: '#28a745' }}
          >
            Test Integration
          </button>
          <button
            onClick={() => {
              const stats = getAlertStatistics();
              alert(`Alert Statistics:
Total: ${stats.total}
Active: ${stats.active}
Acknowledged: ${stats.acknowledged}
High Priority: ${stats.highPriority}
Live Detection: ${stats.liveDetection}
File Upload: ${stats.fileUpload}

Check console for detailed logs.`);
              console.log('Current Alert Statistics:', stats);
              console.log('Alert History:', alertHistory);
            }}
            style={{ backgroundColor: '#ffc107', color: '#212529' }}
          >
            Check Stats ({alertHistory.length})
          </button>
          <button
            onClick={() => {
              // Clear all integration data
              localStorage.removeItem('alertHistory');
              localStorage.removeItem('accidentDashboardLogs');
              localStorage.removeItem('detectionHistory');
              clearAllAlerts();
              alert('All integration data cleared!');
            }}
            style={{ backgroundColor: '#dc3545' }}
          >
            Clear All Data
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

      {/* Integration Instructions */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '20px',
        padding: '20px',
        marginTop: '16px',
        boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)'
      }}>
        <h4 style={{ color: '#0056b3', marginBottom: '12px' }}>📋 Integration Instructions</h4>
        <div style={{ fontSize: '0.9rem', color: '#666', lineHeight: '1.4' }}>
          <p><strong>For Upload Page:</strong> Add notification trigger after successful file analysis</p>
          <p><strong>For Live Detection:</strong> Add notification trigger in WebSocket message handler</p>
          <p><strong>Test Integration:</strong> Use the "Test Integration" button above to verify connections</p>
          <div style={{
            background: '#f8f9fa',
            padding: '12px',
            borderRadius: '8px',
            marginTop: '8px',
            fontFamily: 'monospace',
            fontSize: '0.8rem'
          }}>
            window.GlobalNotificationSystem.triggerAlert(detectionData)
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSystem;
