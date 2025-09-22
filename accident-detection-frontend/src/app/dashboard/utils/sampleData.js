// app/dashboard/utils/sampleData.js
export const generateSampleData = (count = 30) => {
  const sampleLogs = [];
  const locations = [
    'Main Street & 1st Ave', 'Highway 101 Mile 15', 'Downtown Plaza', 
    'School Zone - Oak Street', 'Industrial Area Gate 3', 'Shopping Mall Entrance',
    'Hospital Emergency Lane', 'Airport Terminal 2', 'Train Station Plaza',
    'City Park Intersection', 'Beach Road Curve', 'Mountain Pass Summit'
  ];
  
  const cameras = [
    'CAM_MAIN_001', 'CAM_HWY_002', 'CAM_DOWNTOWN_003', 'CAM_SCHOOL_004',
    'CAM_INDUSTRIAL_005', 'CAM_MALL_006', 'CAM_HOSPITAL_007', 'CAM_AIRPORT_008',
    'CAM_STATION_009', 'CAM_PARK_010', 'CAM_BEACH_011', 'CAM_MOUNTAIN_012'
  ];

  const weatherConditions = ['Clear', 'Rainy', 'Foggy', 'Night', 'Cloudy', 'Snowy'];
  const users = ['user123', 'admin_john', 'operator_sarah', 'monitor_alex', 'supervisor_mike'];
  
  for (let i = 0; i < count; i++) {
    const isAccident = Math.random() > 0.7; // 30% chance of accident
    const confidence = isAccident ? 0.6 + Math.random() * 0.4 : Math.random() * 0.6;
    
    // More realistic status distribution
    let status;
    if (isAccident) {
      const rand = Math.random();
      if (rand < 0.35) status = 'unresolved';
      else if (rand < 0.65) status = 'verified';
      else if (rand < 0.85) status = 'resolved';
      else status = 'false_alarm';
    } else {
      status = Math.random() < 0.05 ? 'false_alarm' : 'resolved';
    }
    
    // Generate timestamp within last 30 days
    const daysBack = Math.random() * 30;
    const timestamp = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    
    const locationIndex = Math.floor(Math.random() * locations.length);
    const cameraIndex = Math.floor(Math.random() * cameras.length);
    
    sampleLogs.push({
      id: `log_${i + 1}_${Date.now()}`,
      timestamp: timestamp.toISOString(),
      video_source: cameras[cameraIndex],
      confidence: confidence,
      accident_detected: isAccident,
      predicted_class: isAccident ? 'accident' : 'normal',
      processing_time: 0.3 + Math.random() * 2.5,
      snapshot_url: isAccident ? `/api/snapshots/accident_${i + 1}.jpg` : null,
      frame_id: `frame_${timestamp.getTime()}_${i}`,
      analysis_type: Math.random() > 0.3 ? 'live' : 'upload',
      status: status,
      severity_estimate: confidence > 0.8 ? 'high' : confidence > 0.6 ? 'medium' : 'low',
      location: locations[locationIndex],
      weather_conditions: weatherConditions[Math.floor(Math.random() * weatherConditions.length)],
      notes: isAccident ? 
        `Potential ${confidence > 0.8 ? 'severe' : 'minor'} vehicle collision detected at ${locations[locationIndex]}` : 
        'Normal traffic flow observed',
      
      // Additional admin-relevant fields
      user_id: users[Math.floor(Math.random() * users.length)],
      username: users[Math.floor(Math.random() * users.length)],
      device_type: Math.random() > 0.5 ? 'fixed_camera' : 'mobile_upload',
      alert_sent: isAccident && Math.random() > 0.2, // 80% of accidents trigger alerts
      response_time: isAccident ? Math.random() * 15 + 2 : null, // 2-17 minutes response time
      
      // Metadata
      created_at: timestamp.toISOString(),
      updated_at: new Date(timestamp.getTime() + Math.random() * 60000).toISOString(), // Within 1 minute
      
      // Simulate different data sources
      _source: Math.random() > 0.7 ? 'user_upload' : 'live_monitoring',
      _version: '1.0',
      _processed: true
    });
  }
  
  return sampleLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};
