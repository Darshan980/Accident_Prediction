// app/dashboard/services/adminDataService.js - DEBUG VERSION
// This version will help us understand the exact data structure being returned

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
    const timeoutId = setTimeout(() => controller.abort(), 10000);

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
    console.log('🔍 DEBUG: Starting fetchAllUserLogs...');

    // Focus only on the working endpoints from your logs
    const workingEndpoints = [
      '/api/logs?all=true',
      '/api/logs?limit=1000'
    ];

    for (const endpoint of workingEndpoints) {
      try {
        console.log(`🔍 DEBUG: Trying endpoint: ${endpoint}`);
        
        const response = await this.makeRequest(endpoint);
        
        if (response.ok) {
          const data = await response.json();
          
          // DETAILED DEBUG LOGGING
          console.log(`🔍 DEBUG: Raw response from ${endpoint}:`, data);
          console.log(`🔍 DEBUG: Response type:`, typeof data);
          console.log(`🔍 DEBUG: Is array:`, Array.isArray(data));
          
          if (data && typeof data === 'object' && !Array.isArray(data)) {
            console.log(`🔍 DEBUG: Object keys:`, Object.keys(data));
            
            // Check each key to see if it contains arrays
            for (const [key, value] of Object.entries(data)) {
              console.log(`🔍 DEBUG: Key "${key}":`, {
                type: typeof value,
                isArray: Array.isArray(value),
                length: Array.isArray(value) ? value.length : 'N/A',
                sample: Array.isArray(value) && value.length > 0 ? value[0] : value
              });
            }
          }
          
          const extractedLogs = this.extractLogsFromResponse(data);
          console.log(`🔍 DEBUG: Extracted ${extractedLogs.length} logs`);
          
          if (extractedLogs.length > 0) {
            console.log(`🔍 DEBUG: First extracted log sample:`, extractedLogs[0]);
            return this.normalizeLogData(extractedLogs);
          } else {
            console.log(`🔍 DEBUG: No logs found in response from ${endpoint}`);
            // Continue to next endpoint
          }
        } else {
          console.log(`❌ DEBUG: ${endpoint} failed with status ${response.status}`);
        }
      } catch (error) {
        console.log(`💥 DEBUG: ${endpoint} error:`, error);
      }
    }

    // If we get here, no working endpoints found logs
    console.log('🚫 DEBUG: No logs found from any working endpoint');
    throw new Error('No logs found from working endpoints. Check API response structure.');
  }

  extractLogsFromResponse(data) {
    console.log('🔧 DEBUG: Extracting logs from response...');
    console.log('🔧 DEBUG: Data type:', typeof data, 'Is array:', Array.isArray(data));
    
    // Direct array response
    if (Array.isArray(data)) {
      console.log('✅ DEBUG: Direct array with', data.length, 'items');
      return data;
    }

    // Object response - check ALL possible patterns
    if (data && typeof data === 'object') {
      console.log('🔧 DEBUG: Checking object keys:', Object.keys(data));
      
      // Try ALL keys, not just predefined ones
      for (const [key, value] of Object.entries(data)) {
        if (Array.isArray(value)) {
          console.log(`✅ DEBUG: Found array in key "${key}" with ${value.length} items`);
          if (value.length > 0) {
            console.log(`🔧 DEBUG: Sample item from "${key}":`, value[0]);
            return value;
          }
        }
      }

      // Check if the entire object might be a single log entry
      if (this.looksLikeLogEntry(data)) {
        console.log('✅ DEBUG: Single log entry detected');
        return [data];
      }

      console.log('❌ DEBUG: No arrays found in object');
    }

    console.log('❌ DEBUG: Could not extract logs from response');
    return [];
  }

  looksLikeLogEntry(obj) {
    // Check if object has typical log fields
    const logFields = ['id', '_id', 'timestamp', 'created_at', 'date', 'time', 'accident_detected', 'confidence'];
    const hasLogFields = logFields.some(field => obj.hasOwnProperty(field));
    
    console.log('🔧 DEBUG: Checking if object looks like log entry:', {
      hasLogFields,
      keys: Object.keys(obj)
    });
    
    return hasLogFields;
  }

  // Simplified normalization for debugging
  normalizeLogData(logs) {
    console.log(`🔧 DEBUG: Normalizing ${logs.length} logs...`);
    
    if (logs.length > 0) {
      console.log('🔧 DEBUG: Sample log before normalization:', logs[0]);
    }
    
    const normalized = logs.map((log, index) => ({
      id: log.id || log._id || `debug_log_${index}`,
      timestamp: log.timestamp || log.created_at || log.date || new Date().toISOString(),
      accident_detected: Boolean(log.accident_detected || log.is_accident || false),
      confidence: this.normalizeConfidence(log.confidence || log.confidence_score),
      video_source: log.video_source || log.camera_id || `Camera_${index + 1}`,
      status: log.status || 'unresolved',
      location: log.location || log.camera_location || 'Unknown',
      predicted_class: log.predicted_class || (log.accident_detected ? 'accident' : 'normal'),
      processing_time: log.processing_time || (0.5 + Math.random() * 2),
      weather_conditions: log.weather_conditions || 'Clear',
      analysis_type: log.analysis_type || 'live',
      severity_estimate: log.severity_estimate || 'medium',
      notes: log.notes || 'Auto-generated log entry',
      _original: log,
      _debug_normalized: true
    }));

    console.log('🔧 DEBUG: Sample normalized log:', normalized[0]);
    return normalized;
  }

  normalizeConfidence(confidence) {
    if (confidence === null || confidence === undefined) {
      return Math.random() * 0.3 + 0.4;
    }
    
    if (typeof confidence === 'string') {
      confidence = parseFloat(confidence);
    }
    
    if (isNaN(confidence)) {
      return Math.random() * 0.3 + 0.4;
    }
    
    if (confidence > 1) {
      confidence = confidence / 100;
    }
    
    return Math.max(0, Math.min(1, confidence));
  }

  async updateLogStatus(logId, newStatus) {
    try {
      const response = await this.makeRequest(`/api/logs/${logId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });

      return response.ok;
    } catch (error) {
      console.log('Status update failed:', error);
      return false;
    }
  }
}

export default AdminDataService;
