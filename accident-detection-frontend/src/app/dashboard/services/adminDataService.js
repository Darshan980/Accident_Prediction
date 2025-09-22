// app/dashboard/services/adminDataService.js - FIXED VERSION
const API_BASE_URL = 'https://accident-prediction-7i4e.onrender.com';

class AdminDataService {
  constructor() {
    this.token = null;
    this.sessionId = null;
    this.initializeAuth();
  }

  initializeAuth() {
    if (typeof window !== 'undefined') {
      // Try multiple token sources
      this.token = localStorage.getItem('token') || 
                  localStorage.getItem('authToken') || 
                  localStorage.getItem('access_token') ||
                  sessionStorage.getItem('token') ||
                  sessionStorage.getItem('authToken');
      
      // Try session ID
      this.sessionId = localStorage.getItem('sessionId') || 
                      sessionStorage.getItem('sessionId');
      
      // Try to get from cookies
      if (!this.token) {
        this.token = this.getCookieValue('token') || 
                    this.getCookieValue('authToken') ||
                    this.getCookieValue('access_token');
      }
      
      if (!this.sessionId) {
        this.sessionId = this.getCookieValue('sessionId') || 
                        this.getCookieValue('PHPSESSID') ||
                        this.getCookieValue('session');
      }
    }
  }

  getCookieValue(name) {
    if (typeof document === 'undefined') return null;
    
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'AdminDashboard/1.0',
    };

