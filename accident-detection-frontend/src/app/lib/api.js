// src/lib/api.js - FIXED API client with correct Render URL configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://accident-prediction-1-mpm0.onrender.com'

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL
    this.timeout = 30000 // 30 seconds
    console.log('ApiClient initialized with baseURL:', this.baseURL)
  }

  // Enhanced token retrieval with better error handling
  getAuthToken() {
    const tokenSources = [
      () => localStorage.getItem('token'),
      () => sessionStorage.getItem('token'), 
      () => {
        const userStr = localStorage.getItem('user');
        if (userStr && userStr !== 'null') {
          try {
            const userData = JSON.parse(userStr);
            return userData.token;
          } catch (e) {
            console.warn('Failed to parse user data for token:', e);
            return null;
          }
        }
        return null;
      },
      () => localStorage.getItem('authToken'),
      () => sessionStorage.getItem('authToken'),
      () => localStorage.getItem('access_token'),
      () => sessionStorage.getItem('access_token')
    ];

    for (const getToken of tokenSources) {
      try {
        const token = getToken();
        if (token && token !== 'null' && token !== 'undefined') {
          return token;
        }
      } catch (e) {
        console.warn('Error retrieving token:', e);
      }
    }
    
    return null;
  }

  // Enhanced request method with better CORS and error handling
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const token = this.getAuthToken();
    
    const config = {
      timeout: this.timeout,
      mode: 'cors',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        // Add Authorization header if token exists
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    }

    // Remove Content-Type for FormData requests
    if (options.body instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    try {
      console.log(`Making request to: ${url}`, {
        method: config.method || 'GET',
        hasToken: !!token,
        tokenPreview: token ? `${token.substring(0, 10)}...` : 'none',
        headers: Object.keys(config.headers)
      });

      const response = await fetch(url, config)
      
      console.log(`Response from ${url}:`, {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { 
            detail: `HTTP ${response.status}: ${response.statusText}` 
          };
        }
        
        // Handle authentication errors
        if (response.status === 401) {
          console.warn('Authentication failed, clearing tokens');
          this.clearTokens();
          throw new Error('Authentication required. Please log in again.');
        }
        
        // Handle CORS errors
        if (response.status === 0 || response.type === 'opaque') {
          throw new Error('CORS error: Unable to connect to backend. Please check the server configuration.');
        }
        
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`)
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log(`Success response from ${url}:`, data);
        return data;
      } else {
        // Handle non-JSON responses
        const text = await response.text();
        console.log(`Non-JSON response from ${url}:`, text);
        return { message: text };
      }
      
    } catch (error) {
      console.error(`Request failed for ${url}:`, error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error(`Network error: Unable to connect to backend server at ${this.baseURL}. Please check if the backend is running and accessible.`)
      }
      
      if (error.message.includes('CORS')) {
        throw new Error(`CORS error: The frontend cannot access the backend at ${this.baseURL}. Please check the backend CORS configuration.`)
      }
      
      throw error
    }
  }

  // Helper method to clear all possible token storage locations
  clearTokens() {
    const storageKeys = ['token', 'authToken', 'access_token', 'user'];
    storageKeys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  }

  // Enhanced file upload with better error handling and progress tracking
  async uploadFile(file, onProgress = null) {
    console.log('=== FILE UPLOAD DEBUG ===');
    console.log('File object:', file);
    console.log('File properties:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });

    // Validate file
    if (!file || !(file instanceof File)) {
      throw new Error('Invalid file object provided');
    }

    if (file.size > 50 * 1024 * 1024) {
      throw new Error('File too large. Maximum size is 50MB.');
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 
                       'video/mp4', 'video/avi', 'video/mov', 'video/quicktime'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      throw new Error(`Invalid file type. Supported types: ${validTypes.join(', ')}`);
    }

    const formData = new FormData()
    formData.append('file', file)

    const token = this.getAuthToken();
    
    if (!token) {
      throw new Error('Authentication required for file upload. Please log in first.');
    }

    console.log('Starting file upload:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      hasToken: !!token,
      endpoint: `${this.baseURL}/api/upload`
    });

    // Use fetch for file upload (more reliable than XMLHttpRequest for CORS)
    return this.uploadFileWithFetch(file, formData, token, onProgress);
  }

  // Fetch method for file upload with progress simulation
  async uploadFileWithFetch(file, formData, token, onProgress) {
    console.log('Using fetch for file upload...');
    
    try {
      // Simulate progress if callback provided
      if (onProgress && typeof onProgress === 'function') {
        onProgress(0);
      }

      const response = await fetch(`${this.baseURL}/api/upload`, {
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      // Simulate progress completion
      if (onProgress && typeof onProgress === 'function') {
        onProgress(100);
      }

      console.log('Fetch upload response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        await this.handleFetchError(response);
      }

      const result = await response.json();
      console.log('Fetch upload successful:', result);
      return result;
      
    } catch (error) {
      console.error('Fetch upload failed:', error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error(`Network error: Unable to connect to backend server at ${this.baseURL}. Please check if the backend is running and accessible.`);
      }
      
      throw error;
    }
  }

  // Handle fetch errors
  async handleFetchError(response) {
    let errorMessage = `Upload failed with status ${response.status}`;
    
    try {
      const errorData = await response.json();
      console.log('Fetch parsed error data:', errorData);
      
      if (errorData.detail) {
        if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map(err => 
            `${err.loc ? err.loc.join('.') + ': ' : ''}${err.msg || err.message || err}`
          ).join(', ');
        } else if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else {
          errorMessage = JSON.stringify(errorData.detail);
        }
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
      
      if (response.status === 401) {
        console.warn('Authentication failed during fetch upload');
        this.clearTokens();
        errorMessage = 'Authentication required. Please log in again.';
      }
    } catch (parseError) {
      console.error('Failed to parse fetch error response:', parseError);
      const responseText = await response.text().catch(() => 'Unable to read response');
      errorMessage = `${errorMessage}: ${response.statusText}. Response: ${responseText.substring(0, 200)}`;
    }
    
    throw new Error(errorMessage);
  }

  // Health check with enhanced error handling (NO CREDENTIALS)
  async healthCheck() {
    try {
      // Health check without credentials to avoid CORS issues
      const response = await fetch(`${this.baseURL}/api/health`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
        // NO credentials: 'include' for health check
      });
      
      console.log('Health check response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Health check successful:', data);
        return data;
      } else {
        throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.warn('Backend health check failed:', error.message);
      
      // Return detailed fallback response for debugging
      return {
        status: 'offline',
        model_loaded: false,
        message: 'Backend server is not accessible.',
        error: error.message,
        backend_url: this.baseURL,
        fallback: true,
        timestamp: new Date().toISOString()
      }
    }
  }

  // Test connection method (NO CREDENTIALS)
  async testConnection() {
    try {
      console.log('Testing connection to backend...');
      const response = await fetch(`${this.baseURL}/`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json'
        }
        // NO credentials: 'include' for basic connection test
      });
      
      console.log('Connection test response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          data: data,
          backend_url: this.baseURL
        };
      } else {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          backend_url: this.baseURL
        };
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      return {
        success: false,
        error: error.message,
        backend_url: this.baseURL
      };
    }
  }

  // Get model information
  async getModelInfo() {
    return this.request('/api/model-info')
  }

  // Configure model settings
  async configureModel(config) {
    return this.request('/api/configure', {
      method: 'POST',
      body: JSON.stringify(config)
    })
  }

  // Get system stats
  async getStats() {
    return this.request('/api/dashboard/stats')
  }

  // Analyze single frame (HTTP alternative to WebSocket)
  async analyzeFrame(frameData) {
    return this.request('/api/live/frame', {
      method: 'POST',
      body: JSON.stringify(frameData)
    })
  }

  // Get user's own logs
  async getUserLogs(skip = 0, limit = 50) {
    return this.request(`/api/user/logs?skip=${skip}&limit=${limit}`)
  }

  // Get user's stats
  async getUserStats() {
    return this.request('/api/user/stats')
  }

  // Get public dashboard stats
  async getDashboardStats() {
    return this.request('/api/dashboard/stats')
  }

  // Get public logs
  async getLogs(skip = 0, limit = 100, accidentOnly = false, status = null, source = null) {
    let params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString()
    })
    
    if (accidentOnly) params.append('accident_only', 'true')
    if (status) params.append('status', status)
    if (source) params.append('source', source)
    
    return this.request(`/api/logs?${params.toString()}`)
  }

  // Update log status (public route)
  async updateLogStatus(logId, statusData) {
    return this.request(`/api/logs/${logId}/status`, {
      method: 'POST',
      body: JSON.stringify(statusData)
    })
  }

  // ADMIN ROUTES
  async getAdminLogs(skip = 0, limit = 100, accidentOnly = false, status = null, source = null) {
    let params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString()
    })
    
    if (accidentOnly) params.append('accident_only', 'true')
    if (status) params.append('status', status)
    if (source) params.append('source', source)
    
    return this.request(`/api/admin/logs?${params.toString()}`)
  }

  async getAdminDashboardStats() {
    return this.request('/api/admin/dashboard/stats')
  }

  async updateAdminLogStatus(logId, statusData) {
    return this.request(`/api/admin/logs/${logId}/status`, {
      method: 'POST',
      body: JSON.stringify(statusData)
    })
  }

  async deleteLog(logId) {
    return this.request(`/api/admin/logs/${logId}`, {
      method: 'DELETE'
    })
  }

  async getAllUsers() {
    return this.request('/api/admin/users')
  }

  async getAllAdmins() {
    return this.request('/api/admin/admins')
  }

  async updateUserStatus(userId, statusData) {
    return this.request(`/api/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify(statusData)
    })
  }

  async createAdmin(adminData) {
    return this.request('/auth/admin/create', {
      method: 'POST',
      body: JSON.stringify(adminData)
    })
  }

  // AUTHENTICATION ROUTES
  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    })
  }

  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    })
  }

  async adminLogin(credentials) {
    return this.request('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    })
  }

  async getCurrentUser() {
    return this.request('/auth/me')
  }

  async getCurrentAdmin() {
    return this.request('/auth/admin/me')
  }

  // Update user profile
  async updateProfile(profileData) {
    return this.request('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    })
  }

  // Change password
  async changePassword(passwordData) {
    return this.request('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(passwordData)
    })
  }

  // Update admin profile
  async updateAdminProfile(profileData) {
    return this.request('/auth/admin/me', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    })
  }

  // Change admin password
  async changeAdminPassword(passwordData) {
    return this.request('/auth/admin/change-password', {
      method: 'PUT',
      body: JSON.stringify(passwordData)
    })
  }
}

