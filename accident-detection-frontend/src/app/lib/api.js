// src/lib/api.js - FIXED API client with proper token handling
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL
    this.timeout = 30000 // 30 seconds
  }

  // FIXED: More robust token retrieval with fallback hierarchy
  getAuthToken() {
    // Try different storage locations in order of preference
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

  // FIXED: Better error handling and token validation
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const token = this.getAuthToken();
    
    const config = {
      timeout: this.timeout,
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
        tokenPreview: token ? `${token.substring(0, 10)}...` : 'none'
      });

      const response = await fetch(url, config)
      
      console.log(`Response from ${url}:`, {
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          detail: `HTTP ${response.status}: ${response.statusText}` 
        }))
        
        // Handle authentication errors
        if (response.status === 401) {
          console.warn('Authentication failed, clearing tokens');
          this.clearTokens();
          throw new Error('Authentication required. Please log in again.');
        }
        
        throw new Error(errorData.detail || `HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log(`Success response from ${url}:`, data);
      return data
    } catch (error) {
      console.error(`Request failed for ${url}:`, error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to server. Check if the backend is running on ' + this.baseURL)
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

  // FIXED: Upload file with both XMLHttpRequest and fetch fallback
  async uploadFile(file, onProgress = null) {
    // Debug the file object thoroughly
    console.log('=== FILE UPLOAD DEBUG ===');
    console.log('File object:', file);
    console.log('File constructor:', file.constructor.name);
    console.log('File instanceof File:', file instanceof File);
    console.log('File instanceof Blob:', file instanceof Blob);
    console.log('File properties:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });
    console.log('File keys:', Object.keys(file));
    console.log('File prototype:', Object.getPrototypeOf(file));

    const formData = new FormData()
    formData.append('file', file)

    // Debug FormData
    console.log('FormData created');
    console.log('FormData entries:');
    for (let [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value);
      console.log(`  ${key} type:`, typeof value);
      console.log(`  ${key} constructor:`, value.constructor.name);
      console.log(`  ${key} instanceof File:`, value instanceof File);
      console.log(`  ${key} instanceof Blob:`, value instanceof Blob);
    }

    const token = this.getAuthToken();
    
    if (!token) {
      throw new Error('Authentication required for file upload');
    }

    console.log('Starting file upload:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      hasToken: !!token,
      endpoint: `${this.baseURL}/api/upload`
    });

    // Try XMLHttpRequest first (for progress tracking)
    if (onProgress) {
      return this.uploadFileWithXHR(file, formData, token, onProgress);
    } else {
      // Use fetch as fallback (simpler, more reliable)
      return this.uploadFileWithFetch(file, formData, token);
    }
  }

  // XMLHttpRequest method (with progress tracking)
  async uploadFileWithXHR(file, formData, token, onProgress) {
    const xhr = new XMLHttpRequest()
    
    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const percentComplete = (event.loaded / event.total) * 100
          onProgress(Math.round(percentComplete))
        }
      })

      xhr.addEventListener('load', () => {
        console.log('XHR Upload completed:', {
          status: xhr.status,
          statusText: xhr.statusText,
          responseLength: xhr.responseText?.length || 0,
          responsePreview: xhr.responseText?.substring(0, 200) || 'No response'
        });

        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText)
            console.log('XHR Upload successful:', result);
            resolve(result)
          } catch (parseError) {
            console.error('Failed to parse XHR upload response:', parseError);
            console.error('Raw XHR response:', xhr.responseText);
            reject(new Error(`Invalid JSON response from server: ${parseError.message}`))
          }
        } else {
          let errorMessage = `Upload failed with status ${xhr.status}`;
          
          try {
            const errorData = JSON.parse(xhr.responseText)
            console.log('Parsed error data:', errorData);
            
            // Handle different error response formats
            if (errorData.detail) {
              if (Array.isArray(errorData.detail)) {
                // FastAPI validation errors are arrays
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
            } else if (errorData.error) {
              errorMessage = errorData.error;
            } else {
              errorMessage = JSON.stringify(errorData);
            }
            
            if (xhr.status === 401) {
              console.warn('Authentication failed during XHR upload');
              this.clearTokens();
              errorMessage = 'Authentication required. Please log in again.';
            }
          } catch (parseError) {
            console.error('Failed to parse XHR error response:', parseError);
            console.error('Raw error response:', xhr.responseText);
            errorMessage = `${errorMessage}: ${xhr.statusText}. Raw response: ${xhr.responseText.substring(0, 200)}`;
          }
          
          console.error('XHR Upload failed:', errorMessage);
          reject(new Error(errorMessage))
        }
      })

      xhr.addEventListener('error', (event) => {
        console.error('XHR Network error during upload. Trying fetch fallback...', {
          type: event.type,
          readyState: xhr.readyState,
          status: xhr.status,
          statusText: xhr.statusText
        });
        
        // Try fetch as fallback
        this.uploadFileWithFetch(file, formData, token)
          .then(resolve)
          .catch(fetchError => {
            console.error('Fetch fallback also failed:', fetchError);
            reject(new Error(`Upload failed: ${fetchError.message}`))
          });
      })

      xhr.addEventListener('timeout', () => {
        console.error('XHR Upload timeout, trying fetch fallback...');
        this.uploadFileWithFetch(file, formData, token)
          .then(resolve)
          .catch(fetchError => {
            console.error('Fetch fallback also failed:', fetchError);
            reject(new Error(`Upload timeout: ${fetchError.message}`))
          });
      })

      xhr.addEventListener('abort', () => {
        console.error('XHR Upload aborted');
        reject(new Error('Upload was aborted'))
      })

      try {
        xhr.open('POST', `${this.baseURL}/api/upload`)
        xhr.setRequestHeader('Authorization', `Bearer ${token}`)
        xhr.timeout = 60000 // 60 seconds for file uploads
        
        console.log('Sending XHR upload request...');
        xhr.send(formData)
      } catch (error) {
        console.error('Error setting up XHR upload request, trying fetch fallback:', error);
        // Try fetch as fallback
        this.uploadFileWithFetch(file, formData, token)
          .then(resolve)
          .catch(fetchError => {
            console.error('Fetch fallback also failed:', fetchError);
            reject(new Error(`Failed to initiate upload: ${fetchError.message}`))
          });
      }
    })
  }

  // Fetch method (more reliable, no progress tracking)
  async uploadFileWithFetch(file, formData, token) {
    console.log('Using fetch for file upload...');
    
    try {
      const response = await fetch(`${this.baseURL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type, let browser set it with boundary for FormData
        },
        body: formData
      });

      console.log('Fetch upload response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        let errorMessage = `Upload failed with status ${response.status}`;
        
        try {
          const errorData = await response.json();
          console.log('Fetch parsed error data:', errorData);
          
          // Handle different error response formats
          if (errorData.detail) {
            if (Array.isArray(errorData.detail)) {
              // FastAPI validation errors are arrays
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
          } else if (errorData.error) {
            errorMessage = errorData.error;
          } else {
            errorMessage = JSON.stringify(errorData);
          }
          
          if (response.status === 401) {
            console.warn('Authentication failed during fetch upload');
            this.clearTokens();
            errorMessage = 'Authentication required. Please log in again.';
          }
        } catch (parseError) {
          console.error('Failed to parse fetch error response:', parseError);
          const responseText = await response.text().catch(() => 'Unable to read response');
          console.error('Raw fetch error response:', responseText);
          errorMessage = `${errorMessage}: ${response.statusText}. Raw response: ${responseText.substring(0, 200)}`;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Fetch upload successful:', result);
      return result;
      
    } catch (error) {
      console.error('Fetch upload failed:', error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to server. Check if the backend is running on ' + this.baseURL);
      }
      
      throw error;
    }
  }

  // Health check with fallback
  async healthCheck() {
    try {
      return await this.request('/api/health')
    } catch (error) {
      console.warn('Backend health check failed, using fallback:', error.message);
      // Return a fallback response for development
      return {
        status: 'offline',
        model_loaded: false,
        message: 'Backend server is not running. Please start the Python backend.',
        fallback: true
      }
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
      headers: {
        'Content-Type': 'application/json'
      },
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
      headers: {
        'Content-Type': 'application/json'
      },
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
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(statusData)
    })
  }

  // ADMIN ROUTES - these require admin authentication
  
  // Get admin logs
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

  // Get admin dashboard stats
  async getAdminDashboardStats() {
    return this.request('/api/admin/dashboard/stats')
  }

  // Update log status (admin route)
  async updateAdminLogStatus(logId, statusData) {
    return this.request(`/api/admin/logs/${logId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(statusData)
    })
  }

  // Delete log (admin only)
  async deleteLog(logId) {
    return this.request(`/api/admin/logs/${logId}`, {
      method: 'DELETE'
    })
  }

  // Get all users (admin only)
  async getAllUsers() {
    return this.request('/api/admin/users')
  }

  // Get all admins (super admin only)
  async getAllAdmins() {
    return this.request('/api/admin/admins')
  }

  // Update user status (admin only)
  async updateUserStatus(userId, statusData) {
    return this.request(`/api/admin/users/${userId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(statusData)
    })
  }

  // Create new admin (super admin only)
  async createAdmin(adminData) {
    return this.request('/auth/admin/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(adminData)
    })
  }

  // AUTHENTICATION ROUTES - these don't need /api prefix

  // User registration
  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    })
  }

  // User login
  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    })
  }

  // Admin login
  async adminLogin(credentials) {
    return this.request('/auth/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    })
  }

  // Get current user info
  async getCurrentUser() {
    return this.request('/auth/me')
  }

  // Get current admin info
  async getCurrentAdmin() {
    return this.request('/auth/admin/me')
  }
}

