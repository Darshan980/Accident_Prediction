// app/dashboard/utils/uiHelpers.js
export const getStatusColor = (status) => {
  const colors = {
    unresolved: '#ffc107',
    verified: '#dc3545',
    false_alarm: '#6c757d',
    resolved: '#28a745'
  };
  return colors[status] || '#6c757d';
};

export const getConfidenceColor = (confidence) => {
  if (confidence >= 0.8) return '#dc3545';
  if (confidence >= 0.6) return '#ffc107';
  return '#28a745';
};

export const formatTimestamp = (timestamp) => {
  return new Date(timestamp).toLocaleString();
};

export const getAccuracyColor = (accuracyRate) => {
  if (accuracyRate === 'N/A') return '#6c757d';
  const rate = parseFloat(accuracyRate);
  if (rate >= 80) return '#28a745';
  if (rate >= 60) return '#ffc107';
  return '#dc3545';
};

export const getAccuracyBgColor = (accuracyRate) => {
  if (accuracyRate === 'N/A') return '#f8f9fa';
  const rate = parseFloat(accuracyRate);
  if (rate >= 80) return '#f0fff4';
  if (rate >= 60) return '#fff8f0';
  return '#fff5f5';
};

export const getAccuracyBorderColor = (accuracyRate) => {
  if (accuracyRate === 'N/A') return '#dee2e6';
  const rate = parseFloat(accuracyRate);
  if (rate >= 80) return '#c3e6cb';
  if (rate >= 60) return '#ffd6a3';
  return '#fed7d7';
};
