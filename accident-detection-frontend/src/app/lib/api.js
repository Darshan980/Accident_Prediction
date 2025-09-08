// src/lib/api.js - COMPLETELY FIXED API client
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://accident-prediction-1-mpm0.onrender.com'

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL
    this.timeout = 30000
    console.log('🔧 ApiClient initialized:', this.baseURL)
  }

  // SIMPLIFIED token retrieval
  getAuthToken() {
    const tokenSources = [
      'token',
      'authToken', 
      'access_token'
    ];

    for (const key of tokenSources) {
      const token = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (token && token !== 'null' && token !== 'undefined' && token.length > 10) {
        console.log(`🔑 Found token from ${key}: ${token.substring(0, 15)}...`);
        return token;
      }
    }

    // Try parsing user object
    try {
      const userStr = localStorage.getItem('user');
      if (userStr && userStr !== 'null') {
        const userData = JSON.parse(userStr);
        if (userData.token && userData.token.length > 10) {
          console.log(`🔑 Found token from user object: ${userData.token.substring(0, 15)}...`);
          return userData.token;
        }
      }
    } catch (e) {
      console.warn('⚠️ Error parsing user data for token:', e);
    }
    
    console.log('❌ No valid token found');
    return null;
  }

  // SIMPLIFIED request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const token = this.getAuthToken();
    
    console.log(`🌐 Making request: ${options.method || 'GET'} ${url}`);
    console.log(`🔐 Auth token: ${token ? 'Present' : 'None'}`);

    const config = {
      method: options.method || 'GET',
      mode: 'cors',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        ...options.headers
      },
      ...options
    };

    // Add auth header if token exists and endpoint requires it
    if (token && this.requiresAuth(endpoint)) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Add Content-Type for JSON requests
    if (options.body && !(options.body instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      config.signal = controller.signal;

      const response = await fetch(url, config);
      clearTimeout(timeoutId);
      
      console.log(`📡 Response: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('✅ Success response received');
        return data;
      } else {
        const text = await response.text();
        return { message: text || 'Success' };
      }
      
    } catch (error) {
      console.error(`❌ Request failed for ${url}:`, error);
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms. Please check your connection.`);
      }
      
      if (error.message.includes('fetch')) {
        throw new Error(`Network error: Cannot connect to ${this.baseURL}. Please check if the backend is running.`);
      }
      
      throw error;
    }
  }

  // Handle error responses
  async handleErrorResponse(response) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        errorMessage = Array.isArray(errorData.detail) 
          ? errorData.detail.map(err => err.msg || err.message || err).join(', ')
          : errorData.detail;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch (parseError) {
      console.warn('Could not parse error response');
    }
    
    if (response.status === 401) {
      console.warn('🔓 Authentication failed, clearing tokens');
      this.clearTokens();
      errorMessage = 'Authentication required. Please log in again.';
    }
    
    throw new Error(errorMessage);
  }

  // Determine which endpoints require authentication
  requiresAuth(endpoint) {
    const publicEndpoints = [
      '/',
      '/api/health',
      '/api/dashboard/stats', 
      '/api/logs',
      '/auth/register',
      '/auth/login',
      '/auth/admin/login'
    ];
    
    return !publicEndpoints.some(publicEndpoint => 
      endpoint === publicEndpoint || 
      (endpoint.startsWith('/api/logs?') && publicEndpoint === '/api/logs')
    );
  }

  // Clear all tokens
  clearTokens() {
    const keys = ['token', 'authToken', 'access_token', 'user'];
    keys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    console.log('🧹 All tokens cleared');
  }

  // FIXED file upload method
  async uploadFile(file, onProgress = null) {
    console.log('📁 Starting file upload...');
    console.log('File details:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Validate file
    if (!file || !(file instanceof File)) {
      throw new Error('Invalid file object');
    }

    if (file.size > 50 * 1024 * 1024) {
      throw new Error('File too large. Maximum size is 50MB.');
    }

    const validTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/avi', 'video/mov', 'video/quicktime'
    ];
    
    if (!validTypes.includes(file.type.toLowerCase())) {
      throw new Error(`Invalid file type. Supported: ${validTypes.join(', ')}`);
    }

    const token = this.getAuthToken();
    if (!token) {
      throw new Error('Authentication required for file upload. Please log in.');
    }

    console.log('🔐 Token found, proceeding with upload');

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Simulate progress
      if (onProgress) onProgress(10);

      const response = await fetch(`${this.baseURL}/api/upload`, {
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type - let browser set it for FormData
        },
        body: formData
      });

      if (onProgress) onProgress(90);

      console.log(`📤 Upload response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(errorData.detail || `Upload failed: ${response.status}`);
      }

      const result = await response.json();
      if (onProgress) onProgress(100);
      
      console.log('✅ Upload successful:', result);
      return result;

    } catch (error) {
      console.error('❌ Upload failed:', error);
      throw error;
    }
  }

  // FIXED health check
  async healthCheck() {
    try {
      console.log('🏥 Checking API health...');
      
      const response = await fetch(`${this.baseURL}/api/health`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Health check passed:', data);
        return data;
      } else {
        throw new Error(`Health check failed: ${response.status}`);
      }
    } catch (error) {
      console.warn('⚠️ Health check failed:', error.message);
      return {
        status: 'offline',
        model_loaded: false,
        message: 'Backend server is not accessible',
        error: error.message,
        backend_url: this.baseURL,
        fallback: true
      };
    }
  }

  // Test connection
  async testConnection() {
    try {
      const response = await fetch(`${this.baseURL}/`, {
        method: 'GET',
        mode: 'cors',
        headers: { 'Accept': 'application/json' }
      });
      
      return {
        success: response.ok,
        status: response.status,
        data: response.ok ? await response.json() : null,
        backend_url: this.baseURL
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        backend_url: this.baseURL
      };
    }
  }

  // DASHBOARD & DATA METHODS
  async getDashboardStats() {
    return this.request('/api/dashboard/stats');
  }

  async getLogs(skip = 0, limit = 100, filters = {}) {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString()
    });
    
    if (filters.accidentOnly) params.append('accident_only', 'true');
    if (filters.status) params.append('status', filters.status);
    if (filters.source) params.append('source', filters.source);
    
    return this.request(`/api/logs?${params.toString()}`);
  }

  async getUserStats() {
    return this.request('/api/user/stats');
  }

  async getUserUploads(skip = 0, limit = 50) {
    return this.request(`/api/user/uploads?skip=${skip}&limit=${limit}`);
  }

  // AUTHENTICATION METHODS
  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  }

  async adminLogin(credentials) {
    return this.request('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async getCurrentAdmin() {
    return this.request('/auth/admin/me');
  }

  // LIVE DETECTION METHODS
  async analyzeFrame(frameData) {
    return this.request('/api/live/frame', {
      method: 'POST',
      body: JSON.stringify(frameData)
    });
  }
}

// FIXED WebSocket for live detection
class LiveDetectionWebSocket {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.isConnected = false;
    this.messageHandlers = new Set();
    this.errorHandlers = new Set();
    this.connectionHandlers = new Set();
  }

  getAuthToken() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token && token !== 'null') return token;

    try {
      const userStr = localStorage.getItem('user');
      if (userStr && userStr !== 'null') {
        const userData = JSON.parse(userStr);
        return userData.token;
      }
    } catch (e) {
      console.warn('Error parsing user data for WebSocket token:', e);
    }
    return null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        const wsURL = API_BASE_URL
          .replace('https://', 'wss://')
          .replace('http://', 'ws://') + '/api/live/ws';
        
        console.log('🔌 Connecting to WebSocket:', wsURL);
        this.ws = new WebSocket(wsURL);

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.connectionHandlers.forEach(handler => handler('connected'));
          
          // Send auth token
          const token = this.getAuthToken();
          if (token) {
            this.ws.send(JSON.stringify({ type: 'auth', token }));
          }
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.messageHandlers.forEach(handler => handler(data));
          } catch (error) {
            console.error('WebSocket message parse error:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket disconnected:', event.code);
          this.isConnected = false;
          this.connectionHandlers.forEach(handler => handler('disconnected'));
          
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          this.errorHandlers.forEach(handler => handler(error));
          if (this.reconnectAttempts === 0) reject(error);
        };

      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        reject(error);
      }
    });
  }

  attemptReconnect() {
    this.reconnectAttempts++;
    console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error(`Reconnection ${this.reconnectAttempts} failed:`, error);
      });
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  sendFrame(frameData) {
    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify(frameData));
    } else {
      console.warn('WebSocket not connected');
    }
  }

  onMessage(handler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onError(handler) {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  onConnection(handler) {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.isConnected = false;
  }
}

// Utility functions
export const utils = {
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  getConfidenceColor(confidence) {
    if (confidence >= 0.8) return '#dc3545'; // red
    if (confidence >= 0.6) return '#fd7e14'; // orange  
    if (confidence >= 0.4) return '#ffc107'; // yellow
    return '#28a745'; // green
  },

  formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString();
  },

  canvasToBase64(canvas, quality = 0.8) {
    return canvas.toDataURL('image/jpeg', quality).split(',')[1];
  },

  videoFrameToBase64(video, quality = 0.8) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality).split(',')[1];
  }
};

// Export instances
export const apiClient = new ApiClient();
export const liveDetectionWS = new LiveDetectionWebSocket();

export const testBackendConnection = async () => {
  const result = await apiClient.testConnection();
  console.log('🔗 Connection test result:', result);
  return result;
};

export default apiClient;
