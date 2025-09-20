import { useState, useEffect, useMemo } from 'react';

export const useDashboardData = (alerts) => {
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());

  // Calculate stats from alerts
  const stats = useMemo(() => {
    if (!alerts || alerts.length === 0) {
      return {
        total_alerts: 0,
        unread_alerts: 0,
        last_24h_detections: 0,
        user_accuracy: "0%"
      };
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const last24hAlerts = alerts.filter(alert => 
      new Date(alert.timestamp) >= oneDayAgo
    );

    return {
      total_alerts: alerts.length,
      unread_alerts: alerts.filter(a => !a.read).length,
      last_24h_detections: last24hAlerts.length,
      user_accuracy: "94.5%" // This could be calculated based on user feedback
    };
  }, [alerts]);

  // Handle refresh
  const handleRefresh = () => {
    setLastUpdateTime(new Date());
    // In a real app, this would trigger a data refetch
    console.log('Dashboard refreshed at:', new Date().toLocaleTimeString());
  };

  // Auto-refresh every 30 seconds (optional)
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdateTime(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Performance metrics (could be expanded)
  const performanceMetrics = useMemo(() => {
    const highConfidenceAlerts = alerts.filter(a => a.confidence && a.confidence > 0.8).length;
    const mediumConfidenceAlerts = alerts.filter(a => a.confidence && a.confidence > 0.6 && a.confidence <= 0.8).length;
    const lowConfidenceAlerts = alerts.filter(a => a.confidence && a.confidence <= 0.6).length;

    return {
      high_confidence: highConfidenceAlerts,
      medium_confidence: mediumConfidenceAlerts,
      low_confidence: lowConfidenceAlerts,
      average_confidence: alerts.length > 0 
        ? (alerts.reduce((sum, alert) => sum + (alert.confidence || 0), 0) / alerts.length * 100).toFixed(1) + '%'
        : '0%'
    };
  }, [alerts]);

  // System health metrics
  const systemHealth = {
    status: 'operational',
    uptime: '99.9%',
    last_maintenance: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
  };

  return {
    stats,
    lastUpdateTime,
    handleRefresh,
    performanceMetrics,
    systemHealth
  };
};
