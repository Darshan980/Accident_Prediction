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
            font-family: "Inter", "Roboto", "Helvetica Neue", sans-serif;
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
            background-color: #FFFFFF;
            border-radius: 8px;
            border: 1px solid #E5E7EB;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
          }
          
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #E5E7EB;
            border-top: 3px solid #1E3A8A;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
          }
          
          .loading-text {
            color: #6B7280;
            margin: 0;
            font-size: 16px;
            font-weight: 500;
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
          background: linear-gradient(135deg, #F9FAFB 0%, #E5E7EB 100%);
          min-height: 100vh;
          font-family: "Inter", "Roboto", "Helvetica Neue", sans-serif;
        }
        
        .page-title {
          font-size: 30px;
          font-weight: 700;
          margin-bottom: 2rem;
          color: #111827;
          text-align: center;
          background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .auth-error {
          margin-bottom: 2rem;
          padding: 1.5rem;
          background-color: #FFFFFF;
          border-radius: 8px;
          border: 2px solid #DC2626;
          box-shadow: 0 4px 16px rgba(220, 38, 38, 0.1);
        }
        
        .auth-error-content {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .auth-error-title {
          font-size: 20px;
          font-weight: 600;
          color: #DC2626;
          margin-bottom: 0.5rem;
        }
        
        .auth-error-text {
          color: #111827;
          margin-bottom: 1rem;
          font-size: 16px;
          font-weight: 400;
          line-height: 1.5;
        }
        
        .auth-error-buttons {
          display: flex;
          gap: 0.75rem;
        }
        
        .btn {
          padding: 12px 20px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          text-decoration: none;
          cursor: pointer;
          border: 2px solid transparent;
          transition: all 0.2s ease;
          display: inline-block;
        }
        
        .btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .btn-red {
          background-color: #DC2626;
          color: #FFFFFF;
          border-color: #DC2626;
        }
        
        .btn-red:hover {
          background-color: #B91C1C;
          border-color: #B91C1C;
        }
        
        .btn-gray {
          background-color: #FFFFFF;
          color: #111827;
          border-color: #E5E7EB;
        }
        
        .btn-gray:hover {
          background-color: #F9FAFB;
          border-color: #D1D5DB;
        }
        
        /* Mobile Responsive */
        @media (max-width: 768px) {
          .main-container {
            padding: 1rem;
          }
          
          .page-title {
            font-size: 24px;
            margin-bottom: 1.5rem;
          }
          
          .auth-error {
            padding: 1rem;
          }
          
          .auth-error-content {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }
          
          .auth-error-title {
            font-size: 18px;
          }
          
          .auth-error-text {
            font-size: 14px;
          }
          
          .auth-error-buttons {
            flex-direction: column;
            width: 100%;
            gap: 0.5rem;
          }
          
          .btn {
            width: 100%;
            text-align: center;
            padding: 14px 16px;
          }
        }
        
        @media (max-width: 480px) {
          .main-container {
            padding: 0.75rem;
          }
          
          .page-title {
            font-size: 20px;
          }
          
          .auth-error {
            border-radius: 8px;
          }
        }
        
        /* High contrast mode */
        @media (prefers-contrast: high) {
          .auth-error,
          .loading-card,
          .btn {
            border-width: 2px;
          }
          
          .btn-red,
          .btn-gray {
            border-width: 3px;
          }
        }
        
        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .spinner {
            transition: none;
            transform: none;
            animation: none;
          }
        }
        
        /* Print styles */
        @media print {
          .main-container {
            background: #FFFFFF;
          }
          
          .auth-error-buttons {
            display: none;
          }
          
          .page-title {
            color: #111827 !important;
            -webkit-text-fill-color: #111827 !important;
          }
        }
      `}</style>

      <h1 className="page-title">
        🚗 Accident Detection Upload
      </h1>

      {/* Authentication Error */}
      {!isAuthenticated && (
        <div className="auth-error">
          <div className="auth-error-content">
            <XCircle style={{width: '3rem', height: '3rem', color: '#DC2626'}} />
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
