import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS, UI_CONFIG } from './constants';
import { saveToStorage, loadFromStorage, validateAlertHistory, triggerStorageEvent } from './storageUtils';

export const useAlertHistory = () => {
  const [alertHistory, setAlertHistory] = useState([]);

  // Load alert history from localStorage on mount
  useEffect(() => {
    loadAlertHistory();
    
    // Listen for storage events to sync between tabs
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEYS.ALERT_HISTORY) {
        console.log('Storage event detected, reloading alert history');
        loadAlertHistory();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const loadAlertHistory = useCallback(() => {
    const savedHistory = loadFromStorage(STORAGE_KEYS.ALERT_HISTORY, []);
    const validatedHistory = validateAlertHistory(savedHistory);
    setAlertHistory(validatedHistory);
    console.log('Alert history loaded:', validatedHistory.length, 'alerts');
  }, []);

  const saveAlertHistory = useCallback((newHistory) => {
    const success = saveToStorage(STORAGE_KEYS.ALERT_HISTORY, newHistory);
    if (success) {
      triggerStorageEvent(STORAGE_KEYS.ALERT_HISTORY, newHistory, alertHistory);
    }
    return success;
  }, [alertHistory]);

  const addAlert = useCallback((newAlert) => {
    setAlertHistory(currentHistory => {
      const updatedHistory = [newAlert, ...currentHistory.slice(0, UI_CONFIG.MAX_HISTORY_ITEMS - 1)];
      saveAlertHistory(updatedHistory);
      return updatedHistory;
    });
  }, [saveAlertHistory]);

  const acknowledgeAlert = useCallback((alertId) => {
    setAlertHistory(currentHistory => {
      const updatedHistory = currentHistory.map(alert => 
        alert.id === alertId 
          ? { ...alert, acknowledged: true, acknowledgedAt: new Date().toISOString() }
          : alert
      );
      saveAlertHistory(updatedHistory);
      return updatedHistory;
    });
  }, [saveAlertHistory]);

  const clearAllAlerts = useCallback(() => {
    setAlertHistory([]);
    saveAlertHistory([]);
    console.log('All alerts cleared');
  }, [saveAlertHistory]);

  const getAlertById = useCallback((alertId) => {
    return alertHistory.find(alert => alert.id === alertId);
  }, [alertHistory]);

  const getActiveAlerts = useCallback(() => {
    return alertHistory.filter(alert => !alert.acknowledged);
  }, [alertHistory]);

  const getAlertStatistics = useCallback(() => {
    return {
      total: alertHistory.length,
      active: alertHistory.filter(a => !a.acknowledged).length,
      acknowledged: alertHistory.filter(a => a.acknowledged).length,
      highPriority: alertHistory.filter(a => a.severity === 'high').length,
      liveDetection: alertHistory.filter(a => a.source && a.source.includes('Live')).length,
      fileUpload: alertHistory.filter(a => a.source && (a.source.includes('Upload') || a.source.includes('File'))).length
    };
  }, [alertHistory]);

  const debugAlertHistory = useCallback(() => {
    console.log('=== DEBUG ALERT HISTORY ===');
    const stored = localStorage.getItem(STORAGE_KEYS.ALERT_HISTORY);
    console.log('Raw localStorage data:', stored ? 'Data found' : 'No data');
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log('Parsed data count:', parsed.length);
        console.log('Latest 3 alerts:', parsed.slice(0, 3));
      } catch (e) {
        console.error('Parse error:', e);
      }
    }
    
    console.log('Current state alertHistory:', alertHistory);
    console.log('Current state count:', alertHistory.length);
    console.log('===============================');
  }, [alertHistory]);

  return {
    alertHistory,
    addAlert,
    acknowledgeAlert,
    clearAllAlerts,
    getAlertById,
    getActiveAlerts,
    getAlertStatistics,
    loadAlertHistory,
    debugAlertHistory
  };
};
