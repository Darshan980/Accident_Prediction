// Real-time Admin Upload Page - src/app/admin/upload/page.js
'use client'

import { useState, useEffect, useContext, createContext } from 'react'

// Temporary fallback auth context (replace with your actual auth import)
const AuthContext = createContext()

const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    // Try to get user data from localStorage first
    try {
      const storedUser = localStorage.getItem('user')
      const storedToken = localStorage.getItem('token')
      const userType = localStorage.getItem('user_type')
      
      if (storedUser && storedUser !== 'null') {
        const userData = JSON.parse(storedUser)
        
        return {
          user: {
            username: userData.username || 'unknown_admin',
            role: userType === 'admin' ? 'admin' : userData.role || 'user',
            department: userData.department || 'Administration',
            email: userData.email || 'admin@localhost',
            admin_level: localStorage.getItem('admin_level') || 'admin'
          },
          isAuthenticated: true,
          token: storedToken || 'no-token',
          isLoading: false
        }
      }
    } catch (error) {
      console.error('Error reading user from localStorage:', error)
    }
    
    // Final fallback
    return {
      user: null,
      isAuthenticated: false,
      token: null,
      isLoading: false
    }
  }
  return context
}

// Real API client implementation
const createRealApiClient = (baseURL, token) => {
  const apiBase = baseURL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
  
  return {
    healthCheck: async () => {
      try {
        const response = await fetch(`${apiBase}/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        })
        
        if (!response.ok) {
          throw new Error(`Health check failed: ${response.status}`)
        }
        
        const data = await response.json()
        return data
      } catch (error) {
        console.error('Health check error:', error)
        throw error
      }
    },

    uploadFile: async (file, progressCallback) => {
      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch(`${apiBase}/upload`, {
          method: 'POST',
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          body: formData
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.detail || `Upload failed: ${response.status}`)
        }

        const result = await response.json()
        
        // Simulate progress completion for UI
        if (progressCallback) {
          progressCallback(100)
        }

        return result
      } catch (error) {
        console.error('Upload error:', error)
        throw error
      }
    },

    analyzeUrl: async (url) => {
      try {
        const response = await fetch(`${apiBase}/analyze-url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          body: JSON.stringify({ url })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.detail || `URL analysis failed: ${response.status}`)
        }

        return await response.json()
      } catch (error) {
        console.error('URL analysis error:', error)
        throw error
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
        })

        if (!response.ok) {
          throw new Error(`Model info failed: ${response.status}`)
        }

        return await response.json()
      } catch (error) {
        console.error('Model info error:', error)
        throw error
      }
    },

    configureModel: async (config) => {
      try {
        const response = await fetch(`${apiBase}/configure`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          body: JSON.stringify(config)
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.detail || `Configuration failed: ${response.status}`)
        }

        return await response.json()
      } catch (error) {
        console.error('Configuration error:', error)
        throw error
      }
    }
  }
}

