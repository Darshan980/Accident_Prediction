'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { apiClient } from '../../lib/api'
import notificationService from '../../lib/notificationService'
import { 
  CheckCircle, XCircle, AlertCircle, Upload, Server, Key, User, 
  FileText, Clock, Target, Activity, Shield, Database, Settings,
  TrendingUp, Zap, Eye, BarChart3, FileUp, AlertTriangle
} from 'lucide-react'

const UserUploadPage = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  
  const [selectedFile, setSelectedFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [error, setError] = useState(null)
  const [apiStatus, setApiStatus] = useState('checking')
  const [uploadHistory, setUploadHistory] = useState([])

  // Local utility function to format file sizes
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  useEffect(() => {
    checkApiHealth()
    loadUploadHistory()
  }, [])

  useEffect(() => {
    console.log('User Upload Auth Check:', { user, isAuthenticated, authLoading })
    
    if (!authLoading && !isAuthenticated) {
      setError('You must be logged in to upload files for analysis.')
    } else if (!authLoading && isAuthenticated) {
      setError(null)
    }
  }, [isAuthenticated, authLoading, user])

  const checkApiHealth = async () => {
    try {
      const health = await apiClient.healthCheck()
      if (health.fallback) {
        setApiStatus('offline')
        setError('Backend server is not running. Please start the Python backend server on http://localhost:8000')
      } else {
        setApiStatus(health.model_loaded ? 'ready' : 'model_not_loaded')
        if (!health.model_loaded) {
          setError('AI model is not loaded on the backend. Please check the server logs.')
        }
      }
    } catch (error) {
      console.error('API health check failed:', error)
      setApiStatus('offline')
      setError('Cannot connect to backend server. Please ensure the Python backend is running on http://localhost:8000')
    }
  }

  const loadUploadHistory = () => {
    try {
      const history = JSON.parse(localStorage.getItem('userUploadHistory') || '[]')
      setUploadHistory(history.slice(0, 10)) // Show last 10 uploads
    } catch (error) {
      console.error('Error loading upload history:', error)
    }
  }

  const saveToHistory = (result) => {
    try {
      const historyItem = {
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        filename: result.filename || selectedFile?.name || 'unknown',
        file_size: result.file_size || selectedFile?.size || 0,
        content_type: result.content_type || selectedFile?.type || 'unknown',
        accident_detected: result.accident_detected,
        confidence: result.confidence,
        processing_time: result.processing_time,
        predicted_class: result.predicted_class,
        details: result.details,
        user: user?.username || 'user',
        analysis_type: 'user_upload'
      }

      const existingHistory = JSON.parse(localStorage.getItem('userUploadHistory') || '[]')
      const updatedHistory = [historyItem, ...existingHistory].slice(0, 50) // Keep last 50
      
      localStorage.setItem('userUploadHistory', JSON.stringify(updatedHistory))
      setUploadHistory(updatedHistory.slice(0, 10))
      
      // Also trigger notification if accident detected
      if (result.accident_detected) {
        triggerNotificationAlert(result)
      }
      
      return true
    } catch (error) {
      console.error('Error saving to history:', error)
      return false
    }
  }

  const triggerNotificationAlert = (result) => {
    try {
      const alertItem = {
        id: `user-alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        type: 'accident',
        confidence: result.confidence,
        location: 'User Upload',
        source: 'User File Upload',
        acknowledged: false,
        severity: result.confidence > 0.8 ? 'high' : 'medium',
        accident_detected: result.accident_detected,
        predicted_class: result.predicted_class,
        filename: result.filename,
        processing_time: result.processing_time,
        analysis_type: 'User Upload Analysis',
        user: user?.username || 'user',
        user_type: 'user'
      }

      const existingAlerts = JSON.parse(localStorage.getItem('userAlertHistory') || '[]')
      existingAlerts.unshift(alertItem)
      const trimmedAlerts = existingAlerts.slice(0, 25) // Keep last 25 alerts for users
      
      localStorage.setItem('userAlertHistory', JSON.stringify(trimmedAlerts))
      
      return true
    } catch (error) {
      console.error('Failed to trigger notification alert:', error)
      return false
    }
  }

  const acceptedTypes = {
    'image/jpeg': '.jpg',
    'image/png': '.png', 
    'image/gif': '.gif',
    'video/mp4': '.mp4',
    'video/avi': '.avi',
    'video/mov': '.mov',
    'video/quicktime': '.mov'
  }

  const isValidFileType = (file) => {
    return Object.keys(acceptedTypes).includes(file.type)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    processSelectedFile(file)
  }

  const processSelectedFile = (file) => {
    if (!file) return

    if (!isValidFileType(file)) {
      setError(`Invalid file type. Please upload: ${Object.values(acceptedTypes).join(', ')}`)
      return
    }
    
    // User file size limit: 25MB
    if (file.size > 25 * 1024 * 1024) {
      setError('File too large. Maximum size is 25MB for user uploads.')
      return
    }
    
    console.log('Processing file:', file);
    console.log('File is instance of File:', file instanceof File);
    
    // Store the file object directly - DO NOT SPREAD IT
    setSelectedFile(file)
    setAnalysisResult(null)
    setError(null)
    setUploadProgress(0)
    
    // Create preview for image files using a separate state
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        // Store preview separately to avoid corrupting the File object
        setFilePreview(e.target.result)
      }
      reader.readAsDataURL(file)
    } else {
      setFilePreview(null)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    processSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile || !isAuthenticated) return

    if (apiStatus !== 'ready') {
      setError('API is not ready. Please check your connection and try again.')
      return
    }

    setIsUploading(true)
    setAnalysisResult(null)
    setError(null)
    setUploadProgress(0)
    
    try {
      console.log('Starting upload for user:', user?.username)
      
      const result = await apiClient.uploadFile(selectedFile, (progress) => {
        setUploadProgress(progress)
      })
      
      console.log('Upload successful:', result)
      
      setAnalysisResult(result)
      saveToHistory(result)
      
      // Create notification ONLY for accidents
      const notification = notificationService.notifyUploadResult(result)
      
      // Play sound based on result
      if (result.accident_detected) {
        notificationService.playAlertSound('accident')
        console.log('🚨 [UPLOAD] Accident detected - notification created:', notification)
      } else {
        notificationService.playAlertSound('completion')
        console.log('✅ [UPLOAD] Safe result - no notification created')
      }
      
    } catch (error) {
      console.error('Upload failed:', error)
      setError(error.message || 'Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const clearFile = () => {
    setSelectedFile(null)
    setFilePreview(null)
    setAnalysisResult(null)
    setError(null)
    setUploadProgress(0)
    const fileInput = document.querySelector('input[type="file"]')
    if (fileInput) fileInput.value = ''
  }

  const StatusCard = ({ title, value, icon: Icon, status, isDanger, isWarning }) => (
    <div className={`status-card ${isDanger ? 'danger' : isWarning ? 'warning' : 'normal'}`}>
      <div className="status-card-content">
        <div className="status-icon-container">
          <Icon className="status-card-icon" />
        </div>
        <div className="status-text">
          <p className="status-value">{value}</p>
          <p className="status-title">{title}</p>
        </div>
        <div className="status-indicator">
          {status === 'success' && <CheckCircle className="indicator-success" />}
          {status === 'error' && <XCircle className="indicator-error" />}
          {status === 'warning' && <AlertCircle className="indicator-warning" />}
        </div>
      </div>
    </div>
  )

  if (authLoading) {
    return (
      <div className="loading-container">
        <div className="loading-card">
          <div className="loading-spinner">
            <div className="spinner-dot"></div>
            <div className="spinner-dot"></div>
            <div className="spinner-dot"></div>
          </div>
          <h3 className="loading-title">System Initialization</h3>
          <p className="loading-text">Authenticating session...</p>
        </div>
        <style jsx>{`
          .loading-container {
            min-height: 100vh;
            background: #f8f9fa;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
          }
          
          .loading-card {
            background: white;
            border-radius: 8px;
            padding: 3rem;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            border: 1px solid #e9ecef;
            max-width: 400px;
          }
          
          .loading-spinner {
            display: flex;
            justify-content: center;
            gap: 0.5rem;
            margin: 0 auto 2rem;
          }
          
          .spinner-dot {
            width: 12px;
            height: 12px;
            background: #6c757d;
            border-radius: 50%;
            animation: bounce 1.4s ease-in-out infinite both;
          }
          
          .spinner-dot:nth-child(1) { animation-delay: -0.32s; }
          .spinner-dot:nth-child(2) { animation-delay: -0.16s; }
          
          .loading-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: #212529;
            margin-bottom: 0.5rem;
          }
          
          .loading-text {
            color: #6c757d;
            margin: 0;
          }
          
          @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="admin-container">
      <div className="admin-wrapper">
        {/* Header */}
        <div className="admin-header">
          <div className="header-content">
            <div className="header-title">
              <div className="header-icon">
                <Upload />
              </div>
              <div className="header-text">
                <h1>Accident Detection System</h1>
                <p>Enterprise AI-Powered Traffic Safety Analysis</p>
              </div>
            </div>
            {isAuthenticated && user && (
              <div className="user-badge">
                <User size={18} />
                <span className="user-name">{user.username}</span>
                {user.role && (
                  <span className="user-role">
                    • {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Authentication Error */}
        {!isAuthenticated && (
          <div className="auth-error">
            <div className="auth-error-content">
              <div className="auth-error-icon">
                <Shield size={32} />
              </div>
              <h2 className="auth-error-title">Authentication Required</h2>
              <p className="auth-error-text">
                Access to the accident detection system requires valid user credentials. 
                Please authenticate to proceed with file analysis.
              </p>
              <div className="auth-error-buttons">
                <button
                  onClick={() => window.location.href = '/auth'}
                  className="btn btn-primary"
                >
                  Sign In / Register
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="btn btn-secondary"
                >
                  Return Home
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Only show upload interface if authenticated */}
        {isAuthenticated && (
          <>
            {/* Status Cards */}
            <div className="status-grid">
              <StatusCard
                title="User Authentication"
                value={`Authenticated: ${user?.username || 'User'}`}
                icon={Shield}
                status="success"
              />

              <StatusCard
                title="Analysis Engine"
                value={apiStatus === 'ready' ? 'Service Ready' : 'Initializing'}
                icon={Zap}
                status={apiStatus === 'ready' ? 'success' : 'warning'}
                isWarning={apiStatus !== 'ready'}
              />

              <StatusCard
                title="System Status"
                value="Operational"
                icon={Activity}
                status="success"
              />

              <StatusCard
                title="Data Processing"
                value="Real-time Available"
                icon={Database}
                status="success"
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className="error-alert">
                <div className="error-content">
                  <AlertTriangle size={20} />
                  <span className="error-text">{error}</span>
                </div>
              </div>
            )}

            {/* Upload Section */}
            <div className="upload-section">
              <div className="section-header">
                <div className="section-icon">
                  <FileUp size={20} />
                </div>
                <div>
                  <h3 className="section-title">File Analysis Upload</h3>
                  <p className="section-description">
                    Upload image or video files for AI-powered accident detection analysis
                  </p>
                </div>
              </div>

              <div 
                className={`upload-area ${
                  isDragging ? 'dragging' : 
                  selectedFile ? 'has-file' : 'default'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="upload-icon">
                  {selectedFile ? <FileUp size={32} /> : 
                   (isDragging ? <Upload size={32} /> : <FileUp size={32} />)}
                </div>
                
                <h3 className="upload-title">
                  {selectedFile ? selectedFile.name : 
                   (isDragging ? 'Drop file to upload' : 'File Upload Area')}
                </h3>
                
                <p className="upload-subtitle">
                  {selectedFile ? 'Ready for analysis' :
                   (isDragging ? 'Release to select file' : 'Select or drag files for processing')}
                </p>
                
                {!selectedFile && (
                  <>
                    <input 
                      type="file" 
                      accept={Object.keys(acceptedTypes).join(',')}
                      onChange={handleFileSelect}
                      className="file-input"
                      id="file-upload"
                    />
                    
                    <label htmlFor="file-upload" className="file-input-label">
                      <Upload size={18} />
                      Select File
                    </label>
                    
                    <p className="upload-hint">
                      Accepted formats: {Object.values(acceptedTypes).join(', ')} | Maximum size: 25MB
                    </p>
                  </>
                )}
                
                {selectedFile && (
                  <div className="file-selected">
                    {filePreview && (
                      <img 
                        src={filePreview} 
                        alt="File Preview" 
                        className="file-preview"
                      />
                    )}
                    
                    <div className="file-details">
                      <div className="file-detail-row">
                        <span className="detail-label">Filename:</span>
                        <span className="detail-value">{selectedFile.name}</span>
                      </div>
                      <div className="file-detail-row">
                        <span className="detail-label">Size:</span>
                        <span className="detail-value">{formatFileSize(selectedFile.size)}</span>
                      </div>
                      <div className="file-detail-row">
                        <span className="detail-label">Type:</span>
                        <span className="detail-value">{selectedFile.type}</span>
                      </div>
                    </div>
                    
                    <div className="file-actions">
                      <button
                        onClick={handleUpload}
                        disabled={isUploading || apiStatus !== 'ready'}
                        className={`btn btn-primary ${
                          isUploading || apiStatus !== 'ready' ? 'disabled' : ''
                        }`}
                      >
                        {isUploading ? (
                          <>
                            <div className="btn-spinner"></div>
                            Processing {uploadProgress}%
                          </>
                        ) : (
                          <>
                            <Zap size={18} />
                            Start Analysis
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={clearFile}
                        disabled={isUploading}
                        className="btn btn-secondary"
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="progress-section">
                <div className="progress-header">
                  <div className="progress-spinner"></div>
                  <span className="progress-text">Analysis in Progress</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="progress-label">
                  {uploadProgress}% • Processing with neural network analysis
                </p>
              </div>
            )}

            {/* Analysis Results */}
            {analysisResult && (
              <div className="results-section">
                <div className="section-header">
                  <div className="section-icon">
                    <Target size={20} />
                  </div>
                  <div>
                    <h3 className="section-title">Analysis Results</h3>
                  </div>
                </div>
                
                <div className={`result-alert ${
                  analysisResult.accident_detected ? 'accident' : 'safe'
                }`}>
                  <div className="result-content">
                    <div className="result-icon">
                      {analysisResult.accident_detected ? 
                        <XCircle size={24} /> : <CheckCircle size={24} />
                      }
                    </div>
                    <div className="result-info">
                      <h4 className={`result-status ${
                        analysisResult.accident_detected ? 'accident' : 'safe'
                      }`}>
                        {analysisResult.accident_detected ? 'ACCIDENT DETECTED' : 'NO ACCIDENT DETECTED'}
                      </h4>
                      <p className={`result-confidence ${
                        analysisResult.accident_detected ? 'accident' : 'safe'
                      }`}>
                        Confidence Level: {(analysisResult.confidence * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="result-grid">
                  <div className="result-card">
                    <div className="result-card-header">
                      <div className="result-card-icon">
                        <FileText size={18} />
                      </div>
                      <span className="result-card-title">File Information</span>
                    </div>
                    <div className="result-card-content">
                      <div className="result-detail">
                        <span className="detail-label">Filename:</span>
                        <span className="detail-value">{analysisResult.filename}</span>
                      </div>
                      <div className="result-detail">
                        <span className="detail-label">File Size:</span>
                        <span className="detail-value">{formatFileSize(analysisResult.file_size)}</span>
                      </div>
                      <div className="result-detail">
                        <span className="detail-label">Content Type:</span>
                        <span className="detail-value">{analysisResult.content_type}</span>
                      </div>
                      <div className="result-detail">
                        <span className="detail-label">Classification:</span>
                        <span className="detail-value">{analysisResult.predicted_class}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="result-card">
                    <div className="result-card-header">
                      <div className="result-card-icon">
                        <Clock size={18} />
                      </div>
                      <span className="result-card-title">Processing Metrics</span>
                    </div>
                    <div className="result-card-content">
                      <div className="result-detail">
                        <span className="detail-label">Analysis Time:</span>
                        <span className="detail-value">{analysisResult.processing_time?.toFixed(3)}s</span>
                      </div>
                      <div className="result-detail">
                        <span className="detail-label">Frames Analyzed:</span>
                        <span className="detail-value">{analysisResult.frames_analyzed || 1}</span>
                      </div>
                      <div className="result-detail">
                        <span className="detail-label">Model Version:</span>
                        <span className="detail-value">v2.1.0</span>
                      </div>
                      <div className="result-detail">
                        <span className="detail-label">Processing Type:</span>
                        <span className="detail-value">Real-time</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {analysisResult.details && (
                  <div className="result-details">
                    <h4 className="details-title">Additional Analysis Information</h4>
                    <p className="details-content">{analysisResult.details}</p>
                  </div>
                )}
              </div>
            )}

            {/* Upload History */}
            {uploadHistory.length > 0 && (
              <div className="history-section">
                <div className="section-header">
                  <div className="section-icon">
                    <BarChart3 size={20} />
                  </div>
                  <div>
                    <h3 className="section-title">Recent Analysis History</h3>
                  </div>
                </div>
                <div className="history-list">
                  {uploadHistory.slice(0, 5).map((item) => (
                    <div key={item.id} className="history-item">
                      <div className="history-info">
                        <div className="history-file-icon">
                          <FileText size={16} />
                        </div>
                        <div className="history-details">
                          <h4 className="history-filename">{item.filename}</h4>
                          <p className="history-timestamp">
                            {new Date(item.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="history-result">
                        <span className={`history-badge ${
                          item.accident_detected ? 'accident' : 'safe'
                        }`}>
                          {item.accident_detected ? 'ACCIDENT' : 'SAFE'}
                        </span>
                        <p className="history-confidence">
                          {(item.confidence * 100).toFixed(1)}% confidence
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {uploadHistory.length > 5 && (
                  <div className="view-all-section">
                    <a href="/dashboard" className="view-all-link">
                      <Eye size={16} />
                      View Complete History
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Section */}
            <div className="navigation-section">
              <div className="section-header">
                <div className="section-icon">
                  <Settings size={20} />
                </div>
                <div>
                  <h3 className="section-title">System Navigation</h3>
                  <p className="section-description">Access other system modules and features</p>
                </div>
              </div>
              <div className="navigation-grid">
                <a href="/dashboard" className="nav-link">
                  <div className="nav-icon">
                    <BarChart3 size={20} />
                  </div>
                  <div className="nav-text">
                    <div className="nav-link-title">Analytics Dashboard</div>
                    <div className="nav-link-desc">System metrics and reports</div>
                  </div>
                </a>
                
                <a href="/live" className="nav-link">
                  <div className="nav-icon">
                    <Eye size={20} />
                  </div>
                  <div className="nav-text">
                    <div className="nav-link-title">Live Detection</div>
                    <div className="nav-link-desc">Real-time monitoring</div>
                  </div>
                </a>
                
                <a href="/notification" className="nav-link">
                  <div className="nav-icon">
                    <AlertCircle size={20} />
                  </div>
                  <div className="nav-text">
                    <div className="nav-link-title">Notifications</div>
                    <div className="nav-link-desc">Alert management</div>
                  </div>
                </a>
                
                <a href="/settings" className="nav-link">
                  <div className="nav-icon">
                    <Settings size={20} />
                  </div>
                  <div className="nav-text">
                    <div className="nav-link-title">System Settings</div>
                    <div className="nav-link-desc">Configuration options</div>
                  </div>
                </a>
              </div>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .admin-container {
          min-height: 100vh;
          background: #f8f9fa;
          padding: 1.5rem;
        }
        
        .admin-wrapper {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .admin-header {
          background: white;
          border-radius: 8px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          border: 1px solid #dee2e6;
        }
        
        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }
        
        .header-title {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .header-icon {
          width: 48px;
          height: 48px;
          background: #495057;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        
        .header-text h1 {
          font-size: 1.75rem;
          font-weight: 600;
          color: #212529;
          margin: 0;
        }
        
        .header-text p {
          color: #6c757d;
          margin: 0.25rem 0 0 0;
          font-size: 0.875rem;
        }
        
        .user-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          color: #495057;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.875rem;
        }
        
        .user-name {
          font-weight: 600;
          color: #212529;
        }
        
        .user-role {
          color: #6c757d;
        }
        
        .auth-error {
          background: white;
          border-radius: 8px;
          padding: 2.5rem;
          margin-bottom: 2rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          border: 1px solid #f8d7da;
          text-align: center;
        }
        
        .auth-error-content {
          max-width: 500px;
          margin: 0 auto;
        }
        
        .auth-error-icon {
          width: 64px;
          height: 64px;
          background: #dc3545;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          margin: 0 auto 1.5rem;
        }
        
        .auth-error-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #212529;
          margin-bottom: 1rem;
        }
        
        .auth-error-text {
          color: #6c757d;
          margin-bottom: 2rem;
          line-height: 1.5;
        }
        
        .auth-error-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }
        
        .btn {
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
        }
        
        .btn-primary {
          background: #007bff;
          color: white;
          border: 1px solid #007bff;
        }
        
        .btn-primary:hover:not(.disabled) {
          background: #0056b3;
          border-color: #0056b3;
        }
        
        .btn-secondary {
          background: #6c757d;
          color: white;
          border: 1px solid #6c757d;
        }
        
        .btn-secondary:hover {
          background: #545b62;
          border-color: #545b62;
        }
        
        .btn.disabled,
        .btn:disabled {
          background: #e9ecef;
          color: #6c757d;
          cursor: not-allowed;
          border-color: #dee2e6;
        }
        
        .btn-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top-color: currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        .status-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        
        .status-card {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          border: 1px solid #dee2e6;
        }
        
        .status-card.danger {
          border-left: 4px solid #dc3545;
        }
        
        .status-card.warning {
          border-left: 4px solid #ffc107;
        }
        
        .status-card.normal {
          border-left: 4px solid #28a745;
        }
        
        .status-card-content {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .status-icon-container {
          width: 40px;
          height: 40px;
          background: #f8f9fa;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .status-card-icon {
          width: 20px;
          height: 20px;
          color: #495057;
        }
        
        .status-text {
          flex: 1;
        }
        
        .status-value {
          font-size: 1rem;
          font-weight: 600;
          color: #212529;
          margin: 0 0 0.25rem 0;
        }
        
        .status-title {
          color: #6c757d;
          font-size: 0.875rem;
          margin: 0;
        }
        
        .status-indicator {
          margin-left: auto;
        }
        
        .indicator-success {
          width: 20px;
          height: 20px;
          color: #28a745;
        }
        
        .indicator-error {
          width: 20px;
          height: 20px;
          color: #dc3545;
        }
        
        .indicator-warning {
          width: 20px;
          height: 20px;
          color: #ffc107;
        }
        
        .error-alert {
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 6px;
          padding: 1rem;
          margin-bottom: 2rem;
        }
        
        .error-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .error-text {
          color: #721c24;
          font-weight: 500;
        }
        
        .upload-section,
        .results-section,
        .history-section,
        .navigation-section,
        .progress-section {
          background: white;
          border-radius: 8px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          border: 1px solid #dee2e6;
        }
        
        .progress-section {
          border-left: 4px solid #007bff;
        }
        
        .section-header {
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #dee2e6;
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }
        
        .section-icon {
          width: 32px;
          height: 32px;
          background: #f8f9fa;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #495057;
          flex-shrink: 0;
        }
        
        .section-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #212529;
          margin: 0;
        }
        
        .section-description {
          color: #6c757d;
          margin: 0.5rem 0 0 0;
          font-size: 0.875rem;
        }
        
        .upload-area {
          border: 2px dashed #dee2e6;
          border-radius: 8px;
          padding: 3rem 2rem;
          text-align: center;
          transition: all 0.2s ease;
          background: #f8f9fa;
        }
        
        .upload-area.dragging {
          border-color: #007bff;
          background: #e3f2fd;
        }
        
        .upload-area.has-file {
          border-color: #28a745;
          background: #f8fff9;
        }
        
        .upload-icon {
          width: 64px;
          height: 64px;
          background: #495057;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          margin: 0 auto 1.5rem;
        }
        
        .upload-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #212529;
          margin-bottom: 0.5rem;
        }
        
        .upload-subtitle {
          color: #6c757d;
          margin-bottom: 2rem;
        }
        
        .file-input {
          display: none;
        }
        
        .file-input-label {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: #007bff;
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.2s ease;
          border: 1px solid #007bff;
        }
        
        .file-input-label:hover {
          background: #0056b3;
          border-color: #0056b3;
        }
        
        .upload-hint {
          color: #6c757d;
          font-size: 0.875rem;
          margin-top: 1rem;
        }
        
        .file-preview {
          max-width: 300px;
          max-height: 200px;
          border-radius: 6px;
          margin: 0 auto 1.5rem;
          border: 1px solid #dee2e6;
        }
        
        .file-details {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          padding: 1rem;
          margin-bottom: 1.5rem;
          text-align: left;
          max-width: 400px;
          margin-left: auto;
          margin-right: auto;
        }
        
        .file-detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }
        
        .file-detail-row:last-child {
          margin-bottom: 0;
        }
        
        .detail-label {
          font-weight: 500;
          color: #495057;
        }
        
        .detail-value {
          color: #212529;
        }
        
        .file-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }
        
        .progress-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        
        .progress-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e9ecef;
          border-top-color: #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        .progress-text {
          font-size: 1.125rem;
          font-weight: 600;
          color: #212529;
        }
        
        .progress-bar {
          width: 100%;
          height: 8px;
          background: #e9ecef;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          background: #007bff;
          transition: width 0.3s ease;
          border-radius: 4px;
        }
        
        .progress-label {
          text-align: center;
          color: #495057;
          font-size: 0.875rem;
          margin-top: 1rem;
        }
        
        .result-alert {
          border-radius: 6px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          border: 1px solid;
        }
        
        .result-alert.accident {
          background: #f8d7da;
          border-color: #f5c6cb;
        }
        
        .result-alert.safe {
          background: #d4edda;
          border-color: #c3e6cb;
        }
        
        .result-content {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .result-icon {
          color: inherit;
        }
        
        .result-info {
          flex: 1;
        }
        
        .result-status {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }
        
        .result-status.accident {
          color: #721c24;
        }
        
        .result-status.safe {
          color: #155724;
        }
        
        .result-confidence {
          font-size: 0.875rem;
          font-weight: 500;
          margin: 0;
        }
        
        .result-confidence.accident {
          color: #721c24;
        }
        
        .result-confidence.safe {
          color: #155724;
        }
        
        .result-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
        }
        
        .result-card {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          padding: 1.5rem;
        }
        
        .result-card-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #dee2e6;
        }
        
        .result-card-icon {
          width: 32px;
          height: 32px;
          background: #495057;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        
        .result-card-title {
          font-weight: 600;
          color: #212529;
          font-size: 1rem;
        }
        
        .result-card-content {
          color: #495057;
          line-height: 1.5;
        }
        
        .result-detail {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }
        
        .result-detail:last-child {
          margin-bottom: 0;
        }
        
        .result-details {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          padding: 1.5rem;
          margin-top: 1.5rem;
        }
        
        .details-title {
          font-weight: 600;
          color: #212529;
          margin-bottom: 0.75rem;
          font-size: 1rem;
        }
        
        .details-content {
          color: #495057;
          margin: 0;
          line-height: 1.5;
        }
        
        .history-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .history-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 6px;
        }
        
        .history-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .history-file-icon {
          width: 36px;
          height: 36px;
          background: #495057;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        
        .history-details {
          
        }
        
        .history-filename {
          font-weight: 500;
          color: #212529;
          margin: 0 0 0.25rem 0;
          font-size: 0.875rem;
        }
        
        .history-timestamp {
          font-size: 0.75rem;
          color: #6c757d;
          margin: 0;
        }
        
        .history-result {
          text-align: right;
        }
        
        .history-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
          display: inline-block;
        }
        
        .history-badge.accident {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        
        .history-badge.safe {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        
        .history-confidence {
          font-size: 0.75rem;
          color: #6c757d;
          margin: 0;
        }
        
        .view-all-section {
          text-align: center;
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid #dee2e6;
        }
        
        .view-all-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: white;
          color: #007bff;
          padding: 0.5rem 1rem;
          border: 1px solid #007bff;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 500;
          transition: all 0.2s ease;
          font-size: 0.875rem;
        }
        
        .view-all-link:hover {
          background: #007bff;
          color: white;
        }
        
        .navigation-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1rem;
        }
        
        .nav-link {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem;
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          text-decoration: none;
          color: #212529;
          transition: all 0.2s ease;
        }
        
        .nav-link:hover {
          background: #e9ecef;
          text-decoration: none;
          color: #212529;
        }
        
        .nav-icon {
          width: 40px;
          height: 40px;
          background: #495057;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }
        
        .nav-text {
          flex: 1;
        }
        
        .nav-link-title {
          font-weight: 600;
          margin-bottom: 0.25rem;
        }
        
        .nav-link-desc {
          font-size: 0.875rem;
          color: #6c757d;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        
        @media (max-width: 768px) {
          .admin-container {
            padding: 1rem;
          }
          
          .admin-header {
            padding: 1.5rem;
          }
          
          .header-content {
            flex-direction: column;
            text-align: center;
          }
          
          .status-grid {
            grid-template-columns: 1fr;
          }
          
          .result-grid {
            grid-template-columns: 1fr;
          }
          
          .navigation-grid {
            grid-template-columns: 1fr;
          }
          
          .history-item {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }
          
          .upload-area {
            padding: 2rem 1rem;
          }
          
          .file-actions {
            flex-direction: column;
            align-items: center;
          }
          
          .auth-error-buttons {
            flex-direction: column;
            align-items: center;
          }
          
          .upload-section,
          .results-section,
          .history-section,
          .navigation-section,
          .progress-section {
            padding: 1.5rem;
          }
          
          .section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }
        }
      `}</style>
    </div>
  )
}

export default UserUploadPage
