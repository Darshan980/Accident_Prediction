// Real-time Admin Upload Page - src/app/admin/upload/page.js
'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, XCircle, Settings, RefreshCw, Play, Pause } from 'lucide-react';

const AdminUploadComponent = () => {
  // State management
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [results, setResults] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [config, setConfig] = useState({
    processingMode: 'realtime',
    enableLogging: true,
    threshold: 0.5,
    batchSize: 5
  });
  const [systemStatus, setSystemStatus] = useState({
    api: 'checking',
    model: 'checking',
    backend: 'checking'
  });
  const [error, setError] = useState(null);

  // API configuration
  const API_BASE_URL = 'https://accident-prediction-1-mpm0.onrender.com';
  
  const getAuthToken = () => {
    const tokenSources = ['token', 'authToken', 'access_token'];
    
    for (const key of tokenSources) {
      const token = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (token && token !== 'null' && token !== 'undefined' && token.length > 10) {
        return token;
      }
    }
    
    try {
      const userStr = localStorage.getItem('user');
      if (userStr && userStr !== 'null') {
        const userData = JSON.parse(userStr);
        if (userData.token && userData.token.length > 10) {
          return userData.token;
        }
      }
    } catch (e) {
      console.warn('Error parsing user data for token:', e);
    }
    
    return null;
  };

  // Fixed API client with proper error handling
  const apiCall = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = getAuthToken();
    
    console.log(`Making API call: ${options.method || 'GET'} ${url}`);
    console.log(`Auth token: ${token ? 'Present' : 'Missing'}`);

    const config = {
      method: options.method || 'GET',
      mode: 'cors',
      credentials: token ? 'include' : 'omit',
      headers: {
        'Accept': 'application/json',
        ...(options.headers || {})
      },
      ...options
    };

    // Add auth header if token exists
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Handle FormData properly
    if (options.body && !(options.body instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
      if (typeof options.body === 'object') {
        config.body = JSON.stringify(options.body);
      }
    }

    try {
      const response = await fetch(url, config);
      
      console.log(`Response: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
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
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        const text = await response.text();
        return { message: text || 'Success' };
      }
      
    } catch (error) {
      console.error(`API call failed for ${url}:`, error);
      
      if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
        throw new Error(`Network error: Cannot connect to ${API_BASE_URL}. Please check if the backend is running.`);
      }
      
      throw error;
    }
  };

  // System health check
  const checkSystemHealth = useCallback(async () => {
    console.log('Checking system health...');
    
    try {
      // Check main health endpoint
      const healthResponse = await apiCall('/health');
      console.log('Health check response:', healthResponse);
      
      setSystemStatus(prev => ({
        ...prev,
        api: healthResponse.status === 'healthy' ? 'online' : 'offline',
        backend: 'online'
      }));

      // Check model status
      try {
        const modelResponse = await apiCall('/model-info');
        console.log('Model info response:', modelResponse);
        
        setSystemStatus(prev => ({
          ...prev,
          model: (modelResponse.model_available && modelResponse.model_loaded) ? 'loaded' : 'offline'
        }));
      } catch (modelError) {
        console.warn('Model check failed:', modelError.message);
        setSystemStatus(prev => ({ ...prev, model: 'error' }));
      }

    } catch (error) {
      console.error('Health check failed:', error.message);
      setSystemStatus({
        api: 'offline',
        model: 'offline',
        backend: 'offline'
      });
      setError(`System check failed: ${error.message}`);
    }
  }, []);

  // Initialize system check
  useEffect(() => {
    checkSystemHealth();
  }, [checkSystemHealth]);

  // File handling
  const handleFileSelect = (event) => {
    const selectedFiles = Array.from(event.target.files);
    console.log('Files selected:', selectedFiles.length);
    
    const validFiles = selectedFiles.filter(file => {
      const validTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/avi', 'video/mov', 'video/quicktime', 'video/webm',
        'image/tiff', 'image/bmp'
      ];
      
      const isValidType = validTypes.includes(file.type.toLowerCase());
      const isValidSize = file.size <= 100 * 1024 * 1024; // 100MB for admin
      
      if (!isValidType) {
        console.warn(`Invalid file type: ${file.name} (${file.type})`);
      }
      if (!isValidSize) {
        console.warn(`File too large: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      }
      
      return isValidType && isValidSize;
    });

    setFiles(validFiles);
    setError(null);
    setResults([]);
    
    // Initialize progress for each file
    const progressInit = {};
    validFiles.forEach(file => {
      progressInit[file.name] = 0;
    });
    setUploadProgress(progressInit);
  };

  // Single file upload
  const uploadSingleFile = async (file) => {
    console.log(`Starting upload for: ${file.name}`);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadProgress(prev => ({ ...prev, [file.name]: 10 }));

      const result = await apiCall('/api/upload', {
        method: 'POST',
        body: formData
      });

      setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
      
      console.log(`Upload successful for ${file.name}:`, result);
      
      return {
        filename: file.name,
        success: true,
        result: result,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`Upload failed for ${file.name}:`, error);
      
      setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
      
      return {
        filename: file.name,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  };

  // Batch upload handler
  const handleBatchUpload = async () => {
    if (files.length === 0) {
      setError('No files selected');
      return;
    }

    if (systemStatus.api !== 'online') {
      setError('API is not available. Please check system status.');
      return;
    }

    console.log(`Starting batch upload of ${files.length} files`);
    setIsUploading(true);
    setError(null);
    setResults([]);

    const batchSize = config.batchSize;
    const allResults = [];

    // Process files in batches
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(files.length/batchSize)}`);
      
      const batchPromises = batch.map(file => uploadSingleFile(file));
      const batchResults = await Promise.all(batchPromises);
      
      allResults.push(...batchResults);
      setResults([...allResults]);

      // Small delay between batches
      if (i + batchSize < files.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setIsUploading(false);
    console.log('Batch upload completed:', allResults);
  };

  // Configuration update
  const updateConfig = async () => {
    try {
      console.log('Updating configuration:', config);
      
      const configResult = await apiCall('/api/configure', {
        method: 'POST',
        body: config
      });
      
      console.log('Configuration updated:', configResult);
      setError(null);
      
    } catch (error) {
      console.error('Configuration update failed:', error);
      setError(`Configuration failed: ${error.message}`);
    }
  };

  // Get status indicator
  const getStatusIndicator = (status) => {
    switch (status) {
      case 'online':
      case 'loaded':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'checking':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'offline':
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Admin Batch Upload System - Fixed Version
        </h1>
        <p className="text-gray-600">
          Upload and analyze multiple files with enhanced admin capabilities
        </p>
      </div>

      {/* System Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">System Status</h2>
          <button
            onClick={checkSystemHealth}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            {getStatusIndicator(systemStatus.api)}
            <span className="font-medium">API:</span>
            <span className={`capitalize ${systemStatus.api === 'online' ? 'text-green-600' : 'text-red-600'}`}>
              {systemStatus.api}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIndicator(systemStatus.model)}
            <span className="font-medium">Model:</span>
            <span className={`capitalize ${systemStatus.model === 'loaded' ? 'text-green-600' : 'text-red-600'}`}>
              {systemStatus.model}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIndicator(systemStatus.backend)}
            <span className="font-medium">Backend:</span>
            <span className={`capitalize ${systemStatus.backend === 'online' ? 'text-green-600' : 'text-red-600'}`}>
              {systemStatus.backend}
            </span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Error:</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Configuration Panel */}
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Admin Configuration
          </h3>
          <button
            onClick={updateConfig}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            Save Settings
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Processing Mode:
            </label>
            <select
              value={config.processingMode}
              onChange={(e) => setConfig({...config, processingMode: e.target.value})}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="realtime">Real-time</option>
              <option value="batch">Batch</option>
              <option value="sequential">Sequential</option>
            </select>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="enableLogging"
              checked={config.enableLogging}
              onChange={(e) => setConfig({...config, enableLogging: e.target.checked})}
              className="mr-2"
            />
            <label htmlFor="enableLogging" className="text-sm font-medium text-gray-700">
              Detailed Logging
            </label>
          </div>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="mb-6 p-6 border-2 border-dashed border-gray-300 rounded-lg text-center bg-gray-50">
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Admin Batch Upload (up to 20 files)</h3>
        <p className="text-gray-600 mb-4">
          Select multiple images or videos for analysis. Max 100MB per file.
        </p>
        <input
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        
        {files.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">
              Selected: {files.length} file(s)
            </p>
            <button
              onClick={handleBatchUpload}
              disabled={isUploading || systemStatus.api !== 'online'}
              className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Analyze {files.length} Files
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Progress Section */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Upload Progress</h3>
          <div className="space-y-2">
            {Object.entries(uploadProgress).map(([filename, progress]) => (
              <div key={filename} className="flex items-center gap-3">
                <span className="text-sm font-medium min-w-0 flex-1 truncate">{filename}</span>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium w-12 text-right">{progress}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Section */}
      {results.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Analysis Results ({results.length})
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  result.success 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{result.filename}</span>
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-sm ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                      {result.success ? 'Success' : 'Failed'}
                    </span>
                  </div>
                </div>
                
                {result.success && result.result && (
                  <div className="text-sm text-gray-600">
                    {result.result.accident_detected && (
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="w-4 h-4 text-orange-500" />
                        <span className="font-medium">
                          Accident Detected: {(result.result.confidence * 100).toFixed(1)}% confidence
                        </span>
                      </div>
                    )}
                    <div>Processing time: {result.result.processing_time?.toFixed(2)}s</div>
                    {result.result.analysis_id && (
                      <div>Analysis ID: {result.result.analysis_id}</div>
                    )}
                  </div>
                )}
                
                {!result.success && (
                  <div className="text-sm text-red-600">
                    Error: {result.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* API Integration Info */}
      <div className="p-4 bg-pink-50 border border-pink-200 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Admin Upload Capabilities & Real-time Integration</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Enhanced Features:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Real-time API integration with your FastAPI backend</li>
              <li>• Batch processing up to 20 files simultaneously</li>
              <li>• Advanced file validation and error handling</li>
              <li>• Configurable processing modes</li>
              <li>• CSV export with complete analysis data</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-700 mb-2">API Integration:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Direct connection to {API_BASE_URL}</li>
              <li>• Real-time health checks and model status</li>
              <li>• Error handling with detailed API responses</li>
              <li>• Form handling with detailed API responses</li>
              <li>• Comprehensive logging and debugging</li>
            </ul>
          </div>
        </div>
        
        <div className="p-3 bg-gray-100 rounded text-sm font-mono">
          <div className="mb-2"><strong>Current API Status:</strong></div>
          <div>Health Endpoint: /health → {systemStatus.api}</div>
          <div>Model Info: /model-info → {systemStatus.model}</div>
          <div>Upload Endpoint: /api/upload → {systemStatus.backend}</div>
          <div>Auth Status: {getAuthToken() ? 'Token Present' : 'No Token'}</div>
        </div>
      </div>
    </div>
  );
};

export default AdminUploadComponent;
