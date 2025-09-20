import { useState, useEffect, useMemo, useCallback } from 'react';

export const useDashboardData = (alerts) => {
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());
  const [serverStats, setServerStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get API configuration
  const getApiConfig = () => {
    const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://accident-prediction-7i4e.onrender.com';
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    return {
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    };
  };

  // Fetch stats from your FastAPI backend
  const fetchServerStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { baseURL, headers } = getApiConfig();
      const response = await fetch(`${baseURL}/api/dashboard/user/stats`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please login.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setServerStats({
          total_alerts: data.total_alerts || 0,
          unread_alerts: data.unread_alerts || 0,
          last_24h_detections: data.last_24h_detections || 0,
          user_uploads: data.user_uploads || 0,
          user_accuracy: data.user_accuracy || "N/A",
          department: data.department || "General",
          user_info: data.user_info,
          source: data.source || 'server'
        });
        
        console.log(`Loaded stats from ${data.source || 'server'} source`);
      } else {
        throw new Error(data.error || 'Failed to fetch stats');
      }
      
    } catch (err) {
      console.error('Failed to fetch server stats:', err);
      setError(err.message);
      // Don't set serverStats to null, keep previous data if available
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate client-side stats from alerts
  const clientStats = useMemo(() => {
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

    const unreadAlerts = alerts.filter(a => !a.read);

    return {
      total_alerts: alerts.length,
      unread_alerts: unreadAlerts.length,
      last_24h_detections: last24hAlerts.length,
      user_accuracy: "N/A" // This would come from server
    };
  }, [alerts]);

  // Combine server stats with client stats (server takes priority)
  const stats = useMemo(() => {
    if (serverStats) {
      return {
        ...clientStats,
        ...serverStats,
        // Always use client-side unread count as it's more up-to-date
        unread_alerts: clientStats.unread_alerts
      };
    }
    return clientStats;
  }, [serverStats, clientStats]);

  // Fetch server stats on mount and when alerts change significantly
  useEffect(() => {
    fetchServerStats();
  }, [fetchServerStats]);

  // Auto-refresh server stats every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchServerStats();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchServerStats]);

  // Update last update time periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdateTime(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setLastUpdateTime(new Date());
    fetchServerStats();
    console.log('Dashboard refreshed at:', new Date().toLocaleTimeString());
  }, [fetchServerStats]);

  // Performance metrics (calculated from alerts)
  const performanceMetrics = useMemo(() => {
    if (!alerts || alerts.length === 0) {
      return {
        high_confidence: 0,
        medium_confidence: 0,
        low_confidence: 0,
        average_confidence: '0%'
      };
    }

    const highConfidenceAlerts = alerts.filter(a => a.confidence && a.confidence > 0.8).length;
    const mediumConfidenceAlerts = alerts.filter(a => a.confidence && a.confidence > 0.6 && a.confidence <= 0.8).length;
    const lowConfidenceAlerts = alerts.filter(a => a.confidence && a.confidence <= 0.6).length;

    const avgConfidence = alerts.length > 0 
      ? (alerts.reduce((sum, alert) => sum + (alert.confidence || 0), 0) / alerts.length * 100).toFixed(1) + '%'
      : '0%';

    return {
      high_confidence: highConfidenceAlerts,
      medium_confidence: mediumConfidenceAlerts,
      low_confidence: lowConfidenceAlerts,
      average_confidence: avgConfidence
    };
  }, [alerts]);

  // System health metrics
  const systemHealth = useMemo(() => ({
    status: error ? 'degraded' : 'operational',
    uptime: '99.9%',
    last_maintenance: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    connection_status: error ? 'disconnected' : 'connected',
    data_source: serverStats?.source || 'client'
  }), [error, serverStats]);

  // User info from server stats
  const userInfo = useMemo(() => {
    if (serverStats?.user_info) {
      return serverStats.user_info;
    }
    
    // Try to get basic user info from localStorage or token
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token) {
        // You could decode the JWT token here to get user info
        // For now, return basic info
        return {
          username: 'Current User',
          department: stats.department || 'General',
          user_type: 'user'
        };
      }
    } catch (err) {
      console.error('Failed to get user info:', err);
    }
    
    return null;
  }, [serverStats, stats.department]);

  return {
    stats,
    lastUpdateTime,
    handleRefresh,
    performanceMetrics,
    systemHealth,
    userInfo,
    loading,
    error,
    serverStats,
    fetchServerStats
  };
};
