// Default alert settings
export const DEFAULT_ALERT_SETTINGS = {
  sensitivity: 'medium',
  cooldownTime: 10,
  autoAcknowledge: true,
  alertDuration: 5,
  modalNotifications: true,
  desktopNotifications: true,
  emailAlerts: false,
  smsAlerts: false
};

// Alert severity levels
export const ALERT_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

// Alert types
export const ALERT_TYPES = {
  ACCIDENT: 'accident',
  DETECTION: 'detection',
  SYSTEM: 'system'
};

// Notification permissions
export const NOTIFICATION_PERMISSION = {
  DEFAULT: 'default',
  GRANTED: 'granted',
  DENIED: 'denied'
};

// Storage keys
export const STORAGE_KEYS = {
  ALERT_HISTORY: 'alertHistory',
  ALERT_SETTINGS: 'alertSettings',
  NOTIFICATION_SETTINGS: 'notificationSettings'
};

// Audio settings
export const AUDIO_CONFIG = {
  FREQUENCY_START: 800,
  FREQUENCY_END: 1200,
  GAIN: 0.15,
  DURATION: 0.3,
  REPEAT_COUNT: 3,
  REPEAT_INTERVAL: 400
};

// UI constants
export const UI_CONFIG = {
  MAX_HISTORY_ITEMS: 50,
  AUTO_CLOSE_DELAY: 10000,
  MODAL_ANIMATION_DURATION: 300
};
