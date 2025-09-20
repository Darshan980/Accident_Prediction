export const getDemoAlerts = () => {
  const now = new Date();
  
  return [
    {
      id: 1,
      message: "High confidence accident detected at Main Street intersection",
      timestamp: now.toISOString(),
      severity: 'high',
      read: false,
      type: 'accident_detection',
      confidence: 0.92,
      location: 'Main Street & 5th Avenue',
      snapshot_url: '/api/snapshots/accident_001.jpg'
    },
    {
      id: 2,
      message: "Medium confidence incident detected at Highway 101",
      timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
      severity: 'medium',
      read: false,
      type: 'accident_detection',
      confidence: 0.75,
      location: 'Highway 101, Mile 45',
      snapshot_url: '/api/snapshots/accident_002.jpg'
    },
    {
      id: 3,
      message: "Low confidence event detected at Oak Street",
      timestamp: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
      severity: 'low',
      read: true,
      type: 'accident_detection',
      confidence: 0.58,
      location: 'Oak Street & 3rd Avenue',
      snapshot_url: '/api/snapshots/accident_003.jpg'
    },
    {
      id: 4,
      message: "Traffic anomaly detected near City Center",
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      severity: 'medium',
      read: false,
      type: 'traffic_anomaly',
      confidence: 0.68,
      location: 'City Center Plaza'
    },
    {
      id: 5,
      message: "Emergency vehicle route optimization alert",
      timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      severity: 'high',
      read: false,
      type: 'emergency_route',
      confidence: 0.89,
      location: 'Downtown District'
    },
    {
      id: 6,
      message: "Pedestrian safety concern detected",
      timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      severity: 'medium',
      read: true,
      type: 'pedestrian_safety',
      confidence: 0.72,
      location: 'School Zone - Elm Street'
    },
    {
      id: 7,
      message: "Weather-related road condition alert",
      timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
      severity: 'low',
      read: false,
      type: 'weather_condition',
      confidence: 0.65,
      location: 'Mountain Pass Road'
    },
    {
      id: 8,
      message: "Construction zone traffic pattern detected",
      timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
      severity: 'low',
      read: true,
      type: 'construction_zone',
      confidence: 0.81,
      location: 'Interstate 95, Exit 42'
    }
  ];
};

export const getDemoStats = (alerts) => {
  return {
    total_alerts: alerts.length,
    unread_alerts: alerts.filter(a => !a.read).length,
    last_24h_detections: alerts.filter(a => {
      const alertTime = new Date(a.timestamp);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return alertTime >= oneDayAgo;
    }).length,
    user_accuracy: "94.5%",
    system_uptime: "99.9%",
    average_response_time: "2.3s"
  };
};
