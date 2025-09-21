import { ALERT_SEVERITY, ALERT_TYPES } from './constants';

/**
 * Generate unique alert ID
 */
export const generateAlertId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `alert-${timestamp}-${random}`;
};

/**
 * Determine alert severity based on confidence
 */
export const determineAlertSeverity = (confidence) => {
  if (confidence > 0.8) return ALERT_SEVERITY.HIGH;
  if (confidence > 0.5) return ALERT_SEVERITY.MEDIUM;
  return ALERT_SEVERITY.LOW;
};

/**
 * Format confidence percentage
 */
export const formatConfidence = (confidence) => {
  return `${(confidence * 100).toFixed(1)}%`;
};

/**
 * Create alert object from detection data
 */
export const createAlert = (detectionData) => {
  const now = Date.now();
  const alertId = generateAlertId();
  const confidence = detectionData.confidence || 0;
  const severity = determineAlertSeverity(confidence);
  
  return {
    id: alertId,
    timestamp: new Date().toISOString(),
    type: ALERT_TYPES.ACCIDENT,
    confidence,
    location: detectionData.location || detectionData.source || 'Unknown Location',
    source: detectionData.source || 'Unknown Source',
    acknowledged: false,
    severity,
    accident_detected: detectionData.accident_detected || false,
    predicted_class: detectionData.predicted_class || 'Unknown',
    frame_id: detectionData.frame_id || `FRAME_${now}`,
    filename: detectionData.filename || 'Unknown file',
    processing_time: detectionData.processing_time || 0,
    analysis_type: detectionData.analysis_type || 'Unknown Analysis',
    content_type: detectionData.content_type || 'Unknown',
    file_size: detectionData.file_size || 0,
    created_at: now,
    dismissed: false,
    title: detectionData.accident_detected ? 'ACCIDENT DETECTED!' : 'DETECTION ALERT',
    description: `Confidence: ${formatConfidence(confidence)} at ${detectionData.source || 'Unknown'}`
  };
};

/**
 * Check if alert is within cooldown period
 */
export const isInCooldown = (lastAlertTime, cooldownSeconds) => {
  const now = Date.now();
  return (now - lastAlertTime) < (cooldownSeconds * 1000);
};

/**
 * Create test alert data
 */
export const createTestAlert = () => {
  return {
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
};

/**
 * Format alert timestamp for display
 */
export const formatAlertTime = (timestamp) => {
  try {
    return new Date(timestamp).toLocaleString();
  } catch (error) {
    return 'Invalid Date';
  }
};

/**
 * Get alert icon based on severity
 */
export const getAlertIcon = (severity, acknowledged = false) => {
  if (acknowledged) return '✅';
  
  switch (severity) {
    case ALERT_SEVERITY.HIGH:
      return '🚨';
    case ALERT_SEVERITY.MEDIUM:
      return '⚠️';
    case ALERT_SEVERITY.LOW:
      return '🔔';
    default:
      return '❓';
  }
};

/**
 * Get alert color based on severity
 */
export const getAlertColor = (severity, acknowledged = false) => {
  if (acknowledged) return '#28a745';
  
  switch (severity) {
    case ALERT_SEVERITY.HIGH:
      return '#dc3545';
    case ALERT_SEVERITY.MEDIUM:
      return '#ff6b35';
    case ALERT_SEVERITY.LOW:
      return '#ffc107';
    default:
      return '#6c757d';
  }
};

/**
 * Validate alert data structure
 */
export const isValidAlert = (alert) => {
  return alert &&
         typeof alert === 'object' &&
         alert.id &&
         alert.timestamp &&
         typeof alert.confidence === 'number' &&
         alert.confidence >= 0 &&
         alert.confidence <= 1;
};
