import { ALERT_TYPES, SEVERITY_LEVELS } from '../constants/alertTypes';

/**
 * Get severity level color class
 */
export const getSeverityColor = (severity) => {
  const colors = {
    high: 'red',
    medium: 'yellow',
    low: 'green'
  };
  return colors[severity] || 'gray';
};

/**
 * Get alert type display name
 */
export const getAlertTypeDisplayName = (type) => {
  return ALERT_TYPES[type] || type?.replace(/_/g, ' ') || 'Unknown';
};

/**
 * Format confidence percentage
 */
export const formatConfidence = (confidence) => {
  if (!confidence) return 'N/A';
  return `${(confidence * 100).toFixed(1)}%`;
};

/**
 * Get confidence level description
 */
export const getConfidenceLevel = (confidence) => {
  if (!confidence) return 'Unknown';
  if (confidence >= 0.9) return 'Very High';
  if (confidence >= 0.8) return 'High';
  if (confidence >= 0.6) return 'Medium';
  if (confidence >= 0.4) return 'Low';
  return 'Very Low';
};

/**
 * Sort alerts by priority and timestamp
 */
export const sortAlerts = (alerts, sortBy = 'priority') => {
  return [...alerts].sort((a, b) => {
    switch (sortBy) {
      case 'priority':
        // Sort by severity first, then by timestamp
        const severityOrder = { high: 3, medium: 2, low: 1 };
        const severityDiff = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
        if (severityDiff !== 0) return severityDiff;
        return new Date(b.timestamp) - new Date(a.timestamp);
        
      case 'timestamp':
        return new Date(b.timestamp) - new Date(a.timestamp);
        
      case 'confidence':
        return (b.confidence || 0) - (a.confidence || 0);
        
      case 'location':
        return (a.location || '').localeCompare(b.location || '');
        
      default:
        return 0;
    }
  });
};

/**
 * Filter alerts by criteria
 */
export const filterAlerts = (alerts, filters) => {
  return alerts.filter(alert => {
    // Filter by severity
    if (filters.severity && filters.severity.length > 0) {
      if (!filters.severity.includes(alert.severity)) return false;
    }
    
    // Filter by type
    if (filters.type && filters.type.length > 0) {
      if (!filters.type.includes(alert.type)) return false;
    }
    
    // Filter by read status
    if (filters.readStatus) {
      if (filters.readStatus === 'read' && !alert.read) return false;
      if (filters.readStatus === 'unread' && alert.read) return false;
    }
    
    // Filter by confidence threshold
    if (filters.minConfidence) {
      if (!alert.confidence || alert.confidence < filters.minConfidence) return false;
    }
    
    // Filter by date range
    if (filters.dateFrom || filters.dateTo) {
      const alertDate = new Date(alert.timestamp);
      if (filters.dateFrom && alertDate < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && alertDate > new Date(filters.dateTo)) return false;
    }
    
    // Filter by search term
    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      const searchableText = `${alert.message} ${alert.location} ${alert.type}`.toLowerCase();
      if (!searchableText.includes(searchTerm)) return false;
    }
    
    return true;
  });
};

/**
 * Group alerts by criteria
 */
export const groupAlerts = (alerts, groupBy = 'severity') => {
  return alerts.reduce((groups, alert) => {
    let key;
    
    switch (groupBy) {
      case 'severity':
        key = alert.severity || 'unknown';
        break;
      case 'type':
        key = alert.type || 'unknown';
        break;
      case 'date':
        key = new Date(alert.timestamp).toDateString();
        break;
      case 'location':
        key = alert.location || 'unknown';
        break;
      default:
        key = 'all';
    }
    
    if (!groups[key]) {
      groups[key] = [];
    }
    
    groups[key].push(alert);
    return groups;
  }, {});
};

/**
 * Calculate alert statistics
 */
export const calculateAlertStats = (alerts) => {
  const total = alerts.length;
  if (total === 0) {
    return {
      total: 0,
      unread: 0,
      bySeverity: { high: 0, medium: 0, low: 0 },
      byType: {},
      averageConfidence: 0,
      last24Hours: 0
    };
  }
  
  const unread = alerts.filter(a => !a.read).length;
  const bySeverity = alerts.reduce((acc, alert) => {
    acc[alert.severity] = (acc[alert.severity] || 0) + 1;
    return acc;
  }, { high: 0, medium: 0, low: 0 });
  
  const byType = alerts.reduce((acc, alert) => {
    acc[alert.type] = (acc[alert.type] || 0) + 1;
    return acc;
  }, {});
  
  const totalConfidence = alerts.reduce((sum, alert) => sum + (alert.confidence || 0), 0);
  const averageConfidence = totalConfidence / total;
  
  const last24Hours = alerts.filter(alert => {
    const alertTime = new Date(alert.timestamp);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return alertTime >= oneDayAgo;
  }).length;
  
  return {
    total,
    unread,
    bySeverity,
    byType,
    averageConfidence,
    last24Hours
  };
};

/**
 * Validate alert data
 */
export const validateAlert = (alert) => {
  const errors = [];
  
  if (!alert.id) errors.push('Alert ID is required');
  if (!alert.message) errors.push('Alert message is required');
  if (!alert.timestamp) errors.push('Alert timestamp is required');
  if (!alert.severity || !SEVERITY_LEVELS.includes(alert.severity)) {
    errors.push('Valid severity level is required');
  }
  if (alert.confidence && (alert.confidence < 0 || alert.confidence > 1)) {
    errors.push('Confidence must be between 0 and 1');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
