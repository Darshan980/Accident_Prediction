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
import './UserUploadPage.css'

/**
 * UserUploadPage Component
 * 
 * A professional enterprise-grade accident detection system interface
 * that provides file upload functionality with AI-powered analysis capabilities.
 * 
 * Features:
 * - Secure user authentication
 * - File validation and processing
 * - Real-time analysis progress tracking
 * - Comprehensive result display
 * - Historical data management
 * - System navigation integration
 * 
 * @component
 * @returns {JSX.Element} The rendered UserUploadPage component
 */
const UserUploadPage = () => {
  // Authentication and user state
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  
  // File upload and processing state
  const [selectedFile, setSelectedFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [error, setError] = useState(null)
  
  // System status and history state
  const [apiStatus, setApiStatus] = useState('checking')
  const [uploadHistory, setUploadHistory] = useState([])

  // Configuration constants
  const ACCEPTED_FILE_TYPES = {
    'image/jpeg': '.jpg',
    'image/png': '.png', 
    'image/gif': '.gif',
    'video/mp4': '.mp4',
    'video/avi': '.avi',
    'video/mov': '.mov',
    'video/quicktime': '.mov'
  }
  
  const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB limit for user uploads
  const MAX_HISTORY_ITEMS = 50
  const DISPLAY_HISTORY_LIMIT = 10

  /**
   * Formats file size in bytes to human-readable format
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size string
   */
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    
    const units = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const base = 1024
    const unitIndex = Math.floor(Math.log(bytes) / Math.log(base))
    const size = parseFloat((bytes / Math.pow(base, unitIndex)).toFixed(2))
    
    return `${size} ${units[unitIndex]}`
  }

  /**
   * Validates if the selected file type is supported
   * @param {File} file - The file to validate
   * @returns {boolean} True if file type is supported
   */
  const isValidFileType = (file) => {
    return Object.keys(ACCEPTED_FILE_TYPES).includes(file.type)
  }

  /**
   * Checks API health status and model availability
   */
  const checkApiHealth = async () => {
    try {
      const healthStatus = await apiClient.healthCheck()
      
      if (healthStatus.fallback) {
        setApiStatus('offline')
        setError('Backend server is currently unavailable. Please contact system administrator.')
      } else {
        setApiStatus(healthStatus.model_loaded ? 'ready' : 'model_not_loaded')
        if (!healthStatus.model_loaded) {
          setError('Analysis engine is initializing. Please wait and try again.')
        }
      }
    } catch (error) {
      console.error('API Health Check Failed:', error)
      setApiStatus('offline')
      setError('Unable to establish connection with analysis server. Please contact technical support.')
    }
  }

  /**
   * Loads user upload history from storage
   */
  const loadUploadHistory = () => {
    try {
      const historyData = JSON.parse(localStorage.getItem('userUploadHistory') || '[]')
      setUploadHistory(historyData.slice(0, DISPLAY_HISTORY_LIMIT))
    } catch (error) {
      console.error('Error loading upload history:', error)
    }
  }

  /**
   * Saves analysis result to user history
   * @param {Object} result - Analysis result object
   * @returns {boolean} Success status
   */
  const saveToHistory = (result) => {
    try {
      const historyEntry = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        filename: result.filename || selectedFile?.name || 'Unknown File',
        file_size: result.file_size || selectedFile?.size || 0,
        content_type: result.content_type || selectedFile?.type || 'Unknown Type',
        accident_detected: result.accident_detected,
        confidence: result.confidence,
        processing_time: result.processing_time,
        predicted_class: result.predicted_class,
        details: result.details,
        user: user?.username || 'System User',
        analysis_type: 'User Upload Analysis'
      }

      const existingHistory = JSON.parse(localStorage.getItem('userUploadHistory') || '[]')
      const updatedHistory = [historyEntry, ...existingHistory].slice(0, MAX_HISTORY_ITEMS)
      
      localStorage.setItem('userUploadHistory', JSON.stringify(updatedHistory))
      setUploadHistory(updatedHistory.slice(0, DISPLAY_HISTORY_LIMIT))
      
      if (result.accident_detected) {
        triggerNotificationAlert(result)
      }
      
      return true
    } catch (error) {
      console.error('Error saving analysis to history:', error)
      return false
    }
  }

  /**
   * Creates notification alert for accident detection
   * @param {Object} result - Analysis result object
   * @returns {boolean} Success status
   */
  const triggerNotificationAlert = (result) => {
    try {
      const alertData = {
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        type: 'accident_detection',
        confidence: result.confidence,
        location: 'User File Upload',
        source: 'File Analysis System',
        acknowledged: false,
        severity: result.confidence > 0.8 ? 'high' : 'medium',
        accident_detected: result.accident_detected,
        predicted_class: result.predicted_class,
        filename: result.filename,
        processing_time: result.processing_time,
        analysis_type: 'User Upload Analysis',
        user: user?.username || 'System User',
        user_type: 'authenticated_user'
      }

      const existingAlerts = JSON.parse(localStorage.getItem('userAlertHistory') || '[]')
      const updatedAlerts = [alertData, ...existingAlerts].slice(0, 25)
      
      localStorage.setItem('userAlertHistory', JSON.stringify(updatedAlerts))
      
      return true
    } catch (error) {
      console.error('Failed to create notification alert:', error)
      return false
    }
  }

  /**
   * Processes selected file for validation and preview
   * @param {File} file - Selected file object
   */
  const processSelectedFile = (file) => {
    if (!file) return

    if (!isValidFileType(file)) {
      setError(`Unsupported file format. Accepted formats: ${Object.values(ACCEPTED_FILE_TYPES).join(', ')}`)
      return
    }
    
    if (file.size > MAX_FILE_SIZE) {
      setError(`File size exceeds maximum limit. Maximum allowed size: ${formatFileSize(MAX_FILE_SIZE)}`)
      return
    }
    
    setSelectedFile(file)
    setAnalysisResult(null)
    setError(null)
    setUploadProgress(0)
    
    // Generate preview for image files
    if (file.type.startsWith('image/')) {
      const fileReader = new FileReader()
      fileReader.onload = (event) => {
        setFilePreview(event.target.result)
      }
      fileReader.readAsDataURL(file)
    } else {
      setFilePreview(null)
    }
  }

  /**
   * Handles file selection from input
   * @param {Event} event - File input change event
   */
  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    processSelectedFile(file)
  }

  /**
   * Handles drag and drop functionality
   */
  const handleDragOver = (event) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (event) => {
    event.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files[0]
    processSelectedFile(file)
  }

  /**
   * Initiates file upload and analysis process
   */
  const handleUpload = async () => {
    if (!selectedFile || !isAuthenticated) {
      return
    }

    if (apiStatus !== 'ready') {
      setError('Analysis system is not ready. Please verify system status and retry.')
      return
    }

    setIsUploading(true)
    setAnalysisResult(null)
    setError(null)
    setUploadProgress(0)
    
    try {
      console.log(`Initiating analysis for user: ${user?.username}`)
      
      const analysisResult = await apiClient.uploadFile(selectedFile, (progress) => {
        setUploadProgress(progress)
      })
      
      console.log('Analysis completed successfully:', analysisResult)
      
      setAnalysisResult(analysisResult)
      saveToHistory(analysisResult)
      
      const notification = notificationService.notifyUploadResult(analysisResult)
      
      if (analysisResult.accident_detected) {
        notificationService.playAlertSound('accident')
        console.log('ALERT: Accident detected - Notification system activated')
      } else {
        notificationService.playAlertSound('completion')
        console.log('INFO: Analysis completed - No incidents detected')
      }
      
    } catch (error) {
      console.error('Analysis failed:', error)
      setError(error.message || 'Analysis process failed. Please retry or contact support.')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  /**
   * Clears selected file and resets form state
   */
  const clearFile = () => {
    setSelectedFile(null)
    setFilePreview(null)
    setAnalysisResult(null)
    setError(null)
    setUploadProgress(0)
    
    const fileInput = document.querySelector('input[type="file"]')
    if (fileInput) {
      fileInput.value = ''
    }
  }

  /**
   * Status Card Component
   * Displays system status information in a structured card format
   */
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

  // Component lifecycle effects
  useEffect(() => {
    checkApiHealth()
    loadUploadHistory()
  }, [])

  useEffect(() => {
    console.log('Authentication Status Check:', { user, isAuthenticated, authLoading })
    
    if (!authLoading && !isAuthenticated) {
      setError('Authentication required. Please sign in to access the analysis system.')
    } else if (!authLoading && isAuthenticated) {
      setError(null)
    }
  }, [isAuthenticated, authLoading, user])

  // Loading state display
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
          <p className="loading-text">Authenticating user session...</p>
        </div>
      </div>
    )
  }

  // Main component render
  return (
    <div className="admin-container">
      <div className="admin-wrapper">
        {/* Application Header */}
        <div className="admin-header">
          <div className="header-content">
            <div className="header-title">
              <div className="header-icon">
                <Upload />
              </div>
              <div className="header-text">
                <h1>Enterprise Accident Detection System</h1>
                <p>AI-Powered Traffic Safety Analysis Platform</p>
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

        {/* Authentication Required Notice */}
        {!isAuthenticated && (
          <div className="auth-error">
            <div className="auth-error-content">
              <div className="auth-error-icon">
                <Shield size={32} />
              </div>
              <h2 className="auth-error-title">Authentication Required</h2>
              <p className="auth-error-text">
                Access to the accident detection analysis system requires authenticated user credentials. 
                Please complete the authentication process to proceed with file analysis operations.
              </p>
              <div className="auth-error-buttons">
                <button
                  onClick={() => window.location.href = '/auth'}
                  className="btn btn-primary"
                >
                  Authenticate Account
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="btn btn-secondary"
                >
                  Return to Home
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Authenticated User Interface */}
        {isAuthenticated && (
          <>
            {/* System Status Overview */}
            <div className="status-grid">
              <StatusCard
                title="User Authentication"
                value={`Authenticated: ${user?.username || 'System User'}`}
                icon={Shield}
                status="success"
              />

              <StatusCard
                title="Analysis Engine"
                value={apiStatus === 'ready' ? 'Service Operational' : 'System Initializing'}
                icon={Zap}
                status={apiStatus === 'ready' ? 'success' : 'warning'}
                isWarning={apiStatus !== 'ready'}
              />

              <StatusCard
                title="System Status"
                value="Fully Operational"
                icon={Activity}
                status="success"
              />

              <StatusCard
                title="Data Processing"
                value="Real-time Processing Available"
                icon={Database}
                status="success"
              />
            </div>

            {/* Error Notification Display */}
            {error && (
              <div className="error-alert">
                <div className="error-content">
                  <AlertTriangle size={20} />
                  <span className="error-text">{error}</span>
                </div>
              </div>
            )}

            {/* File Upload Interface */}
            <div className="upload-section">
              <div className="section-header">
                <div className="section-icon">
                  <FileUp size={20} />
                </div>
                <div>
                  <h3 className="section-title">File Analysis Upload Interface</h3>
                  <p className="section-description">
                    Upload media files for comprehensive AI-powered accident detection analysis
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
                   (isDragging ? 'Release to Select File' : 'File Upload Interface')}
                </h3>
                
                <p className="upload-subtitle">
                  {selectedFile ? 'File ready for analysis processing' :
                   (isDragging ? 'Release file to begin selection process' : 'Select files for comprehensive analysis processing')}
                </p>
                
                {!selectedFile && (
                  <>
                    <input 
                      type="file" 
                      accept={Object.keys(ACCEPTED_FILE_TYPES).join(',')}
                      onChange={handleFileSelect}
                      className="file-input"
                      id="file-upload"
                    />
                    
                    <label htmlFor="file-upload" className="file-input-label">
                      <Upload size={18} />
                      Select File for Analysis
                    </label>
                    
                    <p className="upload-hint">
                      Supported formats: {Object.values(ACCEPTED_FILE_TYPES).join(', ')} | Maximum file size: {formatFileSize(MAX_FILE_SIZE)}
                    </p>
                  </>
                )}
                
                {selectedFile && (
                  <div className="file-selected">
                    {filePreview && (
                      <img 
                        src={filePreview} 
                        alt="Selected File Preview" 
                        className="file-preview"
                      />
                    )}
                    
                    <div className="file-details">
                      <div className="file-detail-row">
                        <span className="detail-label">File Name:</span>
                        <span className="detail-value">{selectedFile.name}</span>
                      </div>
                      <div className="file-detail-row">
                        <span className="detail-label">File Size:</span>
                        <span className="detail-value">{formatFileSize(selectedFile.size)}</span>
                      </div>
                      <div className="file-detail-row">
                        <span className="detail-label">Content Type:</span>
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
                            Processing Analysis {uploadProgress}%
                          </>
                        ) : (
                          <>
                            <Zap size={18} />
                            Initiate Analysis
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

            {/* Analysis Progress Indicator */}
            {isUploading && (
              <div className="progress-section">
                <div className="progress-header">
                  <div className="progress-spinner"></div>
                  <span className="progress-text">Analysis Processing in Progress</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="progress-label">
                  {uploadProgress}% Complete • Advanced neural network analysis in progress
                </p>
              </div>
            )}

            {/* Analysis Results Display */}
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
                        Analysis Confidence Level: {(analysisResult.confidence * 100).toFixed(1)}%
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
                        <span className="detail-label">File Name:</span>
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
                        <span className="detail-label">Classification Result:</span>
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
                        <span className="detail-label">Processing Time:</span>
                        <span className="detail-value">{analysisResult.processing_time?.toFixed(3)}s</span>
                      </div>
                      <div className="result-detail">
                        <span className="detail-label">Frames Analyzed:</span>
                        <span className="detail-value">{analysisResult.frames_analyzed || 1}</span>
                      </div>
                      <div className="result-detail">
                        <span className="detail-label">Model Version:</span>
                        <span className="detail-value">Enterprise v2.1.0</span>
                      </div>
                      <div className="result-detail">
                        <span className="detail-label">Processing Type:</span>
                        <span className="detail-value">Real-time Analysis</span>
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

            {/* Upload History Section */}
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
                          {item.accident_detected ? 'ACCIDENT DETECTED' : 'NO INCIDENT'}
                        </span>
                        <p className="history-confidence">
                          Confidence: {(item.confidence * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {uploadHistory.length > 5 && (
                  <div className="view-all-section">
                    <a href="/dashboard" className="view-all-link">
                      <Eye size={16} />
                      View Complete Analysis History
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* System Navigation */}
            <div className="navigation-section">
              <div className="section-header">
                <div className="section-icon">
                  <Settings size={20} />
                </div>
                <div>
                  <h3 className="section-title">System Navigation</h3>
                  <p className="section-description">Access additional system modules and administrative features</p>
                </div>
              </div>
              <div className="navigation-grid">
                <a href="/dashboard" className="nav-link">
                  <div className="nav-icon">
                    <BarChart3 size={20} />
                  </div>
                  <div className="nav-text">
                    <div className="nav-link-title">Analytics Dashboard</div>
                    <div className="nav-link-desc">System performance metrics and comprehensive reports</div>
                  </div>
                </a>
                
                <a href="/live" className="nav-link">
                  <div className="nav-icon">
                    <Eye size={20} />
                  </div>
                  <div className="nav-text">
                    <div className="nav-link-title">Live Detection Monitor</div>
                    <div className="nav-link-desc">Real-time incident monitoring and surveillance</div>
                  </div>
                </a>
                
                <a href="/notification" className="nav-link">
                  <div className="nav-icon">
                    <AlertCircle size={20} />
                  </div>
                  <div className="nav-text">
                    <div className="nav-link-title">Notification Center</div>
                    <div className="nav-link-desc">Alert management and notification settings</div>
                  </div>
                </a>
                
                <a href="/settings" className="nav-link">
                  <div className="nav-icon">
                    <Settings size={20} />
                  </div>
                  <div className="nav-text">
                    <div className="nav-link-title">System Configuration</div>
                    <div className="nav-link-desc">Advanced system settings and preferences</div>
                  </div>
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default UserUploadPage
