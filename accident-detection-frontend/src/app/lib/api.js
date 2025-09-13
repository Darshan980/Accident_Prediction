// src/lib/api.js - COMPLETE FIXED VERSION for Admin Dashboard
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://accident-prediction-1-mpm0.onrender.com'

export const getApiBaseUrl = () => API_BASE_URL
export const getWebSocketUrl = () => API_BASE_URL.replace('https://', 'wss://').replace('http://', 'ws://')

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL
    this.timeout = 30000
    console.log('🔧 ApiClient initialized:', this.baseURL)
  }

  getAuthToken() {
    const tokenSources = ['token', 'authToken', 'access_token'];

    for (const key of tokenSources) {
      const token = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (token && token !== 'null' && token !== 'undefined' && token.length > 10) {
        console.log(`🔑 Found token from ${key}: ${token.substring(0, 15)}...`);
        return token;
      }
    }

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

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const token = this.getAuthToken();
    
    console.log(`🌐 Making request: ${options.method || 'GET'} ${url}`);
    console.log(`🔐 Auth token: ${token ? 'Present' : 'None'}`);

    const config = {
      method: options.method || 'GET',
      mode: 'cors',
      credentials: token ? 'include' : 'omit',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    if (token && this.requiresAuth(endpoint)) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (options.body && options.body instanceof FormData) {
      delete config.headers['Content-Type'];
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
      
      if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
        throw new Error(`Network error: Cannot connect to ${this.baseURL}. Please check if the backend is running and accessible.`);
      }
      
      throw error;
    }
  }

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

  requiresAuth(endpoint) {
    const publicEndpoints = [
      '/',
      '/health',
      '/model-info',
      '/admin/api/health',
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

  clearTokens() {
    const keys = ['token', 'authToken', 'access_token', 'user'];
    keys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    console.log('🧹 All tokens cleared');
  }

  // FIXED: Admin health check that calls the correct endpoints
  async adminHealthCheck() {
    try {
      console.log('🏥 Admin health check starting...');
      
      // Check all the endpoints your backend actually has
      const healthResponse = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        headers: { 'Accept': 'application/json' }
      });
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log('✅ Admin health check passed:', healthData);
        
        return {
          status: 'online',
          model_loaded: true, // Your backend should return this
          message: 'Backend is running and ready',
          backend_url: this.baseURL,
          api_status: healthData.api_status || 'online',
          timestamp: healthData.timestamp
        };
      } else {
        throw new Error(`Health check failed: ${healthResponse.status}`);
      }
    } catch (error) {
      console.warn('⚠️ Admin health check failed:', error.message);
      return {
        status: 'offline',
        model_loaded: false,
        message: 'Backend server is not accessible',
        error: error.message,
        backend_url: this.baseURL
      };
    }
  }

  // FIXED: Health check for regular components
  async healthCheck() {
    try {
      console.log('🏥 Checking API health...');
      
      // First try the main health endpoint
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Health check passed:', data);
        
        return {
          status: 'online',
          model_loaded: data.model_loaded !== false && data.model !== 'not_loaded',
          message: data.status === 'healthy' ? 'Backend is running and ready' : data.message || 'Ready',
          backend_url: this.baseURL,
          version: data.version,
          timestamp: data.timestamp,
          api_status: data.api_status || 'online'
        };
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
        backend_url: this.baseURL
      };
    }
  }

  // FIXED: Get model status from the correct endpoint
  async getModelStatus() {
    try {
      console.log('🤖 Checking model status...');
      
      const response = await fetch(`${this.baseURL}/model-info`, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Model status received:', data);
        
        return {
          status: 'loaded',
          model_available: data.model_available !== false,
          model_loaded: data.model_loaded !== false,
          model_path: data.model_path,
          model_type: data.model_type,
          threshold: data.threshold,
          input_size: data.input_size,
          message: 'Model is ready for analysis',
          timestamp: data.timestamp,
          version: data.version
        };
      } else {
        throw new Error(`Model status check failed: ${response.status}`);
      }
    } catch (error) {
      console.warn('⚠️ Model status check failed:', error.message);
      return {
        status: 'error',
        model_available: false,
        model_loaded: false,
        message: 'Model status unavailable',
        error: error.message
      };
    }
  }

  // FIXED: Upload file with correct endpoint and auth
  async uploadFile(file, onProgress = null) {
    console.log('📁 Starting file upload...');
    console.log('File details:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

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

    const formData = new FormData();
    formData.append('file', file);

    try {
      if (onProgress) onProgress(10);

      const response = await fetch(`${this.baseURL}/api/upload`, {
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`
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

  // FIXED: Admin upload file with higher limits
  async adminUploadFile(file, onProgress = null) {
    console.log('📁 Admin file upload starting...');
    
    // Validate file for admin upload
    if (!file || !(file instanceof File)) {
      throw new Error('Invalid file object');
    }

    if (file.size > 100 * 1024 * 1024) { // 100MB for admin
      throw new Error('File too large. Maximum size is 100MB for admin uploads.');
    }

    const validTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/avi', 'video/mov', 'video/quicktime', 'video/webm',
      'image/tiff', 'image/bmp'
    ];
    
    if (!validTypes.includes(file.type.toLowerCase())) {
      throw new Error(`Invalid file type. Admin supported: ${validTypes.join(', ')}`);
    }

    const token = this.getAuthToken();
    if (!token) {
      throw new Error('Admin authentication required for file upload.');
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      if (onProgress) onProgress(10);

      const response = await fetch(`${this.baseURL}/api/upload`, {
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (onProgress) onProgress(90);

      console.log(`📤 Admin upload response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Admin upload failed' }));
        throw new Error(errorData.detail || `Admin upload failed: ${response.status}`);
      }

      const result = await response.json();
      if (onProgress) onProgress(100);
      
      console.log('✅ Admin upload successful:', result);
      return result;

    } catch (error) {
      console.error('❌ Admin upload failed:', error);
      throw error;
    }
  }

  // Dashboard methods
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

  // Auth methods
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
}

// Create singleton instance
export const apiClient = new ApiClient();

// Export specific functions for use in admin upload component
export const createRealApiClient = (baseURL = null, token = null) => {
  const apiBase = baseURL || API_BASE_URL;
  
  return {
    healthCheck: async () => {
      try {
        console.log('🏥 Real API health check...');
        const response = await fetch(`${apiBase}/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        });
        
        if (!response.ok) {
          throw new Error(`Health check failed: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Real API health check passed:', data);
        return {
          ...data,
          model_loaded: data.model_loaded !== false && data.api_status === 'online'
        };
      } catch (error) {
        console.error('❌ Real API health check error:', error);
        throw error;
      }
    },

    uploadFile: async (file, progressCallback) => {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${apiBase}/api/upload`, {
          method: 'POST',
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || `Upload failed: ${response.status}`);
        }

        const result = await response.json();
        
        if (progressCallback) {
          progressCallback(100);
        }

        console.log('✅ Real API upload successful:', result);
        return result;
      } catch (error) {
        console.error('❌ Real API upload error:', error);
        throw error;
      }
    },

    getModelInfo: async () => {
      try {
        const response = await fetch(`${apiBase}/model-info`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        });

        if (!response.ok) {
          throw new Error(`Model info failed: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Real API model info:', data);
        return data;
      } catch (error) {
        console.error('❌ Real API model info error:', error);
        throw error;
      }
    },

    configureModel: async (config) => {
      try {
        const response = await fetch(`${apiBase}/api/configure`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          body: JSON.stringify(config)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || `Configuration failed: ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        console.error('❌ Real API configuration error:', error);
        throw error;
      }
    },

    analyzeUrl: async (url) => {
      try {
        const response = await fetch(`${apiBase}/api/analyze-url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          body: JSON.stringify({ url })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || `URL analysis failed: ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        console.error('❌ Real API URL analysis error:', error);
        throw error;
      }
    }
  };
};

export default apiClient;
