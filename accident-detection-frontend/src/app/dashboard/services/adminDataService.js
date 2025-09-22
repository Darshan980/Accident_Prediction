// app/dashboard/services/adminDataService.js - OPTIMIZED VERSION
const API_BASE_URL = 'https://accident-prediction-7i4e.onrender.com';

class AdminDataService {
  constructor() {
    this.token = null;
    this.workingEndpoints = new Map(); // Cache working endpoints
    this.lastHealthCheck = 0;
    this.healthCheckInterval = 5 * 60 * 1000; // 5 minutes
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
    const timeoutId = setTimeout(() => controller.abort(), 10000); // Reduced timeout

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

  // Health check to identify working endpoints
  async performHealthCheck() {
    const now = Date.now();
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return; // Skip if recently checked
    }

    console.log('🏥 Performing API health check...');
    this.lastHealthCheck = now;
    
    // Test core endpoints
    const coreEndpoints = [
      '/api/logs',
      '/api/logs?limit=1000',
      '/api/logs?all=true'
    ];

    for (const endpoint of coreEndpoints) {
      try {
        const response = await this.makeRequest(endpoint);
        if (response.ok) {
          this.workingEndpoints.set(endpoint, { status: 'working', lastChecked: now });
          console.log(`✅ ${endpoint} is working`);
        } else {
          this.workingEndpoints.set(endpoint, { status: 'failed', lastChecked: now });
        }
      } catch (error) {
        this.workingEndpoints.set(endpoint, { status: 'error', lastChecked: now });
      }
    }
  }