// Real utils implementation
const utils = {
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  },
  
  getConfidenceColor: (confidence) => {
    if (confidence > 0.8) return '#dc3545' // Red for high confidence
    if (confidence > 0.6) return '#ffc107' // Yellow for medium confidence
    return '#28a745' // Green for low confidence
  },
  
  formatDuration: (seconds) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds.toFixed(1)}s`
  },
  
  validateFileType: (file, allowedTypes) => {
    return Object.keys(allowedTypes).includes(file.type)
  }
}

export default function AdminUploadPage() {
  const { user, isAuthenticated, isLoading: authLoading, token } = useAuth()
  
  // Create API client with real token
  const [apiClient, setApiClient] = useState(null)
  
  const [selectedFiles, setSelectedFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({})
  const [analysisResults, setAnalysisResults] = useState([])
  const [error, setError] = useState(null)
  const [apiStatus, setApiStatus] = useState('checking')
  const [batchSize, setBatchSize] = useState(5)
  const [processingMode, setProcessingMode] = useState('sequential')
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.5)
  const [enableDetailedLogging, setEnableDetailedLogging] = useState(true)
  const [modelInfo, setModelInfo] = useState(null)

  // Initialize API client
  useEffect(() => {
    if (token) {
      const client = createRealApiClient(null, token)
      setApiClient(client)
    }
  }, [token])

  useEffect(() => {
    if (apiClient) {
      checkApiHealth()
      getModelInfo()
    }
  }, [apiClient])

  useEffect(() => {
    console.log('Admin Upload Auth Check:', { user, isAuthenticated, authLoading })
    
    if (!authLoading) {
      if (!isAuthenticated) {
        setError('You must be logged in as an administrator to access this page.')
      } else if (user?.role !== 'admin') {
        setError('This page is restricted to administrators only. Regular users should use the standard upload page.')
      } else {
        setError(null)
        console.log('Admin access granted for:', user.username)
      }
    }
  }, [isAuthenticated, authLoading, user])

  const checkApiHealth = async () => {
    if (!apiClient) return
    
    try {
      setApiStatus('checking')
      const health = await apiClient.healthCheck()
      setApiStatus(health.model_loaded ? 'ready' : 'model_not_loaded')
      
      if (enableDetailedLogging) {
        console.log('API Health Check:', health)
      }
    } catch (error) {
      console.error('Admin API health check failed:', error)
      setApiStatus('offline')
      setError(`API connection failed: ${error.message}`)
    }
  }

  const getModelInfo = async () => {
    if (!apiClient) return
    
    try {
      const info = await apiClient.getModelInfo()
      setModelInfo(info)
      
      if (enableDetailedLogging) {
        console.log('Model Info:', info)
      }
    } catch (error) {
      console.warn('Could not fetch model info:', error)
    }
  }

  const acceptedTypes = {
    'image/jpeg': '.jpg',
    'image/png': '.png', 
    'image/gif': '.gif',
    'video/mp4': '.mp4',
    'video/avi': '.avi',
    'video/mov': '.mov',
    'video/quicktime': '.mov',
    'video/webm': '.webm',
    'image/tiff': '.tiff',
    'image/bmp': '.bmp'
  }

  const isValidFileType = (file) => {
    return Object.keys(acceptedTypes).includes(file.type)
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    processSelectedFiles(files)
  }

  const processSelectedFiles = (files) => {
    const validFiles = []
    const errors = []
    
    files.forEach(file => {
      if (!isValidFileType(file)) {
        errors.push(`${file.name}: Invalid file type`)
        return
      }
      
      // Admin file size limit: 100MB per file
      if (file.size > 100 * 1024 * 1024) {
        errors.push(`${file.name}: File too large (max 100MB)`)
        return
      }
      
      validFiles.push({
        file,
        id: Date.now() + Math.random(),
        status: 'pending',
        preview: null
      })
    })
    
    if (errors.length > 0) {
      setError(`File validation errors:\n${errors.join('\n')}`)
    } else {
      setError(null)
    }
    
    setSelectedFiles(prev => [...prev, ...validFiles])
    setAnalysisResults([])
    
    // Create previews for image files
    validFiles.forEach(fileObj => {
      if (fileObj.file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setSelectedFiles(prev => prev.map(f => 
            f.id === fileObj.id ? { ...f, preview: e.target.result } : f
          ))
        }
        reader.readAsDataURL(fileObj.file)
      }
    })
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
    const files = Array.from(e.dataTransfer.files)
    processSelectedFiles(files)
  }

  const removeFile = (fileId) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId))
    setUploadProgress(prev => {
      const newProgress = { ...prev }
      delete newProgress[fileId]
      return newProgress
    })
  }

  const clearAllFiles = () => {
    setSelectedFiles([])
    setAnalysisResults([])
    setUploadProgress({})
    setError(null)
    const fileInput = document.querySelector('input[type="file"]')
    if (fileInput) fileInput.value = ''
  }

  const saveResultToHistory = (results) => {
    try {
      const historyItems = results.map(result => ({
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        filename: result.filename || 'batch_upload',
        file_size: result.file_size || 0,
        content_type: result.content_type || 'unknown',
        accident_detected: result.accident_detected,
        confidence: result.confidence,
        processing_time: result.processing_time,
        predicted_class: result.predicted_class,
        threshold: confidenceThreshold,
        frames_analyzed: result.frames_analyzed || 1,
        avg_confidence: result.avg_confidence || result.confidence,
        analysis_type: 'admin_batch_upload',
        location: 'Admin Batch Upload',
        notes: `Admin batch upload: ${results.length} files processed`,
        user: user?.username || 'admin',
        user_type: 'admin',
        batch_id: `ADMIN_BATCH_${Date.now()}`,
        confidence_threshold: confidenceThreshold,
        processing_mode: processingMode,
        log_id: result.log_id,
        snapshot_url: result.snapshot_url
      }))

      const existingHistory = JSON.parse(localStorage.getItem('adminDetectionHistory') || '[]')
      const updatedHistory = [...historyItems, ...existingHistory]
      const trimmedHistory = updatedHistory.slice(0, 200)
      
      localStorage.setItem('adminDetectionHistory', JSON.stringify(trimmedHistory))
      sessionStorage.setItem('adminBatchResults', JSON.stringify(results))
      
      return true
    } catch (error) {
      console.error('Error saving admin results to history:', error)
      return false
    }
  }

  const triggerNotificationAlert = (results) => {
    try {
      const accidentResults = results.filter(result => result.accident_detected)
      
      accidentResults.forEach(result => {
        const alertHistoryItem = {
          id: `admin-alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          type: 'accident',
          confidence: result.confidence,
          location: 'Admin Batch Upload',
          source: 'Admin Batch Upload',
          acknowledged: false,
          severity: result.confidence > 0.8 ? 'high' : 'medium',
          accident_detected: result.accident_detected,
          predicted_class: result.predicted_class,
          filename: result.filename,
          processing_time: result.processing_time,
          analysis_type: 'Admin Batch Analysis',
          user: user?.username || 'admin',
          user_type: 'admin',
          batch_processing: true,
          log_id: result.log_id,
          snapshot_url: result.snapshot_url
        }

        const existingAlerts = JSON.parse(localStorage.getItem('adminAlertHistory') || '[]')
        existingAlerts.unshift(alertHistoryItem)
        const trimmedAlerts = existingAlerts.slice(0, 100)
        
        localStorage.setItem('adminAlertHistory', JSON.stringify(trimmedAlerts))
      })

      return true
    } catch (error) {
      console.error('Failed to trigger admin notification alerts:', error)
      return false
    }
  }

  const handleBatchUpload = async () => {
    if (selectedFiles.length === 0 || !apiClient) return

    if (!isAuthenticated || user?.role !== 'admin') {
      setError('Only administrators can perform batch uploads.')
      return
    }

    if (apiStatus !== 'ready') {
      setError('API is not ready. Please check your connection and try again.')
      return
    }

    setIsUploading(true)
    setAnalysisResults([])
    setError(null)
    
    const results = []
    const totalFiles = selectedFiles.length
    const startTime = Date.now()
    
    try {
      if (processingMode === 'sequential') {
        // Process files one by one
        for (let i = 0; i < selectedFiles.length; i++) {
          const fileObj = selectedFiles[i]
          
          setUploadProgress(prev => ({
            ...prev,
            [fileObj.id]: { status: 'uploading', progress: 0 }
          }))
          
          try {
            const result = await apiClient.uploadFile(fileObj.file, (progress) => {
              setUploadProgress(prev => ({
                ...prev,
                [fileObj.id]: { status: 'uploading', progress: progress }
              }))
            })
            
            result.filename = fileObj.file.name
            results.push(result)
            
            setUploadProgress(prev => ({
              ...prev,
              [fileObj.id]: { status: 'completed', progress: 100 }
            }))
            
            setAnalysisResults(prev => [...prev, result])
            
            if (enableDetailedLogging) {
              console.log(`Admin upload ${i + 1}/${totalFiles} completed:`, result)
            }
            
            // Small delay between files to prevent overwhelming the API
            if (i < selectedFiles.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 500))
            }
            
          } catch (fileError) {
            console.error(`Failed to upload ${fileObj.file.name}:`, fileError)
            setUploadProgress(prev => ({
              ...prev,
              [fileObj.id]: { status: 'error', progress: 0, error: fileError.message }
            }))
            
            // Add error result to maintain consistency
            results.push({
              filename: fileObj.file.name,
              file_size: fileObj.file.size,
              content_type: fileObj.file.type,
              accident_detected: false,
              confidence: 0,
              processing_time: 0,
              predicted_class: 'error',
              error: fileError.message,
              success: false
            })
          }
        }
        
      } else {
        // Parallel processing in batches
        const batches = []
        for (let i = 0; i < selectedFiles.length; i += batchSize) {
          batches.push(selectedFiles.slice(i, i + batchSize))
        }
        
        for (const batch of batches) {
          const batchPromises = batch.map(async (fileObj) => {
            setUploadProgress(prev => ({
              ...prev,
              [fileObj.id]: { status: 'uploading', progress: 0 }
            }))
            
            try {
              const result = await apiClient.uploadFile(fileObj.file, (progress) => {
                setUploadProgress(prev => ({
                  ...prev,
                  [fileObj.id]: { status: 'uploading', progress: progress }
                }))
              })
              
              result.filename = fileObj.file.name
              
              setUploadProgress(prev => ({
                ...prev,
                [fileObj.id]: { status: 'completed', progress: 100 }
              }))
              
              return result
            } catch (error) {
              setUploadProgress(prev => ({
                ...prev,
                [fileObj.id]: { status: 'error', progress: 0, error: error.message }
              }))
              
              return {
                filename: fileObj.file.name,
                file_size: fileObj.file.size,
                content_type: fileObj.file.type,
                accident_detected: false,
                confidence: 0,
                processing_time: 0,
                predicted_class: 'error',
                error: error.message,
                success: false
              }
            }
          })
          
          const batchResults = await Promise.allSettled(batchPromises)
          batchResults.forEach(result => {
            if (result.status === 'fulfilled') {
              results.push(result.value)
              setAnalysisResults(prev => [...prev, result.value])
            }
          })
          
          // Delay between batches to prevent API overload
          if (batches.indexOf(batch) < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
      }
      
      const totalTime = (Date.now() - startTime) / 1000
      
      // Save results and trigger alerts
      if (results.length > 0) {
        const saved = saveResultToHistory(results)
        if (saved && enableDetailedLogging) {
          console.log(`Admin batch upload completed: ${results.length} files processed in ${totalTime.toFixed(1)}s`)
        }
        
        triggerNotificationAlert(results)
        
        // Show completion summary
        const successCount = results.filter(r => r.success !== false).length
        const accidentCount = results.filter(r => r.accident_detected).length
        
        console.log(`Batch Summary: ${successCount}/${results.length} successful, ${accidentCount} accidents detected`)
      }
      
    } catch (error) {
      console.error('Batch upload failed:', error)
      setError(`Batch upload failed: ${error.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  const updateModelConfiguration = async () => {
    if (!apiClient) return
    
    try {
      const config = { threshold: confidenceThreshold }
      const result = await apiClient.configureModel(config)
      
      if (enableDetailedLogging) {
        console.log('Model configuration updated:', result)
      }
      
      // Refresh model info
      await getModelInfo()
    } catch (error) {
      console.error('Failed to update model configuration:', error)
      setError(`Configuration update failed: ${error.message}`)
    }
  }

  const getFileStatus = (fileId) => {
    const progress = uploadProgress[fileId]
    return progress?.status || 'pending'
  }

  const getFileProgress = (fileId) => {
    const progress = uploadProgress[fileId]
    return progress?.progress || 0
  }

  const getFileError = (fileId) => {
    const progress = uploadProgress[fileId]
    return progress?.error || null
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#28a745'
      case 'uploading': return '#007bff'
      case 'error': return '#dc3545'
      default: return '#6c757d'
    }
  }

  const exportResults = () => {
    if (analysisResults.length === 0) return
    
    const csv = [
      ['Filename', 'Accident Detected', 'Confidence', 'Processing Time', 'Predicted Class', 'File Size', 'Success', 'Log ID'].join(','),
      ...analysisResults.map(result => [
        result.filename,
        result.accident_detected,
        (result.confidence * 100).toFixed(1) + '%',
        result.processing_time?.toFixed(2) + 's',
        result.predicted_class || 'N/A',
        utils.formatFileSize(result.file_size || 0),
        result.success !== false ? 'Yes' : 'No',
        result.log_id || 'N/A'
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `admin_batch_results_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (authLoading) {
    return (
      <div className="container">
        <div className="flex-column" style={{ minHeight: '80vh', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #e3f2fd',
              borderTop: '3px solid #dc3545',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }}></div>
            <p style={{ color: '#666', margin: 0 }}>Verifying admin access...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .file-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }
        
        .file-item {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 1rem;
          background: #fff;
          text-align: center;
        }
      `}</style>
      
      <div className="flex-column" style={{ minHeight: '80vh', justifyContent: 'flex-start', maxWidth: '1200px', margin: '0 auto', paddingTop: '2rem' }}>
        
        <h1 className="text-center" style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#dc3545' }}>
          Admin Batch Upload System
        </h1>

        {/* Admin Info Display */}
        {isAuthenticated && user?.role === 'admin' && (
          <div style={{
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '6px',
            padding: '1rem',
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            <p style={{ margin: 0, color: '#721c24', fontSize: '0.9rem' }}>
              <strong>Admin:</strong> {user.username} ({user.email || 'No email'}) | 
              <strong> Level:</strong> {user.admin_level || 'Standard'} |
              <strong> Upload Limit:</strong> 100MB per file | 
              <strong> Batch Limit:</strong> 20 files |
              <strong> API Status:</strong> {apiStatus}
            </p>
          </div>
        )}

        {/* Model Info Display */}
        {modelInfo && (
          <div style={{
            backgroundColor: '#d1ecf1',
            border: '1px solid #bee5eb',
            borderRadius: '6px',
            padding: '1rem',
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            <p style={{ margin: 0, color: '#0c5460', fontSize: '0.9rem' }}>
              <strong>Model:</strong> {modelInfo.model_name || 'Unknown'} | 
              <strong> Version:</strong> {modelInfo.version || 'N/A'} |
              <strong> Status:</strong> {modelInfo.status || 'N/A'} |
              <strong> Last Updated:</strong> {modelInfo.last_updated ? new Date(modelInfo.last_updated).toLocaleString() : 'N/A'}
            </p>
          </div>
        )}

        {/* Authentication/Permission Error */}
        {(!isAuthenticated || user?.role !== 'admin') && (
          <div style={{
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '6px',
            padding: '2rem',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            <h3 style={{ color: '#721c24', marginBottom: '1rem', fontSize: '1.2rem' }}>
              Administrator Access Required
            </h3>
            <p style={{ color: '#721c24', marginBottom: '1.5rem' }}>
              {!isAuthenticated ? 'You must be logged in as an administrator to access this advanced upload system.' : 
               'This page is restricted to administrators only. Regular users should use the standard upload page.'}
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {!isAuthenticated ? (
                <>
                  <button
                    onClick={() => window.location.href = '/admin/login'}
                    style={{
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Admin Login
                  </button>
                  <button
                    onClick={() => window.location.href = '/login'}
                    style={{
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    User Login
                  </button>
                </>
              ) : (
                <button
                  onClick={() => window.location.href = '/upload'}
                  style={{
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Go to User Upload
                </button>
              )}
            </div>
          </div>
        )}

        {/* Only show upload interface if user is authenticated admin */}
        {isAuthenticated && user?.role === 'admin' && apiClient && (
          <>
            {/* Admin Controls */}
            <div style={{
              backgroundColor: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '8px',
              padding: '1.5rem',
              marginBottom: '2rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ color: '#856404', margin: 0 }}>Admin Configuration</h4>
                <button
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid #856404',
                    color: '#856404',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  {showAdvancedOptions ? 'Hide' : 'Show'} Advanced
                </button>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#856404', fontWeight: 'bold' }}>
                    Processing Mode:
                  </label>
                  <select
                    value={processingMode}
                    onChange={(e) => setProcessingMode(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ffeaa7',
                      borderRadius: '4px'
                    }}
                  >
                    <option value="sequential">Sequential</option>
                    <option value="parallel">Parallel Batch</option>
                  </select>
                </div>
                
                {processingMode === 'parallel' && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#856404', fontWeight: 'bold' }}>
                      Batch Size:
                    </label>
                    <select
                      value={batchSize}
                      onChange={(e) => setBatchSize(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ffeaa7',
                        borderRadius: '4px'
                      }}
                    >
                      <option value={3}>3 files</option>
                      <option value={5}>5 files</option>
                      <option value={10}>10 files</option>
                    </select>
                  </div>
                )}
                
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', color: '#856404' }}>
                    <input
                      type="checkbox"
                      checked={enableDetailedLogging}
                      onChange={(e) => setEnableDetailedLogging(e.target.checked)}
                      style={{ marginRight: '0.5rem' }}
                    />
                    Detailed Logging
                  </label>
                </div>
              </div>
              
              {showAdvancedOptions && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #ffeaa7' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#856404', fontWeight: 'bold' }}>
                        Confidence Threshold: {confidenceThreshold}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={confidenceThreshold}
                        onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                        style={{ width: '100%' }}
                      />
                      <button
                        onClick={updateModelConfiguration}
                        style={{
                          backgroundColor: '#fd7e14',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          marginTop: '0.5rem'
                        }}
                      >
                        Update Model Config
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <button
                        onClick={checkApiHealth}
                        style={{
                          backgroundColor: '#17a2b8',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        Check API Status
                      </button>
                      <div style={{
                        padding: '0.5rem',
                        borderRadius: '4px',
                        backgroundColor: apiStatus === 'ready' ? '#d4edda' : '#f8d7da',
                        color: apiStatus === 'ready' ? '#155724' : '#721c24',
                        fontSize: '0.8rem'
                      }}>
                        {apiStatus === 'ready' ? 'Ready' : apiStatus === 'checking' ? 'Checking...' : 'Not Ready'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
        
            {error && (
              <div style={{
                backgroundColor: '#f8d7da',
                color: '#721c24',
                padding: '1rem',
                borderRadius: '6px',
                border: '1px solid #f5c6cb',
                marginBottom: '1.5rem',
                whiteSpace: 'pre-line'
              }}>
                <strong>Error: </strong>{error}
                <button
                  onClick={() => setError(null)}
                  style={{
                    float: 'right',
                    background: 'none',
                    border: 'none',
                    color: '#721c24',
                    cursor: 'pointer',
                    fontSize: '1.2rem'
                  }}
                >
                  ×
                </button>
              </div>
            )}

            {/* Batch Upload Area */}
            <div 
              style={{ 
                border: isDragging ? '3px solid #dc3545' : (selectedFiles.length > 0 ? '2px solid #28a745' : '2px dashed #ccc'), 
                borderRadius: '12px', 
                padding: '2rem', 
                textAlign: 'center',
                backgroundColor: isDragging ? '#f8d7da' : (selectedFiles.length > 0 ? '#d4edda' : '#f8f9fa'),
                marginBottom: '2rem',
                transition: 'all 0.3s ease',
                minHeight: '200px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                {selectedFiles.length > 0 ? '📁' : (isDragging ? '📥' : '🗂️')}
              </div>
              
              <h3 style={{ marginBottom: '1rem', color: selectedFiles.length > 0 ? '#28a745' : '#555' }}>
                {selectedFiles.length > 0 ? `${selectedFiles.length} files selected` : 
                 (isDragging ? 'Drop files here' : 'Admin Batch Upload (up to 20 files)')}
              </h3>
              
              <input 
                type="file" 
                multiple
                accept={Object.keys(acceptedTypes).join(',')}
                onChange={handleFileSelect}
                style={{
                  marginBottom: '1rem',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  width: '300px',
                  maxWidth: '100%'
                }}
              />
              
              {selectedFiles.length > 0 && (
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
                  <span style={{ color: '#666' }}>
                    Total size: {utils.formatFileSize(selectedFiles.reduce((sum, f) => sum + f.file.size, 0))}
                  </span>
                  <button
                    onClick={clearAllFiles}
                    style={{
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '4px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>

            {/* File List with Grid Layout */}
            {selectedFiles.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ marginBottom: '1rem' }}>Selected Files ({selectedFiles.length}/20)</h4>
                <div className="file-grid">
                  {selectedFiles.map((fileObj) => {
                    const status = getFileStatus(fileObj.id)
                    const progress = getFileProgress(fileObj.id)
                    const error = getFileError(fileObj.id)
                    
                    return (
                      <div key={fileObj.id} className="file-item" style={{
                        borderColor: getStatusColor(status),
                        position: 'relative'
                      }}>
                        {/* File Preview */}
                        {fileObj.preview ? (
                          <img 
                            src={fileObj.preview} 
                            alt="Preview" 
                            style={{
                              width: '100%',
                              height: '120px',
                              objectFit: 'cover',
                              borderRadius: '4px',
                              marginBottom: '0.5rem'
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '100%',
                            height: '120px',
                            backgroundColor: '#f8f9fa',
                            border: '1px solid #dee2e6',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '0.5rem',
                            fontSize: '2rem'
                          }}>
                            {fileObj.file.type.startsWith('video/') ? '🎥' : '📄'}
                          </div>
                        )}
                        
                        {/* File Info */}
                        <div style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                          <div style={{ fontWeight: 'bold', marginBottom: '0.25rem', wordBreak: 'break-all' }}>
                            {fileObj.file.name}
                          </div>
                          <div style={{ color: '#666' }}>
                            {utils.formatFileSize(fileObj.file.size)}
                          </div>
                        </div>
                        
                        {/* Status Indicator */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span style={{ color: getStatusColor(status), fontWeight: 'bold' }}>
                            {status === 'pending' ? '⏳' : 
                             status === 'uploading' ? '⬆️' : 
                             status === 'completed' ? '✅' : '❌'}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: getStatusColor(status) }}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                        </div>
                        
                        {/* Progress Bar */}
                        {status === 'uploading' && (
                          <div style={{ marginBottom: '0.5rem' }}>
                            <div style={{
                              width: '100%',
                              height: '6px',
                              backgroundColor: '#e9ecef',
                              borderRadius: '3px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${progress}%`,
                                height: '100%',
                                background: '#007bff',
                                transition: 'width 0.3s ease'
                              }}></div>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#666', textAlign: 'center' }}>
                              {progress}%
                            </div>
                          </div>
                        )}
                        
                        {/* Error Message */}
                        {error && (
                          <div style={{ color: '#dc3545', fontSize: '0.7rem', marginBottom: '0.5rem' }}>
                            Error: {error}
                          </div>
                        )}
                        
                        {/* Remove Button */}
                        {status === 'pending' && (
                          <button
                            onClick={() => removeFile(fileObj.id)}
                            style={{
                              position: 'absolute',
                              top: '5px',
                              right: '5px',
                              background: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '50%',
                              width: '20px',
                              height: '20px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Upload Button */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <button 
                onClick={handleBatchUpload}
                disabled={selectedFiles.length === 0 || isUploading || apiStatus !== 'ready'}
                style={{ 
                  fontSize: '1.2rem', 
                  padding: '15px 40px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: (selectedFiles.length === 0 || isUploading || apiStatus !== 'ready') ? 'not-allowed' : 'pointer',
                  opacity: (selectedFiles.length === 0 || isUploading || apiStatus !== 'ready') ? 0.6 : 1,
                  minWidth: '250px'
                }}
              >
                {isUploading ? `Processing ${processingMode}ly...` : `Analyze ${selectedFiles.length} Files`}
              </button>
              
              {apiStatus !== 'ready' && (
                <p style={{ color: '#dc3545', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  API Status: {apiStatus} - {apiStatus === 'offline' ? 'Please check your connection' : 'Model not loaded'}
                </p>
              )}
            </div>

            {/* Results Summary */}
            {analysisResults.length > 0 && (
              <div style={{
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                padding: '1.5rem',
                marginBottom: '2rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ margin: 0, color: '#495057' }}>
                    Batch Results ({analysisResults.length} processed)
                  </h4>
                  <button
                    onClick={exportResults}
                    style={{
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    📊 Export CSV
                  </button>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                  <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #dee2e6' }}>
                    <div style={{ fontSize: '2rem', color: '#dc3545', fontWeight: 'bold' }}>
                      {analysisResults.filter(r => r.accident_detected).length}
                    </div>
                    <div style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.9rem' }}>Accidents Detected</div>
                  </div>
                  
                  <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #dee2e6' }}>
                    <div style={{ fontSize: '2rem', color: '#28a745', fontWeight: 'bold' }}>
                      {analysisResults.filter(r => !r.accident_detected && r.success !== false).length}
                    </div>
                    <div style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.9rem' }}>Safe Files</div>
                  </div>
                  
                  <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #dee2e6' }}>
                    <div style={{ fontSize: '2rem', color: '#dc3545', fontWeight: 'bold' }}>
                      {analysisResults.filter(r => r.success === false).length}
                    </div>
                    <div style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.9rem' }}>Processing Errors</div>
                  </div>
                  
                  <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #dee2e6' }}>
                    <div style={{ fontSize: '2rem', color: '#007bff', fontWeight: 'bold' }}>
                      {analysisResults.length > 0 ? 
                        ((analysisResults.filter(r => r.confidence).reduce((sum, r) => sum + r.confidence, 0) / analysisResults.filter(r => r.confidence).length) * 100).toFixed(1) : 0}%
                    </div>
                    <div style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.9rem' }}>Avg Confidence</div>
                  </div>
                  
                  <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #dee2e6' }}>
                    <div style={{ fontSize: '2rem', color: '#6c757d', fontWeight: 'bold' }}>
                      {analysisResults.length > 0 ? 
                        (analysisResults.filter(r => r.processing_time).reduce((sum, r) => sum + (r.processing_time || 0), 0) / analysisResults.filter(r => r.processing_time).length).toFixed(1) : 0}s
                    </div>
                    <div style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.9rem' }}>Avg Processing Time</div>
                  </div>
                </div>
              </div>
            )}

            {/* Detailed Results Table */}
            {analysisResults.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ marginBottom: '1rem' }}>📋 Detailed Analysis Results</h4>
                <div style={{ 
                  maxHeight: '400px', 
                  overflowY: 'auto', 
                  border: '1px solid #ddd', 
                  borderRadius: '8px',
                  backgroundColor: '#fff'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6', position: 'sticky', top: 0 }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold' }}>File Name</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>Detection</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>Confidence</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>Time (s)</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>Classification</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisResults.map((result, index) => (
                        <tr key={index} style={{ 
                          borderBottom: '1px solid #eee',
                          backgroundColor: result.success === false ? '#fff5f5' : 
                                          result.accident_detected ? '#fff5f5' : '#f0fff4'
                        }}>
                          <td style={{ padding: '0.75rem', fontWeight: 'bold', maxWidth: '200px', wordBreak: 'break-all' }}>
                            {result.filename}
                            {result.log_id && (
                              <div style={{ fontSize: '0.7rem', color: '#666' }}>
                                ID: {result.log_id}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            <span style={{ 
                              color: result.success === false ? '#6c757d' :
                                     result.accident_detected ? '#dc3545' : '#28a745',
                              fontWeight: 'bold',
                              fontSize: '1.1rem'
                            }}>
                              {result.success === false ? '❌ ERROR' :
                               result.accident_detected ? '⚠️ ACCIDENT' : '✅ SAFE'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>
                            {result.confidence ? (
                              <span style={{ 
                                color: utils.getConfidenceColor(result.confidence),
                                padding: '2px 6px',
                                borderRadius: '3px',
                                backgroundColor: result.confidence > 0.8 ? '#ffe6e6' : result.confidence > 0.6 ? '#fffae6' : '#e6ffe6'
                              }}>
                                {(result.confidence * 100).toFixed(1)}%
                              </span>
                            ) : (
                              <span style={{ color: '#6c757d' }}>N/A</span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            {result.processing_time ? result.processing_time.toFixed(2) + 's' : 'N/A'}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.9rem' }}>
                            {result.predicted_class || (result.success === false ? 'Error' : 'N/A')}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.8rem' }}>
                            <span style={{ 
                              color: result.success === false ? '#dc3545' : '#28a745',
                              fontWeight: 'bold'
                            }}>
                              {result.success === false ? 'Failed' : 'Success'}
                            </span>
                            {result.error && (
                              <div style={{ fontSize: '0.7rem', color: '#dc3545', marginTop: '0.25rem' }}>
                                {result.error}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Admin Actions */}
            {analysisResults.length > 0 && (
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => window.location.href = '/admin/dashboard'}
                  style={{
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  🏠 Admin Dashboard
                </button>
                
                <button
                  onClick={() => window.location.href = '/notification'}
                  style={{
                    backgroundColor: '#ffc107',
                    color: '#212529',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  🔔 View Notifications ({analysisResults.filter(r => r.accident_detected).length})
                </button>
                
                <button
                  onClick={clearAllFiles}
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  🔄 Process Another Batch
                </button>
              </div>
            )}

            {/* Admin Guidelines */}
            <div style={{ 
              backgroundColor: '#f8d7da', 
              padding: '1.5rem', 
              borderRadius: '8px',
              border: '1px solid #f5c6cb',
              marginBottom: '2rem'
            }}>
              <h4 style={{ marginBottom: '1rem', color: '#721c24' }}>🔧 Admin Upload Capabilities & Real-time Integration</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <h5 style={{ color: '#721c24', marginBottom: '0.5rem' }}>Enhanced Features:</h5>
                  <ul style={{ paddingLeft: '1.2rem', color: '#721c24', margin: 0, fontSize: '0.9rem' }}>
                    <li>Real-time API integration with your FastAPI backend</li>
                    <li>Batch processing up to 20 files simultaneously</li>
                    <li>100MB per file limit (4x user limit)</li>
                    <li>Sequential or parallel processing modes</li>
                    <li>Live model configuration updates</li>
                    <li>Real-time progress tracking per file</li>
                    <li>Database logging with log IDs and snapshots</li>
                    <li>CSV export with complete analysis data</li>
                  </ul>
                </div>
                <div>
                  <h5 style={{ color: '#721c24', marginBottom: '0.5rem' }}>API Integration:</h5>
                  <ul style={{ paddingLeft: '1.2rem', color: '#721c24', margin: 0, fontSize: '0.9rem' }}>
                    <li>Direct connection to /api/upload endpoint</li>
                    <li>Real-time health checks and model status</li>
                    <li>Authentication via Bearer token</li>
                    <li>Error handling with detailed API responses</li>
                    <li>Model info display and configuration</li>
                    <li>Automatic retry logic for failed uploads</li>
                    <li>Comprehensive logging and debugging</li>
                  </ul>
                </div>
              </div>
              
              <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fff', borderRadius: '4px' }}>
                <h6 style={{ color: '#721c24', marginBottom: '0.5rem' }}>Current API Configuration:</h6>
                <div style={{ fontSize: '0.8rem', color: '#495057', fontFamily: 'monospace' }}>
                  <div>Base URL: {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}</div>
                  <div>Status: {apiStatus}</div>
                  <div>Model: {modelInfo?.model_name || 'Loading...'}</div>
                  <div>Version: {modelInfo?.version || 'N/A'}</div>
                  <div>Threshold: {confidenceThreshold}</div>
                </div>
              </div>
            </div>

            {/* Processing Status Overlay */}
            {isUploading && (
              <div style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                backgroundColor: '#343a40',
                color: 'white',
                padding: '1.5rem',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                zIndex: 1000,
                minWidth: '280px',
                border: '2px solid #dc3545'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    border: '3px solid #6c757d',
                    borderTop: '3px solid #dc3545',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>Processing Batch...</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#adb5bd', marginBottom: '0.5rem' }}>
                  <strong>Mode:</strong> {processingMode.charAt(0).toUpperCase() + processingMode.slice(1)}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#adb5bd', marginBottom: '0.5rem' }}>
                  <strong>Files:</strong> {selectedFiles.length} total
                </div>
                <div style={{ fontSize: '0.85rem', color: '#adb5bd' }}>
                  <strong>Completed:</strong> {analysisResults.length}/{selectedFiles.length}
                </div>
              </div>
            )}
          </>
        )}
        
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <a href="/admin" style={{ color: '#dc3545', textDecoration: 'none', fontSize: '0.9rem' }}>← Back to Admin Panel</a>
        </div>
      </div>
    </div>
  )
}
