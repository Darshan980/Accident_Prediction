'use client';
import React, { useState, useEffect, useRef } from 'react';

const GlobalNotificationSystem = () => {
  const [isAlertsEnabled, setIsAlertsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [alertHistory, setAlertHistory] = useState([]);
  const [activeAlert, setActiveAlert] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [alertSettings, setAlertSettings] = useState({
    sensitivity: 'medium',
    cooldownTime: 10,
    autoAcknowledge: true,
    alertDuration: 5,
    modalNotifications: true,
    desktopNotifications: true,
    emailAlerts: false,
    smsAlerts: false
  });

  const audioRef = useRef(null);
  const lastAlertRef = useRef(0);
  const alertTimeoutRef = useRef(null);

  // Enhanced notification modal state
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

  // Initialize system
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    if (soundEnabled) {
      initializeAudio();
    }

    // Load saved alert history from localStorage
    loadAlertHistory();

    // Create global notification system
    window.GlobalNotificationSystem = {
      triggerAlert: triggerAccidentAlert,
      isEnabled: () => isAlertsEnabled
    };

    // Listen for storage events to sync between tabs
    const handleStorageChange = (e) => {
      if (e.key === 'alertHistory') {
        console.log('Storage event detected, reloading alert history');
        loadAlertHistory();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
      window.removeEventListener('storage', handleStorageChange);
      // Cleanup global reference
      if (window.GlobalNotificationSystem) {
        delete window.GlobalNotificationSystem;
      }
    };
  }, [soundEnabled, isAlertsEnabled]);

  // FIXED: Enhanced alert history loading with better error handling
  const loadAlertHistory = () => {
    try {
      const savedHistory = localStorage.getItem('alertHistory');
      console.log('Loading alert history from localStorage:', savedHistory ? 'Found data' : 'No data');
      
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        console.log('Parsed alert history:', parsedHistory.length, 'alerts');
        
        // Validate and clean the data
        const validatedHistory = parsedHistory.filter(alert => {
          return alert && alert.id && alert.timestamp;
        });
        
        setAlertHistory(validatedHistory);
        console.log('Loaded', validatedHistory.length, 'valid alerts');
      } else {
        setAlertHistory([]);
        console.log('No alert history found, initialized empty array');
      }
    } catch (error) {
      console.error('Failed to load alert history:', error);
      setAlertHistory([]);
    }
  };

  // FIXED: Enhanced alert history saving
  const saveAlertHistory = (newHistory) => {
    try {
      const dataToSave = JSON.stringify(newHistory);
      localStorage.setItem('alertHistory', dataToSave);
      console.log('Alert history saved successfully:', newHistory.length, 'alerts');
      
      // Also trigger storage event for cross-tab sync
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'alertHistory',
        newValue: dataToSave,
        oldValue: localStorage.getItem('alertHistory'),
        url: window.location.href
      }));
      
    } catch (error) {
      console.error('Failed to save alert history:', error);
    }
  };

  const initializeAudio = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const createAlarmSound = () => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      
      return { oscillator, gainNode };
    };

    audioRef.current = createAlarmSound;
  };

  const playAlarmSound = () => {
    if (soundEnabled && audioRef.current) {
      try {
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            audioRef.current();
          }, i * 400);
        }
      } catch (error) {
        console.warn('Audio playback failed:', error);
      }
    }
  };

  const showDesktopNotification = (title, body, options = {}) => {
    if (!alertSettings.desktopNotifications || notificationPermission !== 'granted') {
      return;
    }

    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      requireInteraction: true,
      tag: 'accident-detection',
      ...options
    });

    notification.onclick = () => {
      window.focus();
      setShowNotificationModal(true);
      notification.close();
    };

    setTimeout(() => {
      notification.close();
    }, 10000);
  };

  const showModalNotification = (alertData) => {
    if (!alertSettings.modalNotifications) {
      return;
    }

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

    // Auto-close modal if enabled
    if (alertSettings.autoAcknowledge) {
      setTimeout(() => {
        setNotificationModal(prev => ({ ...prev, show: false }));
      }, alertSettings.alertDuration * 1000);
    }
  };

  // FIXED: Enhanced alert triggering with proper data handling
  const triggerAccidentAlert = (detectionData) => {
    console.log('🚨 GlobalNotificationSystem.triggerAlert called with:', detectionData);
    
    if (!isAlertsEnabled) {
      console.log('⚠️ Alerts disabled, skipping notification');
      return;
    }

    const now = Date.now();
    
    // Check cooldown
    if (now - lastAlertRef.current < alertSettings.cooldownTime * 1000) {
      console.log('⏳ Alert in cooldown period, skipping');
      return;
    }

    lastAlertRef.current = now;

    const alertId = `alert-${now}-${Math.random().toString(36).substr(2, 9)}`;
    
    // FIXED: Create alert with comprehensive data structure
    const newAlert = {
      id: alertId,
      timestamp: new Date().toISOString(),
      type: 'accident',
      confidence: detectionData.confidence || 0,
      location: detectionData.location || detectionData.source || 'Unknown Location',
      source: detectionData.source || 'Unknown Source',
      acknowledged: false,
      severity: (detectionData.confidence || 0) > 0.8 ? 'high' : 'medium',
      accident_detected: detectionData.accident_detected || false,
      predicted_class: detectionData.predicted_class || 'Unknown',
      frame_id: detectionData.frame_id || `FRAME_${now}`,
      filename: detectionData.filename || 'Unknown file',
      processing_time: detectionData.processing_time || 0,
      analysis_type: detectionData.analysis_type || 'Unknown Analysis',
      content_type: detectionData.content_type || 'Unknown',
      file_size: detectionData.file_size || 0,
      // Additional metadata
      created_at: now,
      dismissed: false,
      title: detectionData.accident_detected ? 'ACCIDENT DETECTED!' : 'DETECTION ALERT',
      description: `Confidence: ${((detectionData.confidence || 0) * 100).toFixed(1)}% at ${detectionData.source || 'Unknown'}`
    };

    console.log('📝 Created alert object:', newAlert);

    // Add enhanced alert data for modal/notifications
    const enhancedAlertData = {
      ...detectionData,
      alertId
    };

    // FIXED: Update history with proper state management
    const currentHistory = [...alertHistory];
    const updatedHistory = [newAlert, ...currentHistory.slice(0, 49)];
    
    console.log('📊 Updating history:', {
      current: currentHistory.length,
      adding: newAlert.id,
      newTotal: updatedHistory.length
    });

    // Update state and save to localStorage
    setAlertHistory(updatedHistory);
    saveAlertHistory(updatedHistory);
    setActiveAlert(newAlert);

    console.log('✅ Alert added to history and state updated');

    // Play sound
    playAlarmSound();

    // Show modal notification (in-page)
    showModalNotification(enhancedAlertData);

    // Show desktop notification (browser notification)
    const notificationTitle = detectionData.accident_detected ? 'ACCIDENT DETECTED!' : 'DETECTION ALERT';
    const notificationBody = `${detectionData.source || 'Detection System'}: ${((detectionData.confidence || 0) * 100).toFixed(1)}% confidence`;
    
    showDesktopNotification(
      notificationTitle,
      notificationBody,
      { 
        urgency: 'critical',
        actions: [
          { action: 'acknowledge', title: 'Acknowledge' },
          { action: 'view', title: 'View Details' }
        ]
      }
    );

    // Auto-acknowledge if enabled
    if (alertSettings.autoAcknowledge) {
      alertTimeoutRef.current = setTimeout(() => {
        acknowledgeAlert(alertId);
      }, alertSettings.alertDuration * 1000);
    }

    console.log('🚀 All notification components triggered');
  };

  const acknowledgeAlert = (alertId) => {
    console.log('✅ Acknowledging alert:', alertId);
    
    setActiveAlert(null);
    
    const updatedHistory = alertHistory.map(alert => 
      alert.id === alertId 
        ? { ...alert, acknowledged: true, acknowledgedAt: new Date().toISOString() }
        : alert
    );
    
    setAlertHistory(updatedHistory);
    saveAlertHistory(updatedHistory);
    
    // Close modal if it's showing this alert
    if (notificationModal.alertId === alertId) {
      setNotificationModal(prev => ({ ...prev, show: false }));
    }
    
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = null;
    }

    console.log('✅ Alert acknowledged successfully');
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        showDesktopNotification('Notifications Enabled', 'You will now receive accident detection alerts');
      }
    }
  };

  const clearAllAlerts = () => {
    console.log('🗑️ Clearing all alerts');
    setAlertHistory([]);
    saveAlertHistory([]);
    setActiveAlert(null);
    console.log('✅ All alerts cleared');
  };

  const testAlert = () => {
    console.log('🧪 Testing alert system');
    const testData = {
      confidence: 0.85,
      accident_detected: true,
      source: 'Test Alert System',
      location: 'Test Location',
      predicted_class: 'accident',
      frame_id: 'TEST_001',
      filename: 'test-file.jpg',
      timestamp: new Date().toISOString(),
      processing_time: 1.25,
      analysis_type: 'manual_test',
      content_type: 'image/jpeg',
      file_size: 1024000
    };
    
    triggerAccidentAlert(testData);
  };

  // FIXED: Add debug function to check localStorage directly
  const debugAlertHistory = () => {
    console.log('=== DEBUG ALERT HISTORY ===');
    const stored = localStorage.getItem('alertHistory');
    console.log('Raw localStorage data:', stored);
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log('Parsed data:', parsed);
        console.log('Count:', parsed.length);
        console.log('Latest 3 alerts:', parsed.slice(0, 3));
      } catch (e) {
        console.error('Parse error:', e);
      }
    }
    
    console.log('Current state alertHistory:', alertHistory);
    console.log('Current state count:', alertHistory.length);
    console.log('===============================');
  };

  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '20px',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh',
      position: 'relative'
    }}>
      
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 'bold', 
          color: '#333',
          marginBottom: '8px',
          textAlign: 'center'
        }}>
          Global Notification System
        </h1>
        <p style={{ 
          color: '#666', 
          textAlign: 'center',
          fontSize: '1.1rem'
        }}>
          Real-time alerts from live detection and file uploads
        </p>
      </div>

      {/* Debug Panel (temporary - for development) */}
      <div style={{
        backgroundColor: '#fff3cd',
        border: '1px solid #ffeaa7',
        borderRadius: '6px',
        padding: '1rem',
        marginBottom: '1rem'
      }}>
        <h4 style={{ color: '#856404', marginBottom: '0.5rem' }}>🔧 Debug Panel</h4>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={debugAlertHistory}
            style={{
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.8rem'
            }}
          >
            Debug History
          </button>
          <button
            onClick={loadAlertHistory}
            style={{
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.8rem'
            }}
          >
            Reload History
          </button>
          <button
            onClick={() => {
              const count = alertHistory.length;
              alert(`Current alert count: ${count}\nCheck console for details`);
              console.log('Alert History State:', alertHistory);
            }}
            style={{
              backgroundColor: '#ffc107',
              color: '#212529',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.8rem'
            }}
          >
            Check State ({alertHistory.length})
          </button>
        </div>
      </div>

      {/* Modal Notification Overlay */}
      {notificationModal.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: notificationModal.severity === 'high' ? '#dc3545' : '#ff6b35',
            color: 'white',
            padding: '40px',
            borderRadius: '16px',
            maxWidth: '600px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            animation: 'modalPulse 1s infinite alternate',
            position: 'relative'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>⚠️</div>
            
            <h2 style={{ 
              margin: '0 0 16px 0', 
              fontSize: '2rem', 
              fontWeight: 'bold',
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
            }}>
              {notificationModal.title}
            </h2>
            
            <div style={{ 
              margin: '0 0 24px 0', 
              fontSize: '1.2rem',
              opacity: 0.9,
              whiteSpace: 'pre-line'
            }}>
              {notificationModal.message}
            </div>

            {/* Additional details if available */}
            {notificationModal.data && (
              <div style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '0.95rem'
              }}>
                {notificationModal.data.predicted_class && (
                  <div>Prediction: {notificationModal.data.predicted_class}</div>
                )}
                {notificationModal.data.frame_id && (
                  <div>Frame ID: {notificationModal.data.frame_id}</div>
                )}
                {notificationModal.data.filename && (
                  <div>File: {notificationModal.data.filename}</div>
                )}
                {notificationModal.data.processing_time && (
                  <div>Processing Time: {notificationModal.data.processing_time}s</div>
                )}
              </div>
            )}
            
            <div style={{ 
              fontSize: '0.9rem', 
              opacity: 0.8, 
              marginBottom: '24px' 
            }}>
              Time: {notificationModal.timestamp?.toLocaleTimeString()}
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  acknowledgeAlert(notificationModal.alertId);
                  setNotificationModal(prev => ({ ...prev, show: false }));
                }}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '2px solid rgba(255,255,255,0.3)',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  backdropFilter: 'blur(10px)'
                }}
              >
                ACKNOWLEDGE
              </button>
              
              <button
                onClick={() => setNotificationModal(prev => ({ ...prev, show: false }))}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  border: '2px solid rgba(255,255,255,0.2)',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                DISMISS
              </button>
            </div>

            {/* Auto-close countdown */}
            {notificationModal.autoClose && (
              <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '0.8rem',
                opacity: 0.7
              }}>
                Auto-closes in {alertSettings.alertDuration}s
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Alert Banner */}
      {activeAlert && !notificationModal.show && (
        <div style={{
          backgroundColor: '#dc3545',
          color: 'white',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          position: 'relative',
          animation: 'pulse 1s infinite',
          boxShadow: '0 4px 12px rgba(220, 53, 69, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '2rem' }}>⚠️</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 'bold' }}>
                {activeAlert.accident_detected ? 'ACCIDENT DETECTED!' : 'DETECTION ALERT'}
              </h3>
              <p style={{ margin: '4px 0 0 0', opacity: 0.9 }}>
                {activeAlert.source} • Confidence: {(activeAlert.confidence * 100).toFixed(1)}% • 
                Location: {activeAlert.location} • 
                {new Date(activeAlert.timestamp).toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={() => {
                acknowledgeAlert(activeAlert.id);
                setShowNotificationModal(true);
              }}
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 'bold'
              }}
            >
              VIEW DETAILS
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* Alert Controls */}
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
              onClick={testAlert}
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
              onClick={clearAllAlerts}
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
          </div>
        </div>

        {/* Alert History */}
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
            <span style={{ fontSize: '1.2rem' }}>📋</span>
            Alert History
            <span style={{ 
              backgroundColor: '#0070f3',
              color: 'white',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.8rem'
            }}>
              {alertHistory.length}
            </span>
          </h2>

          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {alertHistory.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px 20px',
                color: '#666'
              }}>
                <div style={{ fontSize: '3rem', opacity: 0.3, marginBottom: '16px' }}>🔔</div>
                <h3>No Alerts Yet</h3>
                <p>Real accident detection alerts from live camera and uploads will appear here</p>
              </div>
            ) : (
              alertHistory.map((alert) => (
                <div
                  key={alert.id}
                  style={{
                    border: `2px solid ${alert.acknowledged ? '#28a745' : '#dc3545'}`,
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '12px',
                    backgroundColor: alert.acknowledged ? '#f8fff9' : '#fff5f5'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '1rem' }}>
                      {alert.acknowledged ? '✅' : '⚠️'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <strong style={{ color: alert.acknowledged ? '#28a745' : '#dc3545' }}>
                        {alert.acknowledged ? 'Alert Acknowledged' : 'ACTIVE ALERT'}
                      </strong>
                      <div style={{ fontSize: '0.9rem', color: '#666' }}>
                        {new Date(alert.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div style={{
                      backgroundColor: alert.severity === 'high' ? '#dc3545' : '#ffc107',
                      color: alert.severity === 'high' ? 'white' : '#212529',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 'bold'
                    }}>
                      {alert.severity.toUpperCase()}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem', marginBottom: '8px' }}>
                    <div>
                      <strong>Source:</strong> {alert.source}
                    </div>
                    <div>
                      <strong>Confidence:</strong> {(alert.confidence * 100).toFixed(1)}%
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '0.8rem' }}>📍</span>
                      {alert.location}
                    </div>
                    {alert.predicted_class && (
                      <div>
                        <strong>Class:</strong> {alert.predicted_class}
                      </div>
                    )}
                  </div>

                  {(alert.frame_id || alert.filename || alert.processing_time) && (
                    <div style={{ 
                      fontSize: '0.8rem', 
                      color: '#666',
                      backgroundColor: '#f8f9fa',
                      padding: '8px',
                      borderRadius: '4px',
                      marginBottom: '8px'
                    }}>
                      {alert.frame_id && <div>Frame ID: {alert.frame_id}</div>}
                      {alert.filename && <div>File: {alert.filename}</div>}
                      {alert.processing_time && <div>Processing Time: {alert.processing_time}s</div>}
                      {alert.analysis_type && <div>Type: {alert.analysis_type}</div>}
                    </div>
                  )}

                  {alert.acknowledgedAt && (
                    <div style={{
                      marginTop: '8px',
                      paddingTop: '8px',
                      borderTop: '1px solid #e0e0e0',
                      fontSize: '0.8rem',
                      color: '#666'
                    }}>
                      Acknowledged: {new Date(alert.acknowledgedAt).toLocaleString()}
                    </div>
                  )}

                  {!alert.acknowledged && (
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      style={{
                        marginTop: '12px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        marginTop: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>Alert Statistics</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0070f3' }}>
              {alertHistory.length}
            </div>
            <div style={{ color: '#666' }}>Total Alerts</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#dc3545' }}>
              {alertHistory.filter(a => !a.acknowledged).length}
            </div>
            <div style={{ color: '#666' }}>Active Alerts</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>
              {alertHistory.filter(a => a.acknowledged).length}
            </div>
            <div style={{ color: '#666' }}>Acknowledged</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ffc107' }}>
              {alertHistory.filter(a => a.severity === 'high').length}
            </div>
            <div style={{ color: '#666' }}>High Priority</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#17a2b8' }}>
              {alertHistory.filter(a => a.source && a.source.includes('Live')).length}
            </div>
            <div style={{ color: '#666' }}>Live Detection</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#6f42c1' }}>
              {alertHistory.filter(a => a.source && (a.source.includes('Upload') || a.source.includes('File'))).length}
            </div>
            <div style={{ color: '#666' }}>File Upload</div>
          </div>
        </div>
      </div>

      {/* Integration Status */}
      <div style={{
        backgroundColor: '#e8f4fd',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #b3d9ff',
        marginTop: '20px',
        textAlign: 'center'
      }}>
        <h4 style={{ marginBottom: '12px', color: '#0056b3' }}>🔗 Integration Status</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={{
            backgroundColor: 'white',
            padding: '12px',
            borderRadius: '6px',
            border: '1px solid #b3d9ff'
          }}>
            <div style={{ fontWeight: 'bold', color: '#0056b3', marginBottom: '4px' }}>
              📹 Live Detection
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>
              Ready to receive alerts from live camera feed
            </div>
          </div>
          <div style={{
            backgroundColor: 'white',
            padding: '12px',
            borderRadius: '6px',
            border: '1px solid #b3d9ff'
          }}>
            <div style={{ fontWeight: 'bold', color: '#0056b3', marginBottom: '4px' }}>
              📁 File Upload
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>
              Ready to receive alerts from uploaded files
            </div>
          </div>
          <div style={{
            backgroundColor: 'white',
            padding: '12px',
            borderRadius: '6px',
            border: '1px solid #b3d9ff'
          }}>
            <div style={{ fontWeight: 'bold', color: '#0056b3', marginBottom: '4px' }}>
              💾 Persistent Storage
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>
              All alerts saved to localStorage permanently
            </div>
          </div>
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        
        @keyframes modalPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
};

export default GlobalNotificationSystem;