// Enhanced WebSocket manager for live detection
class LiveDetectionWebSocket {
  constructor() {
    this.ws = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 1000
    this.isConnected = false
    this.messageHandlers = new Set()
    this.errorHandlers = new Set()
    this.connectionHandlers = new Set()
  }

  getAuthToken() {
    return localStorage.getItem('token') || 
           sessionStorage.getItem('token') || 
           (() => {
             try {
               const userStr = localStorage.getItem('user');
               if (userStr) {
                 const userData = JSON.parse(userStr);
                 return userData.token;
               }
             } catch (e) {
               console.warn('Error parsing user data for WebSocket token:', e);
             }
             return null;
           })();
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        // Convert HTTP URL to WebSocket URL
        const wsURL = API_BASE_URL.replace('https://', 'wss://').replace('http://', 'ws://') + '/api/live/ws'
        console.log('Connecting to WebSocket:', wsURL);
        
        this.ws = new WebSocket(wsURL)

        this.ws.onopen = () => {
          console.log('WebSocket connected successfully')
          this.isConnected = true
          this.reconnectAttempts = 0
          this.connectionHandlers.forEach(handler => handler('connected'))
          
          // Send auth token if available
          const token = this.getAuthToken();
          if (token) {
            console.log('Sending auth token to WebSocket...');
            this.ws.send(JSON.stringify({
              type: 'auth',
              token: token
            }));
          }
          
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            console.log('WebSocket message received:', data);
            this.messageHandlers.forEach(handler => handler(data))
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason)
          this.isConnected = false
          this.connectionHandlers.forEach(handler => handler('disconnected'))
          
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            console.log('WebSocket closed unexpectedly, attempting reconnection...');
            this.attemptReconnect()
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          this.errorHandlers.forEach(handler => handler(error))
          
          // Don't reject immediately, let onclose handle reconnection
          if (this.reconnectAttempts === 0) {
            reject(error)
          }
        }

      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        reject(error)
      }
    })
  }

  attemptReconnect() {
    this.reconnectAttempts++
    console.log(`Attempting WebSocket reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`)
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error(`Reconnection attempt ${this.reconnectAttempts} failed:`, error)
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('Max WebSocket reconnection attempts reached');
          this.errorHandlers.forEach(handler => 
            handler(new Error('Max reconnection attempts reached'))
          )
        }
      })
    }, this.reconnectDelay * this.reconnectAttempts)
  }

  sendFrame(frameData) {
    if (this.isConnected && this.ws) {
      try {
        this.ws.send(JSON.stringify(frameData))
      } catch (error) {
        console.error('Failed to send frame data:', error);
      }
    } else {
      console.warn('WebSocket not connected, cannot send frame')
    }
  }

  onMessage(handler) {
    this.messageHandlers.add(handler)
    return () => this.messageHandlers.delete(handler)
  }

  onError(handler) {
    this.errorHandlers.add(handler)
    return () => this.errorHandlers.delete(handler)
  }

  onConnection(handler) {
    this.connectionHandlers.add(handler)
    return () => this.connectionHandlers.delete(handler)
  }

  disconnect() {
    if (this.ws) {
      console.log('Disconnecting WebSocket...');
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
    this.isConnected = false
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      wsUrl: this.ws ? this.ws.url : null
    }
  }
}

