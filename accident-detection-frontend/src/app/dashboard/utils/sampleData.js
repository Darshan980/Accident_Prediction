// app/dashboard/utils/sampleData.js
export const generateSampleData = () => {
  const sampleLogs = [];
  for (let i = 0; i < 30; i++) {
    const isAccident = Math.random() > 0.75;
    const confidence = isAccident ? 0.6 + Math.random() * 0.4 : Math.random() * 0.5;
    
    let status;
    if (isAccident) {
      const rand = Math.random();
      if (rand < 0.4) status = 'unresolved';
      else if (rand < 0.7) status = 'verified';
      else if (rand < 0.85) status = 'resolved';
      else status = 'false_alarm';
    } else {
      status = Math.random() < 0.1 ? 'false_alarm' : 'resolved';
    }
    
    sampleLogs.push({
      id: i + 1,
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      video_source: `camera_${Math.floor(Math.random() * 5) + 1}`,
      confidence: confidence,
      accident_detected: isAccident,
      predicted_class: isAccident ? 'accident' : 'normal',
      processing_time: 0.5 + Math.random() * 2,
      snapshot_url: isAccident ? `/api/snapshot/sample_${i + 1}.jpg` : null,
      frame_id: `frame_${i + 1}`,
      analysis_type: Math.random() > 0.5 ? 'live' : 'upload',
      status: status,
      severity_estimate: confidence > 0.8 ? 'high' : confidence > 0.6 ? 'medium' : 'low',
      location: ['Main Street', 'Highway 101', 'Downtown', 'School Zone', 'Industrial Area'][Math.floor(Math.random() * 5)],
      weather_conditions: ['Clear', 'Rainy', 'Foggy', 'Night'][Math.floor(Math.random() * 4)],
      notes: isAccident ? 'Potential vehicle collision detected' : 'Normal traffic flow'
    });
  }
  return sampleLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};
