// app/dashboard/utils/statsCalculator.js
export const calculateStatsFromLogs = (logsData) => {
  const totalLogs = logsData.length;
  const accidents = logsData.filter(log => log.accident_detected).length;
  const normal = totalLogs - accidents;
  
  // Status breakdown
  const statusCounts = logsData.reduce((acc, log) => {
    const status = log.status || 'unresolved';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  // Confidence distribution
  const confidenceDist = logsData.reduce((acc, log) => {
    const conf = log.confidence || 0;
    if (conf >= 0.8) acc.high++;
    else if (conf >= 0.5) acc.medium++;
    else acc.low++;
    return acc;
  }, { high: 0, medium: 0, low: 0 });

  // Calculate accuracy rate
  const verifiedLogs = logsData.filter(log => log.status === 'verified' || log.status === 'resolved');
  const falseAlarms = logsData.filter(log => log.status === 'false_alarm');
  const totalReviewed = verifiedLogs.length + falseAlarms.length;
  const accuracyRate = totalReviewed > 0 ? ((verifiedLogs.length / totalReviewed) * 100).toFixed(1) : 'N/A';

  // Recent activity (last 24 hours)
  const now = new Date();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const recentLogs = logsData.filter(log => new Date(log.timestamp) > oneDayAgo);
  const recentAccidents = recentLogs.filter(log => log.accident_detected);

  return {
    total_logs: totalLogs,
    accidents_detected: accidents,
    normal_detected: normal,
    accuracy_rate: accuracyRate,
    status_breakdown: {
      unresolved: statusCounts.unresolved || 0,
      verified: statusCounts.verified || 0,
      false_alarm: statusCounts.false_alarm || 0,
      resolved: statusCounts.resolved || 0
    },
    recent_activity: {
      total_logs_24h: recentLogs.length,
      accidents_24h: recentAccidents.length
    },
    confidence_distribution: confidenceDist,
    reviewed_logs: totalReviewed,
    pending_review: logsData.filter(log => log.status === 'unresolved').length
  };
};
