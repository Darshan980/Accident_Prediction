'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { apiClient, utils } from '../lib/api'
import notificationService from '../lib/notificationService'
import { CheckCircle, XCircle, AlertCircle, Upload, Server, Key, User, FileText, Clock, Target } from 'lucide-react'

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

  const StatusCard = ({ title, status, icon: Icon, message, color }) => (
    <div className={`status-card ${color}`}>
      <div className="status-card-content">
        <Icon className="status-icon" />
        <div className="status-text">
          <h3 className="status-title">{title}</h3>
          <p className="status-message">{message}</p>
        </div>
        <div className="status-indicator">
          {status === 'success' && <CheckCircle className="status-icon-success" />}
          {status === 'error' && <XCircle className="status-icon-error" />}
          {status === 'warning' && <AlertCircle className="status-icon-warning" />}
        </div>
      </div>
    </div>
  )

  if (authLoading) {
    return (
      <div className="container">
        <div className="loading-container">
          <div className="loading-card">
            <div className="spinner"></div>
            <p className="loading-text">Loading...</p>
          </div>
        </div>
        <style jsx>{`
          .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 1.5rem;
          }
          
          .loading-container {
            display: flex;
            flex-direction: column;
            min-height: 80vh;
            justify-content: center;
            align-items: center;
          }
          
          .loading-card {
            padding: 2rem;
            text-align: center;
            background-color: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #dee2e6;
          }
          
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #e3f2fd;
            border-top: 3px solid #007bff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
          }
          
          .loading-text {
            color: #666;
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
    <div className="main-container">
      <style jsx>{`
        .main-container {
          max-width: 64rem;
          margin: 0 auto;
          padding: 1.5rem;
          background-color: #f9fafb;
          min-height: 100vh;
        }
        
        .page-title {
          font-size: 1.875rem;
          font-weight: bold;
          margin-bottom: 2rem;
          color: #374151;
          text-align: center;
        }
        
        .user-info {
          margin-bottom: 1.5rem;
          padding: 1rem;
          background-color: #eff6ff;
          border-radius: 0.5rem;
          border: 1px solid #bfdbfe;
        }
        
        .user-info-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .user-info-text {
          color: #1e40af;
        }
        
        .auth-error {
          margin-bottom: 2rem;
          padding: 1.5rem;
          background-color: #fef2f2;
          border-radius: 0.75rem;
          border: 1px solid #fecaca;
        }
        
        .auth-error-content {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .auth-error-title {
          font-size: 1.25rem;
          font-weight: bold;
          color: #991b1b;
          margin-bottom: 0.5rem;
        }
        
        .auth-error-text {
          color: #b91c1c;
          margin-bottom: 1rem;
        }
        
        .auth-error-buttons {
          display: flex;
          gap: 0.75rem;
        }
        
        .btn {
          padding: 0.5rem 1rem;
          border-radius: 0.25rem;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          border: none;
          transition: background-color 0.2s;
        }
        
        .btn-red {
          background-color: #dc2626;
          color: white;
        }
        
        .btn-red:hover {
          background-color: #b91c1c;
        }
        
        .btn-gray {
          background-color: #4b5563;
          color: white;
        }
        
        .btn-gray:hover {
          background-color: #374151;
        }
        
        .btn-blue {
          background-color: #2563eb;
          color: white;
        }
        
        .btn-blue:hover {
          background-color: #1d4ed8;
        }
        
        .btn:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
        }
        
        .status-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        
        @media (min-width: 768px) {
          .status-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        
        .status-card {
          padding: 1rem;
          border-radius: 0.5rem;
          border: 2px solid;
        }
        
        .status-card.success {
          border-color: #bbf7d0;
          background-color: #f0fdf4;
        }
        
        .status-card.warning {
          border-color: #fef3c7;
          background-color: #fffbeb;
        }
        
        .status-card-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .status-icon {
          width: 1.5rem;
          height: 1.5rem;
        }
        
        .status-text {
          flex: 1;
        }
        
        .status-title {
          font-weight: 600;
          font-size: 1.125rem;
          margin: 0 0 0.25rem 0;
        }
        
        .status-message {
          font-size: 0.875rem;
          opacity: 0.8;
          margin: 0;
        }
        
        .status-indicator {
          margin-left: auto;
        }
        
        .status-icon-success {
          width: 1.5rem;
          height: 1.5rem;
          color: #059669;
        }
        
        .status-icon-error {
          width: 1.5rem;
          height: 1.5rem;
          color: #dc2626;
        }
        
        .status-icon-warning {
          width: 1.5rem;
          height: 1.5rem;
          color: #d97706;
        }
        
        .error-display {
          margin-bottom: 1.5rem;
          padding: 1rem;
          background-color: #fef2f2;
          border-radius: 0.5rem;
          border: 1px solid #fecaca;
        }
        
        .error-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .error-text {
          color: #991b1b;
        }
        
        .upload-area {
          margin-bottom: 2rem;
          padding: 2rem;
          border: 2px dashed;
          border-radius: 0.75rem;
          text-align: center;
          transition: all 0.3s;
        }
        
        .upload-area.dragging {
          border-color: #3b82f6;
          background-color: #eff6ff;
        }
        
        .upload-area.has-file {
          border-color: #10b981;
          background-color: #f0fdf4;
        }
        
        .upload-area.default {
          border-color: #d1d5db;
          background-color: white;
        }
        
        .upload-emoji {
          font-size: 3.75rem;
          margin-bottom: 1rem;
        }
        
        .upload-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }
        
        .file-input {
          margin-bottom: 1rem;
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.25rem;
          width: 100%;
          max-width: 24rem;
        }
        
        .upload-hint {
          color: #6b7280;
          font-size: 0.875rem;
        }
        
        .file-preview {
          max-width: 20rem;
          max-height: 12rem;
          margin: 0 auto 1rem;
          border-radius: 0.25rem;
          border: 1px solid #d1d5db;
        }
        
        .file-details {
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 1rem;
        }
        
        .file-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: center;
        }
        
        .btn-lg {
          padding: 0.75rem 1.5rem;
          font-weight: 600;
          border-radius: 0.25rem;
        }
        
        .progress-container {
          margin-bottom: 2rem;
          padding: 1rem;
          background-color: #eff6ff;
          border-radius: 0.5rem;
          border: 1px solid #bfdbfe;
        }
        
        .progress-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }
        
        .progress-spinner {
          width: 1.25rem;
          height: 1.25rem;
          border: 2px solid #2563eb;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        .progress-text {
          color: #1e40af;
          font-weight: 600;
        }
        
        .progress-bar {
          width: 100%;
          background-color: #bfdbfe;
          border-radius: 9999px;
          height: 0.5rem;
        }
        
        .progress-fill {
          background-color: #2563eb;
          height: 0.5rem;
          border-radius: 9999px;
          transition: all 0.3s;
        }
        
        .progress-label {
          color: #1d4ed8;
          font-size: 0.875rem;
          margin-top: 0.25rem;
        }
        
        .results-container {
          margin-bottom: 2rem;
          padding: 1.5rem;
          background-color: white;
          border-radius: 0.75rem;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .results-title {
          font-size: 1.25rem;
          font-weight: bold;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .result-alert {
          padding: 1rem;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
          border: 1px solid;
        }
        
        .result-alert.accident {
          background-color: #fef2f2;
          border-color: #fecaca;
        }
        
        .result-alert.safe {
          background-color: #f0fdf4;
          border-color: #bbf7d0;
        }
        
        .result-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .result-emoji {
          font-size: 1.875rem;
        }
        
        .result-status {
          font-size: 1.125rem;
          font-weight: bold;
        }
        
        .result-status.accident {
          color: #991b1b;
        }
        
        .result-status.safe {
          color: #166534;
        }
        
        .result-confidence {
          font-size: 0.875rem;
        }
        
        .result-confidence.accident {
          color: #b91c1c;
        }
        
        .result-confidence.safe {
          color: #15803d;
        }
        
        .result-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }
        
        @media (min-width: 768px) {
          .result-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        
        .result-card {
          padding: 0.75rem;
          background-color: #f9fafb;
          border-radius: 0.25rem;
        }
        
        .result-card-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }
        
        .result-card-title {
          font-weight: 600;
          color: #374151;
        }
        
        .result-card-content {
          font-size: 0.875rem;
          color: #6b7280;
        }
        
        .result-details {
          margin-top: 1rem;
          padding: 0.75rem;
          background-color: #f9fafb;
          border-radius: 0.25rem;
        }
        
        .history-container {
          margin-bottom: 2rem;
          padding: 1.5rem;
          background-color: white;
          border-radius: 0.75rem;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .history-title {
          font-size: 1.25rem;
          font-weight: bold;
          margin-bottom: 1rem;
        }
        
        .history-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .history-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem;
          background-color: #f9fafb;
          border-radius: 0.25rem;
        }
        
        .history-filename {
          font-weight: 600;
          font-size: 0.875rem;
        }
        
        .history-timestamp {
          font-size: 0.75rem;
          color: #6b7280;
        }
        
        .history-result {
          text-align: right;
        }
        
        .history-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 600;
        }
        
        .history-badge.accident {
          background-color: #fee2e2;
          color: #991b1b;
        }
        
        .history-badge.safe {
          background-color: #dcfce7;
          color: #166534;
        }
        
        .history-confidence {
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 0.25rem;
        }
        
        .view-all-button {
          text-align: center;
          margin-top: 1rem;
        }
        
        .view-all-link {
          color: #2563eb;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 600;
        }
        
        .view-all-link:hover {
          color: #1d4ed8;
        }
        
        .navigation-links {
          text-align: center;
          display: flex;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        
        .nav-link {
          color: #2563eb;
          text-decoration: none;
          font-weight: 600;
        }
        
        .nav-link:hover {
          color: #1d4ed8;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <h1 className="page-title">
        🚗 Accident Detection Upload
      </h1>
      
      {/* User Info */}
      {isAuthenticated && user && (
        <div className="user-info">
          <div className="user-info-content">
            <User className="status-icon" />
            <span className="user-info-text">
              <strong>Welcome, {user.username}!</strong> 
              {user.email && ` (${user.email})`}
              {user.role && ` - ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}`}
            </span>
          </div>
        </div>
      )}

      {/* Authentication Error */}
      {!isAuthenticated && (
        <div className="auth-error">
          <div className="auth-error-content">
            <XCircle style={{width: '3rem', height: '3rem', color: '#dc2626'}} />
            <div>
              <h2 className="auth-error-title">Authentication Required</h2>
              <p className="auth-error-text">You must be logged in to upload files for accident detection analysis.</p>
              <div className="auth-error-buttons">
                <button
                  onClick={() => window.location.href = '/auth'}
                  className="btn btn-red"
                >
                  Login / Register
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="btn btn-gray"
                >
                  Go Home
                </button>
              </div>
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
              title="Authentication"
              status="success"
              icon={Key}
              message={`Logged in as ${user?.username || 'User'}`}
              color="success"
            />

            <StatusCard
              title="API Status"
              status={apiStatus === 'ready' ? 'success' : 'warning'}
              icon={Server}
              message={apiStatus === 'ready' ? 'Ready for analysis' : 'Checking connection...'}
              color={apiStatus === 'ready' ? 'success' : 'warning'}
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="error-display">
              <div className="error-content">
                <XCircle style={{width: '1.25rem', height: '1.25rem', color: '#dc2626'}} />
                <span className="error-text">{error}</span>
              </div>
            </div>
          )}

          {/* Upload Area */}
          <div 
            className={`upload-area ${
              isDragging ? 'dragging' : 
              selectedFile ? 'has-file' : 'default'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="upload-emoji">
              {selectedFile ? '📁' : (isDragging ? '📥' : '🗂️')}
            </div>
            
            <h3 className="upload-title">
              {selectedFile ? selectedFile.name : 
               (isDragging ? 'Drop your file here' : 'Upload Image or Video for Analysis')}
            </h3>
            
            {!selectedFile && (
              <>
                <input 
                  type="file" 
                  accept={Object.keys(acceptedTypes).join(',')}
                  onChange={handleFileSelect}
                  className="file-input"
                />
                
                <p className="upload-hint">
                  Supported formats: {Object.values(acceptedTypes).join(', ')} | Max size: 25MB
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
                  <p><strong>Size:</strong> {utils.formatFileSize(selectedFile.size)}</p>
                  <p><strong>Type:</strong> {selectedFile.type}</p>
                </div>
                
                <div className="file-actions">
                  <button
                    onClick={handleUpload}
                    disabled={isUploading || apiStatus !== 'ready'}
                    className={`btn btn-lg ${
                      isUploading || apiStatus !== 'ready' 
                        ? '' 
                        : 'btn-blue'
                    }`}
                  >
                    {isUploading ? `Analyzing... ${uploadProgress}%` : 'Analyze File'}
                  </button>
                  
                  <button
                    onClick={clearFile}
                    disabled={isUploading}
                    className="btn btn-lg btn-gray"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="progress-container">
              <div className="progress-header">
                <div className="progress-spinner"></div>
                <span className="progress-text">Processing your file...</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="progress-label">{uploadProgress}% complete</p>
            </div>
          )}

          {/* Analysis Results */}
          {analysisResult && (
            <div className="results-container">
              <h3 className="results-title">
                <Target className="status-icon" />
                Analysis Results
              </h3>
              
              <div className={`result-alert ${
                analysisResult.accident_detected ? 'accident' : 'safe'
              }`}>
                <div className="result-content">
                  <div className="result-emoji">
                    {analysisResult.accident_detected ? '⚠️' : '✅'}
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
                      Confidence: {(analysisResult.confidence * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="result-grid">
                <div className="result-card">
                  <div className="result-card-header">
                    <FileText style={{width: '1rem', height: '1rem', color: '#6b7280'}} />
                    <span className="result-card-title">File Details</span>
                  </div>
                  <p className="result-card-content">
                    <strong>Name:</strong> {analysisResult.filename}<br/>
                    <strong>Size:</strong> {utils.formatFileSize(analysisResult.file_size)}<br/>
                    <strong>Type:</strong> {analysisResult.content_type}
                  </p>
                </div>
                
                <div className="result-card">
                  <div className="result-card-header">
                    <Clock style={{width: '1rem', height: '1rem', color: '#6b7280'}} />
                    <span className="result-card-title">Processing Info</span>
                  </div>
                  <p className="result-card-content">
                    <strong>Time:</strong> {analysisResult.processing_time?.toFixed(2)}s<br/>
                    <strong>Class:</strong> {analysisResult.predicted_class}<br/>
                    <strong>Frames:</strong> {analysisResult.frames_analyzed || 1}
                  </p>
                </div>
              </div>
              
              {analysisResult.details && (
                <div className="result-details">
                  <p className="result-card-content">
                    <strong>Details:</strong> {analysisResult.details}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Upload History */}
          {uploadHistory.length > 0 && (
            <div className="history-container">
              <h3 className="history-title">Recent Uploads</h3>
              <div className="history-list">
                {uploadHistory.slice(0, 5).map((item) => (
                  <div key={item.id} className="history-item">
                    <div>
                      <p className="history-filename">{item.filename}</p>
                      <p className="history-timestamp">
                        {new Date(item.timestamp).toLocaleString()}
                      </p>
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
                <div className="view-all-button">
                  <a
                    href="/dashboard"
                    className="view-all-link"
                  >
                    View All History →
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Navigation Links */}
          <div className="navigation-links">
            <a href="/dashboard" className="nav-link">
              📊 View Dashboard
            </a>
            <a href="/live" className="nav-link">
              📹 Live Detection
            </a>
            <a href="/notification" className="nav-link">
              🔔 Notifications
            </a>
          </div>
        </>
      )}
    </div>
  )
}

export default UserUploadPage