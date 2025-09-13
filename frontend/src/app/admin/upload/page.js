'use client';
import React, { useState, useRef, useCallback } from 'react';
import { 
  Upload, 
  Camera, 
  Link, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  FileText, 
  Image, 
  Video,
  Loader2,
  Eye,
  Download,
  Clock,
  User,
  Database,
  Shield
} from 'lucide-react';

const AdminUploadComponent = () => {
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [results, setResults] = useState(null);
  const [urlInput, setUrlInput] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const API_BASE_URL = 'https://accident-prediction-1-mpm0.onrender.com';

  // Enhanced token retrieval
  const getAuthToken = useCallback(() => {
    const sources = [
      () => localStorage.getItem('token'),
      () => localStorage.getItem('authToken'),
      () => localStorage.getItem('access_token'),
      () => localStorage.getItem('admin_token'),
      () => {
        try {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          return user.token || user.access_token;
        } catch { return null; }
      },
      () => {
        try {
          const admin = JSON.parse(localStorage.getItem('admin') || localStorage.getItem('adminUser') || '{}');
          return admin.token || admin.access_token;
        } catch { return null; }
      }
    ];

    for (const getToken of sources) {
      const token = getToken();
      if (token && token !== 'null' && token !== 'undefined') {
        return token;
      }
    }
    return null;
  }, []);

  // Enhanced file upload with progress
  const uploadFile = useCallback(async (file) => {
    const token = getAuthToken();
    if (!token) {
      setResults({ 
        error: 'Authentication required. Please log in as admin.',
        requiresAuth: true 
      });
      setUploadStatus('error');
      return;
    }

    // File validation
    const maxSize = 100 * 1024 * 1024; // 100MB for admin
    if (file.size > maxSize) {
      setResults({ 
        error: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB for admin users.`,
        fileSize: Math.round(file.size / (1024 * 1024) * 100) / 100
      });
      setUploadStatus('error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadStatus('uploading');
      setUploadProgress(0);
      setResults(null);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result = await response.json();

      if (response.ok && result.success !== false) {
        setResults({
          ...result,
          uploadedAt: new Date().toISOString(),
          originalFile: {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
          }
        });
        setUploadStatus('success');
      } else {
        setResults({ 
          error: result.detail || result.error || 'Upload failed',
          statusCode: response.status,
          response: result
        });
        setUploadStatus('error');
      }
    } catch (error) {
      setResults({ 
        error: `Network error: ${error.message}`,
        networkError: true 
      });
      setUploadStatus('error');
    } finally {
      setUploadProgress(0);
    }
  }, [getAuthToken]);

  // Enhanced URL analysis
  const analyzeUrl = useCallback(async (url) => {
    const token = getAuthToken();
    if (!token) {
      setResults({ 
        error: 'Authentication required. Please log in as admin.',
        requiresAuth: true 
      });
      setUploadStatus('error');
      return;
    }

    // URL validation
    try {
      new URL(url);
    } catch {
      setResults({ error: 'Please enter a valid URL' });
      setUploadStatus('error');
      return;
    }

    try {
      setUploadStatus('uploading');
      setUploadProgress(0);
      setResults(null);

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 15, 85));
      }, 300);

      const response = await fetch(`${API_BASE_URL}/api/analyze-url`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ url })
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result = await response.json();

      if (response.ok && result.success !== false) {
        setResults({
          ...result,
          analyzedAt: new Date().toISOString(),
          sourceUrl: url
        });
        setUploadStatus('success');
      } else {
        setResults({ 
          error: result.detail || result.error || 'URL analysis failed',
          statusCode: response.status,
          sourceUrl: url
        });
        setUploadStatus('error');
      }
    } catch (error) {
      setResults({ 
        error: `Network error: ${error.message}`,
        networkError: true,
        sourceUrl: url
      });
      setUploadStatus('error');
    } finally {
      setUploadProgress(0);
    }
  }, [getAuthToken]);

  // File handling
  const handleFileSelect = useCallback((files) => {
    if (files && files[0]) {
      uploadFile(files[0]);
    }
  }, [uploadFile]);

  // Drag and drop handlers
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  // URL submission
  const handleUrlSubmit = useCallback(() => {
    const trimmedUrl = urlInput.trim();
    if (trimmedUrl) {
      analyzeUrl(trimmedUrl);
    }
  }, [urlInput, analyzeUrl]);

  const handleUrlKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      handleUrlSubmit();
    }
  }, [handleUrlSubmit]);

  // Reset function
  const resetUpload = useCallback(() => {
    setUploadStatus('idle');
    setResults(null);
    setUrlInput('');
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Helper functions
  const getFileIcon = (filename) => {
    const ext = filename?.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff'].includes(ext)) {
      return <Image className="w-4 h-4 text-blue-500" />;
    }
    if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext)) {
      return <Video className="w-4 h-4 text-purple-500" />;
    }
    return <FileText className="w-4 h-4 text-gray-500" />;
  };

  const getConfidenceLevel = (confidence) => {
    if (confidence >= 0.9) return { level: 'Very High', color: 'text-red-700 bg-red-100', barColor: 'bg-red-600' };
    if (confidence >= 0.8) return { level: 'High', color: 'text-red-600 bg-red-50', barColor: 'bg-red-500' };
    if (confidence >= 0.6) return { level: 'Medium', color: 'text-orange-600 bg-orange-50', barColor: 'bg-orange-500' };
    if (confidence >= 0.4) return { level: 'Low', color: 'text-yellow-600 bg-yellow-50', barColor: 'bg-yellow-500' };
    return { level: 'Very Low', color: 'text-green-600 bg-green-50', barColor: 'bg-green-500' };
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(typeof timestamp === 'number' ? timestamp * 1000 : timestamp);
      return date.toLocaleString();
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 bg-blue-100 rounded-full">
            <Camera className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Accident Detection</h1>
            <div className="flex items-center justify-center gap-2 mt-1">
              <Shield className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-600 font-medium">Admin Access Enabled</span>
            </div>
          </div>
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Advanced AI-powered accident detection system. Upload images, videos, or analyze URLs 
          to detect potential accidents with high accuracy confidence scoring.
        </p>
      </div>

      {/* Upload Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* File Upload Section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Upload className="w-5 h-5" />
              File Upload
            </h2>
            <p className="text-blue-100 mt-1">Drag & drop or browse files</p>
          </div>
          
          <div className="p-6">
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                dragActive 
                  ? 'border-blue-400 bg-blue-50 scale-105' 
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              } ${uploadStatus === 'uploading' ? 'pointer-events-none opacity-50' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 bg-gray-100 rounded-full">
                    <Upload className="w-8 h-8 text-gray-400" />
                  </div>
                </div>
                
                <div>
                  <p className="text-gray-700 font-medium mb-2">
                    Drop files here or{' '}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-blue-600 hover:text-blue-700 underline font-semibold"
                      disabled={uploadStatus === 'uploading'}
                    >
                      browse files
                    </button>
                  </p>
                  <p className="text-sm text-gray-500">
                    Admin supports: Images, Videos, Documents (up to 100MB)
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4 text-xs text-gray-500">
                  <div className="flex items-center justify-center gap-1">
                    <Image className="w-3 h-3" />
                    <span>Images</span>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <Video className="w-3 h-3" />
                    <span>Videos</span>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <FileText className="w-3 h-3" />
                    <span>Documents</span>
                  </div>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,video/*,.txt,.csv,.json"
                onChange={(e) => handleFileSelect(e.target.files)}
                disabled={uploadStatus === 'uploading'}
              />
            </div>
          </div>
        </div>

        {/* URL Analysis Section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Link className="w-5 h-5" />
              URL Analysis
            </h2>
            <p className="text-green-100 mt-1">Analyze remote images & videos</p>
          </div>
          
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image or Video URL
              </label>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyPress={handleUrlKeyPress}
                placeholder="https://example.com/image.jpg"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                disabled={uploadStatus === 'uploading'}
              />
            </div>
            
            <button
              onClick={handleUrlSubmit}
              disabled={uploadStatus === 'uploading' || !urlInput.trim()}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2"
            >
              {uploadStatus === 'uploading' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Analyze URL
                </>
              )}
            </button>

            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
              <p className="font-medium mb-1">Supported URL formats:</p>
              <p>Direct links to JPG, PNG, GIF, MP4, AVI, MOV files</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {uploadStatus === 'uploading' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Processing...</span>
            <span className="text-sm text-gray-500">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Analyzing content with AI models...
          </p>
        </div>
      )}

      {/* Results Section */}
      {results && uploadStatus !== 'uploading' && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Analysis Results</h2>
              <button
                onClick={resetUpload}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-200 transition-colors"
                title="Clear results"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6">
            {results.error ? (
              /* Error Display */
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <div className="flex items-start space-x-3">
                    <XCircle className="w-6 h-6 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-red-800 mb-2">
                        Analysis Failed
                      </h3>
                      <p className="text-red-700 mb-3">{results.error}</p>
                      
                      {results.statusCode && (
                        <div className="text-sm text-red-600 bg-red-100 rounded px-2 py-1 inline-block">
                          Status: {results.statusCode}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {results.requiresAuth && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-800 text-sm">
                      Please ensure you are logged in with admin credentials and try again.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Success Results Display */
              <div className="space-y-6">
                {/* Main Detection Result */}
                <div className={`rounded-lg p-6 border-2 ${
                  results.accident_detected 
                    ? 'bg-red-50 border-red-200' 
                    : 'bg-green-50 border-green-200'
                }`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {results.accident_detected ? (
                        <AlertTriangle className="w-8 h-8 text-red-600" />
                      ) : (
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      )}
                      <div>
                        <h3 className={`text-xl font-bold ${
                          results.accident_detected ? 'text-red-800' : 'text-green-800'
                        }`}>
                          {results.accident_detected ? 'Accident Detected' : 'No Accident Detected'}
                        </h3>
                        <p className={`text-sm ${
                          results.accident_detected ? 'text-red-600' : 'text-green-600'
                        }`}>
                          AI analysis completed successfully
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Confidence Display */}
                  {results.confidence !== undefined && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-700">Confidence Level:</span>
                        <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          getConfidenceLevel(results.confidence).color
                        }`}>
                          {getConfidenceLevel(results.confidence).level} ({(results.confidence * 100).toFixed(1)}%)
                        </div>
                      </div>
                      <div className="relative">
                        <div className="w-full bg-gray-200 rounded-full h-4">
                          <div
                            className={`h-4 rounded-full transition-all duration-1000 ${
                              getConfidenceLevel(results.confidence).barColor
                            }`}
                            style={{ width: `${results.confidence * 100}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>0%</span>
                          <span>50%</span>
                          <span>100%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* File Information Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* File Details */}
                  <div className="bg-gray-50 rounded-lg p-5">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      File Information
                    </h4>
                    <div className="space-y-3">
                      {(results.filename || results.originalFile?.name) && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Name:</span>
                          <div className="flex items-center space-x-2">
                            {getFileIcon(results.filename || results.originalFile?.name)}
                            <span className="font-medium text-gray-900 truncate max-w-48">
                              {results.filename || results.originalFile?.name}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {results.source_url && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Source:</span>
                          <a 
                            href={results.source_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 underline truncate max-w-48"
                            title={results.source_url}
                          >
                            View Original
                          </a>
                        </div>
                      )}

                      {(results.file_size_mb || results.originalFile?.size) && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Size:</span>
                          <span className="font-medium">
                            {results.file_size_mb ? `${results.file_size_mb} MB` : formatFileSize(results.originalFile?.size)}
                          </span>
                        </div>
                      )}

                      {(results.content_type || results.originalFile?.type) && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Type:</span>
                          <span className="font-medium font-mono text-sm">
                            {results.content_type || results.originalFile?.type}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Analysis Details */}
                  <div className="bg-gray-50 rounded-lg p-5">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Analysis Details
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">User:</span>
                        <span className="font-medium">{results.username || 'Admin'}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium capitalize">
                          {results.analysis_type?.replace('_', ' ') || 'File Upload'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Processed:</span>
                        <span className="font-medium text-sm">
                          {formatTimestamp(results.upload_timestamp || results.analysis_timestamp || results.uploadedAt)}
                        </span>
                      </div>

                      {results.log_id && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Log ID:</span>
                          <span className="font-mono text-sm bg-gray-200 px-2 py-1 rounded">
                            #{results.log_id}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Actions */}
                {results.snapshot_url && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Camera className="w-5 h-5 text-blue-600" />
                        <div>
                          <h4 className="font-semibold text-blue-900">Analysis Snapshot Available</h4>
                          <p className="text-sm text-blue-700">View the processed analysis frame</p>
                        </div>
                      </div>
                      <a
                        href={results.snapshot_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
                      >
                        <Eye className="w-4 h-4" />
                        View Snapshot
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Features Info */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-600" />
          Admin Features Enabled
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-indigo-100">
            <h4 className="font-medium text-indigo-900 mb-2">Enhanced File Support</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Images: JPG, PNG, GIF, WebP, BMP, TIFF</li>
              <li>• Videos: MP4, AVI, MOV, MKV, WebM</li>
              <li>• Documents: TXT, CSV, JSON</li>
            </ul>
          </div>
          <div className="bg-white rounded-lg p-4 border border-indigo-100">
            <h4 className="font-medium text-indigo-900 mb-2">Higher Limits</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• File size: Up to 100MB</li>
              <li>• Priority processing</li>
              <li>• Detailed analysis logs</li>
            </ul>
          </div>
          <div className="bg-white rounded-lg p-4 border border-indigo-100">
            <h4 className="font-medium text-indigo-900 mb-2">Advanced Features</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Snapshot generation</li>
              <li>• Database logging</li>
              <li>• User tracking</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUploadComponent;