// Enhanced utility functions
export const utils = {
  // Convert canvas to base64
  canvasToBase64(canvas, quality = 0.8) {
    return canvas.toDataURL('image/jpeg', quality).split(',')[1]
  },

  // Convert video frame to base64
  videoFrameToBase64(video, quality = 0.8) {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    canvas.width = video.videoWidth || video.width || 640
    canvas.height = video.videoHeight || video.height || 480
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    return canvas.toDataURL('image/jpeg', quality).split(',')[1]
  },

  // Format file size
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  },

  // Validate file type
  isValidFileType(file) {
    const validTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/avi', 'video/mov', 'video/quicktime', 'video/x-msvideo'
    ]
    return validTypes.includes(file.type.toLowerCase())
  },

  // Get confidence color
  getConfidenceColor(confidence) {
    if (confidence >= 0.8) return '#dc3545' // High risk - red
    if (confidence >= 0.6) return '#fd7e14' // Medium risk - orange
    if (confidence >= 0.4) return '#ffc107' // Low risk - yellow
    return '#28a745' // Very low risk - green
  },

  // Get status badge color
  getStatusColor(status) {
    switch (status?.toLowerCase()) {
      case 'verified': return '#28a745' // green
      case 'resolved': return '#007bff' // blue
      case 'false_alarm': return '#6c757d' // gray
      case 'unresolved': return '#dc3545' // red
      default: return '#ffc107' // yellow
    }
  },

  // Format timestamp
  formatTimestamp(timestamp, options = {}) {
    const date = new Date(timestamp);
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      ...options
    };
    
    return date.toLocaleDateString('en-US', defaultOptions);
  },

  // Debounce function
  debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func(...args);
    };
  },

  // Throttle function
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }
  },

  // Retry function with exponential backoff
  async retry(fn, maxAttempts = 3, baseDelay = 1000) {
    let attempt = 1;
    
    while (attempt <= maxAttempts) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`, error.message);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        attempt++;
      }
    }
  }
}

// Create singleton instances
export const apiClient = new ApiClient()
export const liveDetectionWS = new LiveDetectionWebSocket()

// Export connection test function
export const testBackendConnection = async () => {
  console.log('Testing backend connection...');
  const result = await apiClient.testConnection();
  console.log('Connection test result:', result);
  return result;
}

export default apiClient