// WebSocket manager for live detection
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

  // Get auth token for WebSocket authentication
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
        const wsURL = API_BASE_URL.replace('http', 'ws') + '/api/live/ws'
        this.ws = new WebSocket(wsURL)

        this.ws.onopen = () => {
          console.log('WebSocket connected')
          this.isConnected = true
          this.reconnectAttempts = 0
          this.connectionHandlers.forEach(handler => handler('connected'))
          
          // Send auth token if available
          const token = this.getAuthToken();
          if (token) {
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
            this.attemptReconnect()
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          this.errorHandlers.forEach(handler => handler(error))
          reject(error)
        }

      } catch (error) {
        reject(error)
      }
    })
  }

  attemptReconnect() {
    this.reconnectAttempts++
    console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`)
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error)
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.errorHandlers.forEach(handler => 
            handler(new Error('Max reconnection attempts reached'))
          )
        }
      })
    }, this.reconnectDelay * this.reconnectAttempts)
  }

  sendFrame(frameData) {
    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify(frameData))
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
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
    this.isConnected = false
  }
}

// Utility functions
export const utils = {
  // Convert canvas to base64
  canvasToBase64(canvas) {
    return canvas.toDataURL('image/jpeg', 0.8).split(',')[1]
  },

  // Convert video frame to base64
  videoFrameToBase64(video) {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    return canvas.toDataURL('image/jpeg', 0.8).split(',')[1]
  },

  // Format file size
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  },

  // Validate file type
  isValidFileType(file) {
    const validTypes = [
      'image/jpeg', 'image/png', 'image/gif',
      'video/mp4', 'video/avi', 'video/mov', 'video/quicktime'
    ]
    return validTypes.includes(file.type)
  },

  // Get confidence color
  getConfidenceColor(confidence) {
    if (confidence >= 0.8) return '#dc3545' // High risk - red
    if (confidence >= 0.6) return '#fd7e14' // Medium risk - orange
    if (confidence >= 0.4) return '#ffc107' // Low risk - yellow
    return '#28a745' // Very low risk - green
  }
}

// Create singleton instances
export const apiClient = new ApiClient()
export const liveDetectionWS = new LiveDetectionWebSocket()

export default apiClient