export const ALERT_TYPES = {
  accident_detection: 'Accident Detection',
  traffic_anomaly: 'Traffic Anomaly',
  emergency_route: 'Emergency Route',
  pedestrian_safety: 'Pedestrian Safety',
  weather_condition: 'Weather Condition',
  construction_zone: 'Construction Zone',
  vehicle_breakdown: 'Vehicle Breakdown',
  road_closure: 'Road Closure',
  maintenance_required: 'Maintenance Required',
  security_incident: 'Security Incident'
};

export const SEVERITY_LEVELS = ['high', 'medium', 'low'];

export const SEVERITY_COLORS = {
  high: 'red',
  medium: 'yellow',
  low: 'green'
};

export const FILTER_OPTIONS = {
  all: 'All Alerts',
  unread: 'Unread',
  high_priority: 'High Priority',
  medium_priority: 'Medium Priority',
  low_priority: 'Low Priority'
};

export const SORT_OPTIONS = {
  priority: 'Priority',
  timestamp: 'Time',
  confidence: 'Confidence',
  location: 'Location'
};

export const CONFIDENCE_LEVELS = {
  very_high: { min: 0.9, label: 'Very High', color: 'green' },
  high: { min: 0.8, label: 'High', color: 'light-green' },
  medium: { min: 0.6, label: 'Medium', color: 'yellow' },
  low: { min: 0.4, label: 'Low', color: 'orange' },
  very_low: { min: 0, label: 'Very Low', color: 'red' }
};

export const STATUS_TYPES = {
  read: 'Read',
  unread: 'Unread',
  archived: 'Archived',
  dismissed: 'Dismissed'
};
