'use client'

import React, { useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { XCircle } from 'lucide-react'

// Components
import ErrorDisplay from './components/ErrorDisplay'
import UploadArea from './components/UploadArea'
import UploadProgress from './components/UploadProgress'
import AnalysisResults from './components/AnalysisResults'
import UploadHistory from './components/UploadHistory'
import NavigationLinks from './components/NavigationLinks'

// Hooks
import { useApiStatus } from './hooks/useApiStatus'
import { useUploadHistory } from './hooks/useUploadHistory'
import { useFileUpload } from './hooks/useFileUpload'

// Constants
import { API_STATUS } from './utils/constants'

const UserUploadPage = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  
  // Custom hooks
  const { apiStatus, error: apiError, checkApiHealth } = useApiStatus()
  const { uploadHistory, saveToHistory } = useUploadHistory(user)
  const {
    selectedFile,
    filePreview,
    isDragging,
    isUploading,
    uploadProgress,
    analysisResult,
    error: uploadError,
    handleFileSelect,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleUpload,
    clearFile,
    setError
  } = useFileUpload(apiStatus, user, saveToHistory)

  // Auth effect
  useEffect(() => {
    console.log('User Upload Auth Check:', { user, isAuthenticated, authLoading })
    
    if (!authLoading && !isAuthenticated) {
      setError('You must be logged in to upload files for analysis.')
    } else if (!authLoading && isAuthenticated) {
      setError(null)
    }
  }, [isAuthenticated, authLoading, user, setError])

  // Loading state
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

  const currentError = uploadError || apiError

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
      `}</style>

      <h1 className="page-title">
        🚗 Accident Detection Upload
      </h1>

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
          {/* Error Display */}
          <ErrorDisplay error={currentError} />

          {/* Upload Area */}
          <UploadArea
            selectedFile={selectedFile}
            filePreview={filePreview}
            isDragging={isDragging}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            apiStatus={apiStatus}
            onFileSelect={handleFileSelect}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onUpload={handleUpload}
            onClear={clearFile}
          />

          {/* Upload Progress */}
          <UploadProgress 
            isUploading={isUploading} 
            uploadProgress={uploadProgress} 
          />

          {/* Analysis Results */}
          <AnalysisResults analysisResult={analysisResult} />

          {/* Upload History */}
          <UploadHistory uploadHistory={uploadHistory} />

          {/* Navigation Links */}
          <NavigationLinks />
        </>
      )}
    </div>
  )
}

export default UserUploadPage
