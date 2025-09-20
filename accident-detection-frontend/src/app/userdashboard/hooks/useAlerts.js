import { useState, useEffect } from 'react';
import { getDemoAlerts } from '../data/demoData';

export const useAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [filter, setFilter] = useState('all');
  const [readAlerts, setReadAlerts] = useState(new Set());

  // Initialize with demo data
  useEffect(() => {
    const demoAlerts = getDemoAlerts();
    setAlerts(demoAlerts);
  }, []);

  // Mark alert as read
  const markAlertAsRead = (alertId) => {
    const newReadAlerts = new Set(readAlerts);
    newReadAlerts.add(alertId);
    setReadAlerts(newReadAlerts);
    
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, read: true }
        : alert
    ));
  };

  // Check if alert is read
  const isAlertRead = (alert) => {
    return alert.read || readAlerts.has(alert.id);
  };

  // Filter alerts based on current filter
  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'unread') return !alert.read && !readAlerts.has(alert.id);
    if (filter === 'high_priority') return alert.severity === 'high';
    return true;
  });

  // Calculate unread count
  const unreadCount = alerts.filter(alert => !alert.read && !readAlerts.has(alert.id)).length;

  // Add new alert (for future real-time functionality)
  const addAlert = (newAlert) => {
    setAlerts(prev => [newAlert, ...prev]);
  };

  // Remove alert
  const removeAlert = (alertId) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  // Mark all alerts as read
  const markAllAsRead = () => {
    const allAlertIds = new Set(alerts.map(alert => alert.id));
    setReadAlerts(allAlertIds);
    setAlerts(prev => prev.map(alert => ({ ...alert, read: true })));
  };

  return {
    alerts,
    filteredAlerts,
    selectedAlert,
    setSelectedAlert,
    filter,
    setFilter,
    readAlerts,
    markAlertAsRead,
    isAlertRead,
    unreadCount,
    addAlert,
    removeAlert,
    markAllAsRead
  };
};
