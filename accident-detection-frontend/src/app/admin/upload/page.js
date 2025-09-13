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

  const StatusCard = ({ title, value, icon: Icon, status, gradient, textColor, iconColor }) => (
    <div className="status-card" style={{ background: gradient }}>
      <div className="status-card-content">
        <div className="status-icon-container" style={{ backgroundColor: iconColor }}>
          <Icon className="status-card-icon" />
        </div>
        <div className="status-text">
          <p className="status-value" style={{ color: textColor }}>{value}</p>
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
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
          </div>
          <h3 className="loading-title">Initializing System</h3>
          <p className="loading-text">Please wait while we authenticate your session...</p>
        </div>
        <style jsx>{`
          .loading-container {
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
          }
          
          .loading-card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 3rem;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
          
          .loading-spinner {
            position: relative;
            width: 80px;
            height: 80px;
            margin: 0 auto 2rem;
          }
          
          .spinner-ring {
            position: absolute;
            width: 100%;
            height: 100%;
            border: 4px solid transparent;
            border-radius: 50%;
            animation: spin 1.5s linear infinite;
          }
          
          .spinner-ring:nth-child(1) {
            border-top-color: #667eea;
            animation-delay: 0s;
          }
          
          .spinner-ring:nth-child(2) {
            border-right-color: #764ba2;
            animation-delay: 0.3s;
          }
          
          .spinner-ring:nth-child(3) {
            border-bottom-color: #f093fb;
            animation-delay: 0.6s;
          }
          
          .loading-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: #2d3748;
            margin-bottom: 0.5rem;
          }
          
          .loading-text {
            color: #718096;
            margin: 0;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
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
                <p>Advanced AI-Powered Traffic Safety Analysis</p>
              </div>
            </div>
            {isAuthenticated && user && (
              <div className="user-badge">
                <User size={20} />
                <span>{user.username}</span>
                {user.role && <span>• {user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span>}
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
                You must be logged in to upload files for accident detection analysis. 
                Please authenticate to access the advanced AI analysis features.
              </p>
              <div className="auth-error-buttons">
                <button
                  onClick={() => window.location.href = '/auth'}
                  className="btn btn-primary"
                >
                  Login / Register
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="btn btn-secondary"
                >
                  Go Home
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
                title="Authentication Status"
                value={`Welcome, ${user?.username || 'User'}`}
                icon={Shield}
                status="success"
                gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
                textColor="#ffffff"
                iconColor="rgba(255, 255, 255, 0.2)"
              />

              <StatusCard
                title="AI Analysis Engine"
                value={apiStatus === 'ready' ? 'Ready for Analysis' : 'Initializing...'}
                icon={Zap}
                status={apiStatus === 'ready' ? 'success' : 'warning'}
                gradient={apiStatus === 'ready' ? 
                  "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)" : 
                  "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                }
                textColor="#ffffff"
                iconColor="rgba(255, 255, 255, 0.2)"
              />

              <StatusCard
                title="System Performance"
                value="Optimal"
                icon={Activity}
                status="success"
                gradient="linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)"
                textColor="#ffffff"
                iconColor="rgba(255, 255, 255, 0.2)"
              />

              <StatusCard
                title="Data Processing"
                value="Real-time Analysis"
                icon={Database}
                status="success"
                gradient="linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                textColor="#ffffff"
                iconColor="rgba(255, 255, 255, 0.2)"
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className="error-alert">
                <div className="error-content">
                  <AlertTriangle size={24} color="#dc2626" />
                  <span className="error-text">{error}</span>
                </div>
              </div>
            )}

            {/* Upload Section */}
            <div className="upload-section">
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
                   (isDragging ? 'Drop your file here' : 'Advanced File Analysis')}
                </h3>
                
                <p className="upload-subtitle">
                  {selectedFile ? 'File ready for AI analysis' :
                   (isDragging ? 'Release to upload' : 'Upload images or videos for intelligent accident detection')}
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
                      <Upload size={20} />
                      Choose File
                    </label>
                    
                    <p className="upload-hint">
                      Supported: {Object.values(acceptedTypes).join(', ')} • Max: 25MB • AI-Powered Analysis
                    </p>
                  </>
                )}
                
                {selectedFile && (
                  <div className="file-selected">
                    {filePreview && (
                      <img 
                        src={filePreview} 
                        alt="Preview" 
                        className="file-preview"
                      />
                    )}
                    
                    <div className="file-details">
                      <p><strong>Filename:</strong> {selectedFile.name}</p>
                      <p><strong>Size:</strong> {formatFileSize(selectedFile.size)}</p>
                      <p><strong>Type:</strong> {selectedFile.type}</p>
                    </div>
                    
                    <div className="file-actions">
                      <button
                        onClick={handleUpload}
                        disabled={isUploading || apiStatus !== 'ready'}
                        className={`btn ${
                          isUploading || apiStatus !== 'ready' 
                            ? '' 
                            : 'btn-primary'
                        }`}
                      >
                        {isUploading ? (
                          <>
                            <Activity size={20} className="animate-spin" />
                            Analyzing... {uploadProgress}%
                          </>
                        ) : (
                          <>
                            <Zap size={20} />
                            Start AI Analysis
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={clearFile}
                        disabled={isUploading}
                        className="btn btn-secondary"
                      >
                        Clear File
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
                  <span className="progress-text">AI Processing in Progress...</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="progress-label">
                  {uploadProgress}% • Advanced neural network analysis
                </p>
              </div>
            )}

            {/* Analysis Results */}
            {analysisResult && (
              <div className="results-section">
                <div className="results-header">
                  <div className="results-icon">
                    <Target size={24} />
                  </div>
                  <h3 className="results-title">AI Analysis Results</h3>
                </div>
                
                <div className={`result-alert ${
                  analysisResult.accident_detected ? 'accident' : 'safe'
                }`}>
                  <div className="result-content">
                    <div className="result-emoji">
                      {analysisResult.accident_detected ? '🚨' : '✅'}
                    </div>
                    <div>
                      <h4 className={`result-status ${
                        analysisResult.accident_detected ? 'accident' : 'safe'
                      }`}>
                        {analysisResult.accident_detected ? 'ACCIDENT DETECTED' : 'NO ACCIDENT DETECTED'}
                      </h4>
                      <p className={`result-confidence ${
                        analysisResult.accident_detected ? 'accident' : 'safe'
                      }`}>
                        AI Confidence: {(analysisResult.confidence * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="result-grid">
                  <div className="result-card">
                    <div className="result-card-header">
                      <div className="result-card-icon">
                        <FileText size={20} />
                      </div>
                      <span className="result-card-title">File Analysis</span>
                    </div>
                    <div className="result-card-content">
                      <p><strong>Filename:</strong> {analysisResult.filename}</p>
                      <p><strong>File Size:</strong> {formatFileSize(analysisResult.file_size)}</p>
                      <p><strong>Content Type:</strong> {analysisResult.content_type}</p>
                      <p><strong>Predicted Class:</strong> {analysisResult.predicted_class}</p>
                    </div>
                  </div>
                  
                  <div className="result-card">
                    <div className="result-card-header">
                      <div className="result-card-icon">
                        <Clock size={20} />
                      </div>
                      <span className="result-card-title">Processing Metrics</span>
                    </div>
                    <div className="result-card-content">
                      <p><strong>Analysis Time:</strong> {analysisResult.processing_time?.toFixed(3)}s</p>
                      <p><strong>Frames Analyzed:</strong> {analysisResult.frames_analyzed || 1}</p>
                      <p><strong>Model Version:</strong> v2.1.0</p>
                      <p><strong>Processing Mode:</strong> Real-time</p>
                    </div>
                  </div>
                </div>
                
                {analysisResult.details && (
                  <div className="result-details">
                    <h4><strong>Analysis Details:</strong></h4>
                    <p>{analysisResult.details}</p>
                  </div>
                )}
              </div>
            )}

            {/* Upload History */}
            {uploadHistory.length > 0 && (
              <div className="history-section">
                <div className="history-header">
                  <div className="history-icon">
                    <BarChart3 size={24} />
                  </div>
                  <h3 className="history-title">Analysis History</h3>
                </div>
                <div className="history-list">
                  {uploadHistory.slice(0, 5).map((item) => (
                    <div key={item.id} className="history-item">
                      <div className="history-info">
                        <div className="history-file-icon">
                          <FileText size={20} />
                        </div>
                        <div className="history-details">
                          <h4>{item.filename}</h4>
                          <p className="history-timestamp">
                            {new Date(item.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="history-result">
                        <span className={`history-badge ${
                          item.accident_detected ? 'accident' : 'safe'
                        }`}>
                          {item.accident_detected ? '🚨 ACCIDENT' : '✅ SAFE'}
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
                      <Eye size={20} />
                      View Complete History
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Section */}
            <div className="navigation-section">
              <h3 className="nav-title">System Navigation</h3>
              <div className="navigation-grid">
                <a href="/dashboard" className="nav-link">
                  <div className="nav-icon">
                    <BarChart3 size={24} />
                  </div>
                  <div className="nav-text">
                    <div className="nav-link-title">Analytics Dashboard</div>
                    <div className="nav-link-desc">Comprehensive data insights</div>
                  </div>
                </a>
                
                <a href="/live" className="nav-link">
                  <div className="nav-icon">
                    <Eye size={24} />
                  </div>
                  <div className="nav-text">
                    <div className="nav-link-title">Live Detection</div>
                    <div className="nav-link-desc">Real-time monitoring</div>
                  </div>
                </a>
                
                <a href="/notification" className="nav-link">
                  <div className="nav-icon">
                    <AlertCircle size={24} />
                  </div>
                  <div className="nav-text">
                    <div className="nav-link-title">Alert Center</div>
                    <div className="nav-link-desc">Notification management</div>
                  </div>
                </a>
                
                <a href="/settings" className="nav-link">
                  <div className="nav-icon">
                    <Settings size={24} />
                  </div>
                  <div className="nav-text">
                    <div className="nav-link-title">System Settings</div>
                    <div className="nav-link-desc">Configure preferences</div>
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
          background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
          padding: 2rem;
        }
        
        .admin-wrapper {
          max-width: 1400px;
          margin: 0 auto;
        }
        
        .admin-header {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(15px);
          border-radius: 24px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        
        .header-text h1 {
          font-size: 2rem;
          font-weight: 800;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0;
        }
        
        .header-text p {
          color: #718096;
          margin: 0.25rem 0 0 0;
        }
        
        .user-badge {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 50px;
          font-weight: 600;
        }
        
        .auth-error {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(15px);
          border-radius: 24px;
          padding: 2.5rem;
          margin-bottom: 2rem;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          text-align: center;
        }
        
        .auth-error-content {
          max-width: 500px;
          margin: 0 auto;
        }
        
        .auth-error-icon {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          margin: 0 auto 1.5rem;
        }
        
        .auth-error-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1a202c;
          margin-bottom: 1rem;
        }
        
        .auth-error-text {
          color: #718096;
          margin-bottom: 2rem;
          line-height: 1.6;
        }
        
        .auth-error-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }
        
        .btn {
          padding: 0.75rem 2rem;
          border-radius: 12px;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          border: none;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }
        
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px rgba(102, 126, 234, 0.4);
        }
        
        .btn-secondary {
          background: linear-gradient(135deg, #718096 0%, #4a5568 100%);
          color: white;
          box-shadow: 0 10px 20px rgba(113, 128, 150, 0.3);
        }
        
        .btn-secondary:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px rgba(113, 128, 150, 0.4);
        }
        
        .btn:disabled {
          background: #e2e8f0;
          color: #a0aec0;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        
        .status-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        
        .status-card {
          border-radius: 20px;
          padding: 1.5rem;
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(15px);
        }
        
        .status-card-content {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .status-icon-container {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .status-card-icon {
          width: 24px;
          height: 24px;
          color: white;
        }
        
        .status-text {
          flex: 1;
        }
        
        .status-value {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0 0 0.25rem 0;
        }
        
        .status-title {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.875rem;
          margin: 0;
        }
        
        .status-indicator {
          margin-left: auto;
        }
        
        .indicator-success {
          width: 24px;
          height: 24px;
          color: #10b981;
        }
        
        .indicator-error {
          width: 24px;
          height: 24px;
          color: #ef4444;
        }
        
        .indicator-warning {
          width: 24px;
          height: 24px;
          color: #f59e0b;
        }
        
        .error-alert {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(15px);
          border-radius: 16px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        
        .error-content {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .error-text {
          color: #dc2626;
          font-weight: 600;
        }
        
        .upload-section {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(15px);
          border-radius: 24px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .upload-area {
          border: 2px dashed #cbd5e0;
          border-radius: 20px;
          padding: 3rem 2rem;
          text-align: center;
          transition: all 0.3s ease;
          background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
        }
        
        .upload-area.dragging {
          border-color: #667eea;
          background: linear-gradient(135deg, #ebf4ff 0%, #dbeafe 100%);
          transform: scale(1.02);
        }
        
        .upload-area.has-file {
          border-color: #10b981;
          background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
        }
        
        .upload-icon {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          margin: 0 auto 1.5rem;
          transition: all 0.3s ease;
        }
        
        .upload-area.dragging .upload-icon {
          transform: scale(1.1);
        }
        
        .upload-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #2d3748;
          margin-bottom: 0.5rem;
        }
        
        .upload-subtitle {
          color: #718096;
          margin-bottom: 2rem;
        }
        
        .file-input {
          display: none;
        }
        
        .file-input-label {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 0.75rem 2rem;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }
        
        .file-input-label:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px rgba(102, 126, 234, 0.4);
        }
        
        .upload-hint {
          color: #a0aec0;
          font-size: 0.875rem;
          margin-top: 1rem;
        }
        
        .file-preview {
          max-width: 300px;
          max-height: 200px;
          border-radius: 12px;
          margin: 0 auto 1.5rem;
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
        }
        
        .file-details {
          background: rgba(247, 250, 252, 0.8);
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 1.5rem;
          color: #4a5568;
        }
        
        .file-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }
        
        .progress-section {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(15px);
          border-radius: 20px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.2);
        }
        
        .progress-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        
        .progress-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        .progress-text {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1e40af;
        }
        
        .progress-bar {
          width: 100%;
          height: 12px;
          background: #e5e7eb;
          border-radius: 6px;
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%);
          transition: width 0.3s ease;
          border-radius: 6px;
        }
        
        .progress-label {
          text-align: center;
          color: #1d4ed8;
          font-weight: 600;
          margin-top: 1rem;
        }
        
        .results-section {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(15px);
          border-radius: 24px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .results-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        
        .results-icon {
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        
        .results-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #2d3748;
          margin: 0;
        }
        
        .result-alert {
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 2rem;
          border: 1px solid;
        }
        
        .result-alert.accident {
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
          border-color: #fecaca;
        }
        
        .result-alert.safe {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border-color: #bbf7d0;
        }
        
        .result-content {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
        
        .result-emoji {
          font-size: 3rem;
        }
        
        .result-status {
          font-size: 1.5rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
        }
        
        .result-status.accident {
          color: #dc2626;
        }
        
        .result-status.safe {
          color: #059669;
        }
        
        .result-confidence {
          font-size: 1rem;
          font-weight: 600;
        }
        
        .result-confidence.accident {
          color: #b91c1c;
        }
        
        .result-confidence.safe {
          color: #047857;
        }
        
        .result-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }
        
        .result-card {
          background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
          border-radius: 16px;
          padding: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(10px);
        }
        
        .result-card-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        
        .result-card-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        
        .result-card-title {
          font-weight: 700;
          color: #2d3748;
          font-size: 1.125rem;
        }
        
        .result-card-content {
          color: #4a5568;
          line-height: 1.6;
        }
        
        .result-details {
          background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
          border-radius: 12px;
          padding: 1.5rem;
          margin-top: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.5);
        }
        
        .history-section {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(15px);
          border-radius: 24px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .history-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        
        .history-icon {
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        
        .history-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #2d3748;
          margin: 0;
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
          padding: 1.5rem;
          background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.5);
          transition: all 0.3s ease;
        }
        
        .history-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
        }
        
        .history-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .history-file-icon {
          width: 45px;
          height: 45px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        
        .history-details h4 {
          font-weight: 600;
          color: #2d3748;
          margin: 0 0 0.25rem 0;
        }
        
        .history-timestamp {
          font-size: 0.875rem;
          color: #718096;
          margin: 0;
        }
        
        .history-result {
          text-align: right;
        }
        
        .history-badge {
          padding: 0.5rem 1rem;
          border-radius: 25px;
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          display: inline-block;
        }
        
        .history-badge.accident {
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          color: #991b1b;
        }
        
        .history-badge.safe {
          background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
          color: #166534;
        }
        
        .history-confidence {
          font-size: 0.875rem;
          color: #718096;
        }
        
        .view-all-section {
          text-align: center;
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid #e2e8f0;
        }
        
        .view-all-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 0.75rem 2rem;
          border-radius: 25px;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }
        
        .view-all-link:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px rgba(102, 126, 234, 0.4);
        }
        
        .navigation-section {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(15px);
          border-radius: 24px;
          padding: 2rem;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .nav-title {
          text-align: center;
          font-size: 1.25rem;
          font-weight: 700;
          color: #2d3748;
          margin-bottom: 2rem;
        }
        
        .navigation-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }
        
        .nav-link {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 2rem 1rem;
          background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
          border-radius: 20px;
          text-decoration: none;
          color: #2d3748;
          font-weight: 600;
          transition: all 0.3s ease;
          border: 1px solid rgba(255, 255, 255, 0.5);
        }
        
        .nav-link:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        
        .nav-icon {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          transition: all 0.3s ease;
        }
        
        .nav-link:hover .nav-icon {
          background: rgba(255, 255, 255, 0.2);
        }
        
        .nav-text {
          text-align: center;
        }
        
        .nav-link-title {
          font-size: 1.125rem;
          margin-bottom: 0.5rem;
        }
        
        .nav-link-desc {
          font-size: 0.875rem;
          opacity: 0.8;
        }
        
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          .admin-container {
            padding: 1rem;
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
        }
      `}</style>
    </div>
  )
}

export default UserUploadPage
