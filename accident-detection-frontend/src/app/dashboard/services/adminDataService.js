// app/dashboard/services/adminDataService.js
const API_BASE_URL = 'https://accident-prediction-7i4e.onrender.com';

class AdminDataService {
  constructor() {
    this.token = null;
    this.initializeToken();
  }

  initializeToken() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  async makeRequest(endpoint, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: this.getHeaders(),
        signal: controller.signal,
        mode: 'cors',
        ...options
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  async fetchAllUserLogs() {
    console.log('Fetching all user logs for admin dashboard...');

    // Try multiple endpoints that might contain all user data
    const endpoints = [
      '/api/admin/all-users-logs',    // Best case - specific admin endpoint
      '/api/admin/logs/all',          // Admin logs endpoint
      '/api/logs/all-users',          // All users logs
      '/api/detection-logs/all',      // All detection logs
      '/api/admin/detection-logs',    // Admin detection logs
      '/api/logs?all=true',           // Logs with all parameter
      '/api/logs?limit=1000',         // High limit to get more data
      '/api/admin/dashboard-data',    // Dashboard specific endpoint
      '/api/alerts',                  // Alerts endpoint
      '/api/incidents',               // Incidents endpoint
      '/api/events',                  // Events endpoint
    ];

    let allLogs = [];
    let successfulEndpoints = [];

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        
        const response = await this.makeRequest(endpoint);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`Response from ${endpoint}:`, data);
          
          const extractedLogs = this.extractLogsFromResponse(data);
          
          if (extractedLogs.length > 0) {
            console.log(`Found ${extractedLogs.length} logs from ${endpoint}`);
            
            // Merge logs, avoiding duplicates based on ID
            const existingIds = new Set(allLogs.map(log => log.id || log._id));
            const newLogs = extractedLogs.filter(log => 
              !existingIds.has(log.id || log._id)
            );
            
            allLogs.push(...newLogs);
            successfulEndpoints.push(endpoint);
          }
        }
      } catch (error) {
        console.log(`Endpoint ${endpoint} failed:`, error.message);
      }
    }

    console.log(`Successfully fetched ${allLogs.length} logs from ${successfulEndpoints.length} endpoints`);
    
    if (allLogs.length === 0) {
      throw new Error('No logs found from any endpoint. API might be down or endpoints may have changed.');
    }

    return this.normalizeLogData(allLogs);
  }

  extractLogsFromResponse(data) {
    if (Array.isArray(data)) {
      return data;
    }

    if (data && typeof data === 'object') {
      // Try common keys where logs might be stored
      const possibleKeys = [
        'logs', 'data', 'results', 'items', 'records',
        'detections', 'alerts', 'incidents', 'events',
        'detection_logs', 'accident_logs', 'log_entries',
        'user_logs', 'all_logs', 'dashboard_data'
      ];

      for (const key of possibleKeys) {
        if (Array.isArray(data[key])) {
          return data[key];
        }
      }

      // Check if response has pagination structure
      if (data.data && Array.isArray(data.data)) {
        return data.data;
      }

      // Check if it's a single log object
      if (data.id && (data.timestamp || data.created_at)) {
        return [data];
      }
    }

    return [];
  }

  normalizeLogData(logs) {
    return logs.map((log, index) => ({
      // Ensure ID exists
      id: log.id || log._id || `log_${Date.now()}_${index}`,
      
      // Timestamp normalization
      timestamp: log.timestamp || log.created_at || log.date || log.time || new Date().toISOString(),
      
      // Accident detection
      accident_detected: log.accident_detected || 
                        log.is_accident || 
                        log.alert_type === 'accident' ||
                        log.type === 'accident' ||
                        log.classification === 'accident' ||
                        false,
      
      // Confidence score
      confidence: this.normalizeConfidence(log.confidence || log.confidence_score || log.probability || log.score),
      
      // Video source
      video_source: log.video_source || 
                   log.camera_id || 
                   log.source || 
                   log.camera_name ||
                   log.device_id ||
                   `Camera_${Math.floor(Math.random() * 10) + 1}`,
      
      // Status
      status: log.status || 'unresolved',
      
      // Location
      location: log.location || 
               log.camera_location || 
               log.address ||
               log.place ||
               'Unknown Location',
      
      // Additional fields with defaults
      predicted_class: log.predicted_class || (log.accident_detected ? 'accident' : 'normal'),
      processing_time: log.processing_time || log.duration || (0.5 + Math.random() * 2),
      weather_conditions: log.weather_conditions || log.weather || 'Clear',
      analysis_type: log.analysis_type || log.detection_type || log.source_type || 'live',
      severity_estimate: log.severity_estimate || this.calculateSeverity(log),
      notes: log.notes || log.description || log.comment || (log.accident_detected ? 'Accident detected by AI system' : 'Normal traffic flow'),
      
      // User information if available
      user_id: log.user_id || log.uploaded_by || log.created_by,
      username: log.username || log.user_name || log.creator,
      
      // Technical details
      frame_id: log.frame_id || `frame_${log.id}`,
      snapshot_url: log.snapshot_url || log.image_url || log.screenshot,
      
      // Original data for reference
      _original: log
    }));
  }

  normalizeConfidence(confidence) {
    if (confidence === null || confidence === undefined) {
      return Math.random() * 0.3 + 0.4; // Random between 0.4-0.7
    }
    
    if (typeof confidence === 'string') {
      confidence = parseFloat(confidence);
    }
    
    // If confidence is > 1, assume it's a percentage (0-100)
    if (confidence > 1) {
      confidence = confidence / 100;
    }
    
    // Ensure it's between 0 and 1
    return Math.max(0, Math.min(1, confidence));
  }

  calculateSeverity(log) {
    const confidence = this.normalizeConfidence(log.confidence);
    
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  }

  async updateLogStatus(logId, newStatus) {
    const updateEndpoints = [
      `/api/logs/${logId}/status`,
      `/api/admin/logs/${logId}/status`,
      `/api/logs/${logId}`,
      `/api/admin/logs/${logId}`,
      `/api/detection-logs/${logId}/status`
    ];

    for (const endpoint of updateEndpoints) {
      try {
        const response = await this.makeRequest(endpoint, {
          method: 'PUT',
          body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
          console.log(`Status updated successfully via ${endpoint}`);
          return true;
        }
      } catch (error) {
        console.log(`Status update failed for ${endpoint}:`, error.message);
      }
    }

    return false; // All attempts failed
  }
}

export default AdminDataService;