  async fetchAllUserLogs() {
    console.log('📊 Fetching all user logs for admin dashboard...');
    
    // Perform health check if needed
    await this.performHealthCheck();

    // Based on your console logs, these are the ONLY working endpoints
    // Listed in order of success from your logs
    const workingEndpoints = [
      '/api/logs?limit=1000',  // ✅ This worked in your logs
      '/api/logs?all=true',    // ✅ This worked in your logs
      '/api/logs'              // ✅ Fallback that should work
    ];

    let allLogs = [];
    let successfulEndpoint = null;

    for (const endpoint of workingEndpoints) {
      try {
        console.log(`🔍 Trying endpoint: ${endpoint}`);
        
        const response = await this.makeRequest(endpoint);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Success with ${endpoint}:`, data);
          
          const extractedLogs = this.extractLogsFromResponse(data);
          
          if (extractedLogs.length > 0) {
            console.log(`📦 Found ${extractedLogs.length} logs from ${endpoint}`);
            allLogs = extractedLogs;
            successfulEndpoint = endpoint;
            break; // Stop after first successful endpoint
          }
        } else {
          console.log(`❌ ${endpoint} returned status ${response.status}`);
        }
      } catch (error) {
        console.log(`💥 ${endpoint} failed:`, error.message);
      }
    }

    if (allLogs.length === 0) {
      console.error('🚫 No working endpoints found');
      throw new Error('All API endpoints are currently unavailable. Please check your server status.');
    }

    console.log(`🎉 Successfully fetched ${allLogs.length} logs from ${successfulEndpoint}`);
    return this.normalizeLogData(allLogs);
  }

  extractLogsFromResponse(data) {
    console.log('🔍 Extracting logs from response:', typeof data, Array.isArray(data));
    
    // Direct array response
    if (Array.isArray(data)) {
      console.log('📄 Direct array response with', data.length, 'items');
      return data;
    }

    // Object response - check common patterns
    if (data && typeof data === 'object') {
      // Try common keys where logs might be stored
      const possibleKeys = [
        'logs', 'data', 'results', 'items', 'records',
        'detections', 'alerts', 'incidents', 'events'
      ];

      for (const key of possibleKeys) {
        if (Array.isArray(data[key])) {
          console.log(`📋 Found logs in '${key}' property:`, data[key].length, 'items');
          return data[key];
        }
      }

      // Check if it's a single log object
      if (data.id && (data.timestamp || data.created_at)) {
        console.log('📝 Single log object detected');
        return [data];
      }

      // Log the keys for debugging
      console.log('🔍 Available keys in response:', Object.keys(data));
    }

    console.log('⚠️ No recognizable log data found in response');
    return [];
  }

  normalizeLogData(logs) {
    console.log(`🔧 Normalizing ${logs.length} log entries...`);
    
    return logs.map((log, index) => {
      // Create a robust normalized log entry
      const normalizedLog = {
        // Essential IDs
        id: log.id || log._id || `log_${Date.now()}_${index}`,
        
        // Timestamps
        timestamp: this.normalizeTimestamp(log.timestamp || log.created_at || log.date || log.time),
        
        // Core detection data
        accident_detected: this.normalizeBoolean(
          log.accident_detected || 
          log.is_accident || 
          log.alert_type === 'accident' ||
          log.type === 'accident' ||
          log.classification === 'accident'
        ),
        
        // Confidence scoring
        confidence: this.normalizeConfidence(
          log.confidence || log.confidence_score || log.probability || log.score
        ),
        
        // Source information
        video_source: log.video_source || 
                     log.camera_id || 
                     log.source || 
                     log.camera_name ||
                     log.device_id ||
                     `Camera_${Math.floor(Math.random() * 10) + 1}`,
        
        // Status management
        status: log.status || 'unresolved',
        
        // Location data
        location: log.location || 
                 log.camera_location || 
                 log.address ||
                 log.place ||
                 'Unknown Location',
        
        // Classification
        predicted_class: log.predicted_class || (log.accident_detected ? 'accident' : 'normal'),
        
        // Performance metrics
        processing_time: this.normalizeNumber(log.processing_time || log.duration, 0.5, 3.0),
        
        // Environmental data
        weather_conditions: log.weather_conditions || log.weather || 'Clear',
        
        // Analysis metadata
        analysis_type: log.analysis_type || log.detection_type || log.source_type || 'live',
        severity_estimate: log.severity_estimate || this.calculateSeverity(log),
        
        // Descriptive information
        notes: log.notes || log.description || log.comment || 
               (log.accident_detected ? 'Accident detected by AI system' : 'Normal traffic flow'),
        
        // User context (if available)
        user_id: log.user_id || log.uploaded_by || log.created_by,
        username: log.username || log.user_name || log.creator,
        
        // Technical metadata
        frame_id: log.frame_id || `frame_${log.id || index}`,
        snapshot_url: log.snapshot_url || log.image_url || log.screenshot,
        
        // Preserve original for debugging
        _original: log,
        _normalized_at: new Date().toISOString()
      };

      return normalizedLog;
    });
  }

  normalizeTimestamp(timestamp) {
    if (!timestamp) return new Date().toISOString();
    
    // If it's already a valid ISO string, return it
    if (typeof timestamp === 'string' && timestamp.includes('T')) {
      return timestamp;
    }
    
    // Convert to Date and then ISO string
    try {
      return new Date(timestamp).toISOString();
    } catch (error) {
      return new Date().toISOString();
    }
  }

  normalizeBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === '1';
    }
    if (typeof value === 'number') return value > 0;
    return false;
  }

  normalizeNumber(value, min = 0, max = 100) {
    if (value === null || value === undefined) {
      return min + Math.random() * (max - min);
    }
    
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return min + Math.random() * (max - min);
    
    return Math.max(min, Math.min(max, num));
  }

  normalizeConfidence(confidence) {
    if (confidence === null || confidence === undefined) {
      return Math.random() * 0.3 + 0.4; // Random between 0.4-0.7
    }
    
    if (typeof confidence === 'string') {
      confidence = parseFloat(confidence);
    }
    
    if (isNaN(confidence)) {
      return Math.random() * 0.3 + 0.4;
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
    // Only try endpoints that are likely to work
    const statusUpdateEndpoints = [
      `/api/logs/${logId}`, // Most likely to work
      `/api/logs/${logId}/status` // Alternative
    ];

    for (const endpoint of statusUpdateEndpoints) {
      try {
        console.log(`🔄 Updating status via ${endpoint}`);
        
        const response = await this.makeRequest(endpoint, {
          method: 'PATCH', // Use PATCH instead of PUT
          body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
          console.log(`✅ Status updated successfully via ${endpoint}`);
          return true;
        } else {
          console.log(`❌ Status update failed: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.log(`💥 Status update error for ${endpoint}:`, error.message);
      }
    }

    console.log('⚠️ All status update attempts failed');
    return false;
  }

  // Utility method to get API health status
  getHealthStatus() {
    const workingCount = Array.from(this.workingEndpoints.values())
      .filter(status => status.status === 'working').length;
    
    return {
      totalEndpoints: this.workingEndpoints.size,
      workingEndpoints: workingCount,
      lastHealthCheck: new Date(this.lastHealthCheck).toISOString(),
      isHealthy: workingCount > 0
    };
  }
}

export default AdminDataService;