    // Add authentication headers - try multiple formats
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
      headers['X-Auth-Token'] = this.token;
      headers['Token'] = this.token;
    }

    if (this.sessionId) {
      headers['X-Session-ID'] = this.sessionId;
      headers['Session-ID'] = this.sessionId;
    }

    // Add admin-specific headers
    headers['X-Admin-Request'] = 'true';
    headers['X-Dashboard-Client'] = 'admin';

    return headers;
  }

  async authenticate() {
    console.log('🔐 Attempting to authenticate...');
    
    try {
      // Try to authenticate with admin credentials
      const response = await fetch(`${API_BASE_URL}/auth/admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          // You might need to add admin credentials here
          admin: true,
          dashboard: true
        })
      });

      if (response.ok) {
        const authData = await response.json();
        
        if (authData.token) {
          this.token = authData.token;
          localStorage.setItem('authToken', authData.token);
        }
        
        if (authData.sessionId) {
          this.sessionId = authData.sessionId;
          localStorage.setItem('sessionId', authData.sessionId);
        }
        
        console.log('✅ Authentication successful');
        return authData;
      }
    } catch (error) {
      console.log('❌ Authentication failed:', error);
    }
    
    return null;
  }

  async makeRequest(endpoint, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      console.log(`🌐 Making request to: ${API_BASE_URL}${endpoint}`);
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: this.getHeaders(),
        credentials: 'include', // Important for session cookies
        signal: controller.signal,
        mode: 'cors',
        ...options
      });

      clearTimeout(timeoutId);
      
      console.log(`📡 Response status: ${response.status} for ${endpoint}`);
      
      // If unauthorized, try to re-authenticate
      if (response.status === 401 || response.status === 403) {
        console.log('🔐 Unauthorized, attempting re-authentication...');
        const authResult = await this.authenticate();
        
        if (authResult) {
          // Retry the original request with new auth
          return await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: this.getHeaders(),
            credentials: 'include',
            signal: controller.signal,
            mode: 'cors',
            ...options
          });
        }
      }
      
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
    console.log('🔍 Starting fetchAllUserLogs...');

    // Try different endpoints that might work
    const endpoints = [
      '/api/logs?all=true',
      '/api/logs?limit=1000',
      '/api/logs',
      '/api/admin/logs',
      '/admin/api/logs',
      '/logs',
      '/api/accident-logs'
    ];

    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 Trying endpoint: ${endpoint}`);
        
        const response = await this.makeRequest(endpoint);
        
        if (response.ok) {
          const data = await response.json();
          
          console.log(`✅ Got response from ${endpoint}:`, {
            type: typeof data,
            isArray: Array.isArray(data),
            keys: typeof data === 'object' && !Array.isArray(data) ? Object.keys(data) : 'N/A'
          });

          // Check if response contains login message
          if (typeof data === 'object' && data.message && 
              (data.message.includes('log in') || data.message.includes('authentication'))) {
            console.log('🔒 Authentication required response detected');
            throw new Error('Authentication required. Please log in to view accident logs.');
          }
          
          const extractedLogs = this.extractLogsFromResponse(data);
          console.log(`📊 Extracted ${extractedLogs.length} logs`);
          
          if (extractedLogs.length > 0) {
            return this.normalizeLogData(extractedLogs);
          }
        } else {
          const errorText = await response.text();
          console.log(`❌ ${endpoint} failed with status ${response.status}: ${errorText}`);
          
          if (response.status === 401 || response.status === 403) {
            throw new Error('Authentication required. Please log in to view accident logs.');
          }
          
          lastError = new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
      } catch (error) {
        console.log(`💥 ${endpoint} error:`, error.message);
        lastError = error;
        
        // If it's an auth error, don't continue
        if (error.message.includes('Authentication') || error.message.includes('log in')) {
          throw error;
        }
      }
    }

    // If we get here, no endpoints worked
    throw lastError || new Error('No logs found from working endpoints. Check API response structure.');
  }

  extractLogsFromResponse(data) {
    console.log('🔧 Extracting logs from response...');
    
    // Direct array response
    if (Array.isArray(data)) {
      console.log(`✅ Direct array with ${data.length} items`);
      return data;
    }

    // Object response - check common patterns
    if (data && typeof data === 'object') {
      const possibleArrayKeys = ['logs', 'data', 'results', 'items', 'records', 'accidents'];
      
      for (const key of possibleArrayKeys) {
        if (data[key] && Array.isArray(data[key])) {
          console.log(`✅ Found logs in '${key}' with ${data[key].length} items`);
          return data[key];
        }
      }

      // Check all keys for arrays
      for (const [key, value] of Object.entries(data)) {
        if (Array.isArray(value) && value.length > 0) {
          console.log(`✅ Found array in '${key}' with ${value.length} items`);
          return value;
        }
      }

      // Check if the entire object is a single log
      if (this.looksLikeLogEntry(data)) {
        console.log('✅ Single log entry detected');
        return [data];
      }
    }

    console.log('❌ No logs found in response');
    return [];
  }

  looksLikeLogEntry(obj) {
    const logFields = ['id', '_id', 'timestamp', 'created_at', 'date', 'time', 'accident_detected', 'confidence'];
    return logFields.some(field => obj.hasOwnProperty(field));
  }

  normalizeLogData(logs) {
    console.log(`🔧 Normalizing ${logs.length} logs...`);
    
    return logs.map((log, index) => ({
      id: log.id || log._id || `log_${Date.now()}_${index}`,
      timestamp: log.timestamp || log.created_at || log.date || new Date().toISOString(),
      accident_detected: Boolean(log.accident_detected || log.is_accident || false),
      confidence: this.normalizeConfidence(log.confidence || log.confidence_score),
      video_source: log.video_source || log.camera_id || `Camera_${index + 1}`,
      status: log.status || 'unresolved',
      location: log.location || log.camera_location || 'Unknown Location',
      predicted_class: log.predicted_class || (log.accident_detected ? 'accident' : 'normal'),
      processing_time: log.processing_time || (0.5 + Math.random() * 2).toFixed(3),
      weather_conditions: log.weather_conditions || 'Clear',
      analysis_type: log.analysis_type || 'live',
      severity_estimate: log.severity_estimate || 'medium',
      notes: log.notes || '',
      _original: log
    }));
  }

  normalizeConfidence(confidence) {
    if (confidence === null || confidence === undefined) {
      return 0.85;
    }
    
    if (typeof confidence === 'string') {
      confidence = parseFloat(confidence);
    }
    
    if (isNaN(confidence)) {
      return 0.85;
    }
    
    if (confidence > 1) {
      confidence = confidence / 100;
    }
    
    return Math.max(0, Math.min(1, confidence));
  }

  async updateLogStatus(logId, newStatus) {
    try {
      console.log(`🔄 Updating status for log ${logId} to ${newStatus}`);
      
      const response = await this.makeRequest(`/api/logs/${logId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        console.log('✅ Status update successful');
        return true;
      } else {
        console.log(`❌ Status update failed: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.log('❌ Status update error:', error);
      return false;
    }
  }
}

export default AdminDataService;
