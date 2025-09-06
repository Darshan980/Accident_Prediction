'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { AlertTriangle, CheckCircle, Clock, MapPin, FileText, Camera, ArrowLeft, Download, Share2, Filter, Search } from 'lucide-react'
import './UserResultsPage.css'

const UserResultsPage = () => {
  const { user, isAuthenticated } = useAuth()
  const searchParams = useSearchParams()
  const [results, setResults] = useState([])
  const [filteredResults, setFilteredResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all') // 'all', 'accidents', 'safe', 'upload', 'live'
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedResult, setSelectedResult] = useState(null)

  useEffect(() => {
    loadUserResults()
  }, [user])

  useEffect(() => {
    applyFilters()
  }, [results, filter, searchTerm])

  const loadUserResults = () => {
    try {
      setLoading(true)
      
      if (!isAuthenticated || !user) {
        setError('You must be logged in to view your results.')
        setLoading(false)
        return
      }

      // Load user's upload history
      const uploadHistory = JSON.parse(localStorage.getItem('userUploadHistory') || '[]')
      
      // Load user's live detection history
      const liveHistory = JSON.parse(localStorage.getItem('detectionHistory') || '[]')
      
      // Load user's notification history (for additional context)
      const notificationHistory = JSON.parse(localStorage.getItem('accident_notifications') || '[]')

      // Combine and filter results for current user
      const userResults = []

      // Add upload results
      uploadHistory.forEach(item => {
        if (item.user === user.username || item.analysis_type === 'user_upload') {
          userResults.push({
            ...item,
            source: 'upload',
            type: item.accident_detected ? 'accident' : 'safe'
          })
        }
      })

      // Add live detection results (filter by user if available)
      liveHistory.forEach(item => {
        if (item.analysis_type === 'live' || item.detection_source === 'live_camera') {
          userResults.push({
            ...item,
            source: 'live',
            type: item.accident_detected ? 'accident' : 'safe'
          })
        }
      })

      // Add notification results for this user
      notificationHistory.forEach(item => {
        if (item.user?.username === user.username && item.result) {
          const existingResult = userResults.find(r => 
            Math.abs(new Date(r.timestamp) - new Date(item.timestamp)) < 60000
          )
          
          if (!existingResult) {
            userResults.push({
              ...item.result,
              id: item.id,
              timestamp: item.timestamp,
              source: item.source === 'live' ? 'live' : 'upload',
              type: item.result.accident_detected ? 'accident' : 'safe'
            })
          }
        }
      })

      // Sort by timestamp (newest first) and remove duplicates
      const uniqueResults = userResults.reduce((acc, current) => {
        const existing = acc.find(item => 
          item.filename === current.filename && 
          Math.abs(new Date(item.timestamp) - new Date(current.timestamp)) < 5000
        )
        if (!existing) {
          acc.push(current)
        }
        return acc
      }, [])

      uniqueResults.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

      setResults(uniqueResults)
      setLoading(false)

      // Check if we should show a specific result from URL params
      const resultId = searchParams.get('id')
      if (resultId) {
        const specificResult = uniqueResults.find(r => r.id === resultId)
        if (specificResult) {
          setSelectedResult(specificResult)
        }
      }

    } catch (error) {
      console.error('Error loading user results:', error)
      setError('Failed to load your results. Please try again.')
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...results]

    // Apply type filter
    if (filter === 'accidents') {
      filtered = filtered.filter(r => r.accident_detected === true)
    } else if (filter === 'safe') {
      filtered = filtered.filter(r => r.accident_detected === false)
    } else if (filter === 'upload') {
      filtered = filtered.filter(r => r.source === 'upload')
    } else if (filter === 'live') {
      filtered = filtered.filter(r => r.source === 'live')
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.filename?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.predicted_class?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.details?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredResults(filtered)
  }

  const handleDownloadReport = (result) => {
    const report = {
      user_info: {
        username: user.username,
        email: user.email,
        role: user.role
      },
      analysis_result: {
        accident_detected: result.accident_detected,
        confidence: result.confidence,
        predicted_class: result.predicted_class,
        processing_time: result.processing_time
      },
      file_info: {
        filename: result.filename,
        file_size: result.file_size,
        content_type: result.content_type,
        source: result.source
      },
      metadata: {
        timestamp: result.timestamp,
        analysis_id: result.id,
        analysis_type: result.analysis_type || result.source
      }
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `my_analysis_${result.id || Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getResultIcon = (result) => {
    if (result.accident_detected) {
      return <AlertTriangle className="result-icon result-icon--danger" />
    }
    return <CheckCircle className="result-icon result-icon--success" />
  }

  const getResultColorClass = (result) => {
    if (result.accident_detected) {
      return result.confidence > 0.8 ? 'result-card--high-danger' : 'result-card--medium-danger'
    }
    return 'result-card--safe'
  }

  if (!isAuthenticated) {
    return (
      <div className="page-container page-container--center">
        <div className="auth-required">
          <div className="auth-required__icon">🔒</div>
          <h1 className="auth-required__title">Authentication Required</h1>
          <p className="auth-required__text">Please log in to view your analysis results.</p>
          <button
            onClick={() => window.location.href = '/auth'}
            className="btn btn--primary"
          >
            Login
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="page-container page-container--center">
        <div className="loading">
          <div className="loading__spinner"></div>
          <p className="loading__text">Loading your results...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-container page-container--center">
        <div className="error">
          <div className="error__icon">⚠️</div>
          <h1 className="error__title">Error Loading Results</h1>
          <p className="error__text">{error}</p>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="btn btn--primary"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="main-content">
        {/* Header */}
        <div className="header">
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="back-btn"
          >
            <ArrowLeft className="back-btn__icon" />
            Back to Dashboard
          </button>
          
          <div className="header__content">
            <div className="header__left">
              <h1 className="header__title">My Analysis Results</h1>
              <p className="header__subtitle">Your personal accident detection analysis history</p>
            </div>
            
            <div className="header__right">
              <div className="user-info">
                <div className="user-info__label">Logged in as</div>
                <div className="user-info__name">{user.username}</div>
                <div className="user-info__role">{user.role}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card__content">
              <div className="stat-card__icon stat-card__icon--blue">
                <FileText />
              </div>
              <div className="stat-card__info">
                <div className="stat-card__value">{results.length}</div>
                <div className="stat-card__label">Total Analyses</div>
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-card__content">
              <div className="stat-card__icon stat-card__icon--red">
                <AlertTriangle />
              </div>
              <div className="stat-card__info">
                <div className="stat-card__value">
                  {results.filter(r => r.accident_detected).length}
                </div>
                <div className="stat-card__label">Accidents Detected</div>
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-card__content">
              <div className="stat-card__icon stat-card__icon--green">
                <CheckCircle />
              </div>
              <div className="stat-card__info">
                <div className="stat-card__value">
                  {results.filter(r => !r.accident_detected).length}
                </div>
                <div className="stat-card__label">Safe Results</div>
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-card__content">
              <div className="stat-card__icon stat-card__icon--purple">
                <Camera />
              </div>
              <div className="stat-card__info">
                <div className="stat-card__value">
                  {results.filter(r => r.source === 'live').length}
                </div>
                <div className="stat-card__label">Live Detections</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="filters-card">
          <div className="filters-content">
            <div className="filter-buttons">
              <button
                onClick={() => setFilter('all')}
                className={`filter-btn ${filter === 'all' ? 'filter-btn--active' : ''}`}
              >
                All ({results.length})
              </button>
              <button
                onClick={() => setFilter('accidents')}
                className={`filter-btn filter-btn--red ${filter === 'accidents' ? 'filter-btn--active' : ''}`}
              >
                Accidents ({results.filter(r => r.accident_detected).length})
              </button>
              <button
                onClick={() => setFilter('safe')}
                className={`filter-btn filter-btn--green ${filter === 'safe' ? 'filter-btn--active' : ''}`}
              >
                Safe ({results.filter(r => !r.accident_detected).length})
              </button>
              <button
                onClick={() => setFilter('upload')}
                className={`filter-btn filter-btn--purple ${filter === 'upload' ? 'filter-btn--active' : ''}`}
              >
                Uploads ({results.filter(r => r.source === 'upload').length})
              </button>
              <button
                onClick={() => setFilter('live')}
                className={`filter-btn filter-btn--orange ${filter === 'live' ? 'filter-btn--active' : ''}`}
              >
                Live ({results.filter(r => r.source === 'live').length})
              </button>
            </div>
            
            <div className="search-container">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search results..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
        </div>

        {/* Results List */}
        {filteredResults.length === 0 ? (
          <div className="no-results">
            <div className="no-results__icon">📊</div>
            <h3 className="no-results__title">No Results Found</h3>
            <p className="no-results__text">
              {results.length === 0 
                ? "You haven't performed any analyses yet. Try uploading a file or using live detection."
                : "No results match your current filters. Try adjusting your search criteria."
              }
            </p>
            <div className="no-results__actions">
              <button
                onClick={() => window.location.href = '/upload'}
                className="btn btn--primary"
              >
                Upload File
              </button>
              <button
                onClick={() => window.location.href = '/live'}
                className="btn btn--success"
              >
                Live Detection
              </button>
            </div>
          </div>
        ) : (
          <div className="results-list">
            {filteredResults.map((result, index) => (
              <div
                key={result.id || index}
                className={`result-card ${getResultColorClass(result)}`}
              >
                <div className="result-card__content">
                  <div className="result-card__main">
                    {getResultIcon(result)}
                    <div className="result-card__info">
                      <div className="result-card__header">
                        <h3 className="result-card__title">
                          {result.filename || `${result.source} Detection`}
                        </h3>
                        <span className={`badge ${result.source === 'live' ? 'badge--orange' : 'badge--blue'}`}>
                          {result.source === 'live' ? 'Live Detection' : 'File Upload'}
                        </span>
                        <span className={`badge ${result.accident_detected ? 'badge--red' : 'badge--green'}`}>
                          {result.accident_detected ? 'ACCIDENT' : 'SAFE'}
                        </span>
                      </div>
                      
                      <div className="result-card__details">
                        <div className="detail-item">
                          <Clock className="detail-icon" />
                          {new Date(result.timestamp).toLocaleString()}
                        </div>
                        <div className="detail-item">
                          <div className="detail-icon">📊</div>
                          Confidence: {(result.confidence * 100).toFixed(1)}%
                        </div>
                        {result.file_size && (
                          <div className="detail-item">
                            <FileText className="detail-icon" />
                            {formatFileSize(result.file_size)}
                          </div>
                        )}
                      </div>
                      
                      {result.details && (
                        <p className="result-card__description">{result.details}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="result-card__actions">
                    <button
                      onClick={() => setSelectedResult(result)}
                      className="btn btn--primary btn--sm"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleDownloadReport(result)}
                      className="btn btn--secondary btn--sm btn--icon"
                    >
                      <Download />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Result Detail Modal */}
        {selectedResult && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal__header">
                <h2 className="modal__title">Analysis Details</h2>
                <button
                  onClick={() => setSelectedResult(null)}
                  className="modal__close"
                >
                  ✕
                </button>
              </div>
              
              <div className="modal__content">
                {/* Result Status */}
                <div className={`result-status ${getResultColorClass(selectedResult)}`}>
                  <div className="result-status__content">
                    {getResultIcon(selectedResult)}
                    <div>
                      <h3 className="result-status__title">
                        {selectedResult.accident_detected ? 'ACCIDENT DETECTED' : 'NO ACCIDENT DETECTED'}
                      </h3>
                      <p className="result-status__confidence">
                        Confidence: {(selectedResult.confidence * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* File Information */}
                <div className="detail-section">
                  <h4 className="detail-section__title">File Information</h4>
                  <div className="detail-grid">
                    <div className="detail-field">
                      <span className="detail-field__label">Filename:</span>
                      <div className="detail-field__value">{selectedResult.filename || 'Live Detection'}</div>
                    </div>
                    <div className="detail-field">
                      <span className="detail-field__label">Source:</span>
                      <div className="detail-field__value">{selectedResult.source}</div>
                    </div>
                    {selectedResult.file_size && (
                      <div className="detail-field">
                        <span className="detail-field__label">File Size:</span>
                        <div className="detail-field__value">{formatFileSize(selectedResult.file_size)}</div>
                      </div>
                    )}
                    {selectedResult.content_type && (
                      <div className="detail-field">
                        <span className="detail-field__label">Type:</span>
                        <div className="detail-field__value">{selectedResult.content_type}</div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Analysis Results */}
                <div className="detail-section">
                  <h4 className="detail-section__title">Analysis Results</h4>
                  <div className="detail-grid">
                    <div className="detail-field">
                      <span className="detail-field__label">Predicted Class:</span>
                      <div className="detail-field__value">{selectedResult.predicted_class || 'Unknown'}</div>
                    </div>
                    <div className="detail-field">
                      <span className="detail-field__label">Processing Time:</span>
                      <div className="detail-field__value">{selectedResult.processing_time?.toFixed(2) || 'N/A'}s</div>
                    </div>
                    <div className="detail-field">
                      <span className="detail-field__label">Analysis Date:</span>
                      <div className="detail-field__value">{new Date(selectedResult.timestamp).toLocaleString()}</div>
                    </div>
                    <div className="detail-field">
                      <span className="detail-field__label">Analysis ID:</span>
                      <div className="detail-field__value detail-field__value--small">{selectedResult.id}</div>
                    </div>
                  </div>
                </div>
                
                {selectedResult.details && (
                  <div className="detail-section">
                    <h4 className="detail-section__title">Additional Details</h4>
                    <p className="detail-section__description">
                      {selectedResult.details}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="modal__footer">
                <button
                  onClick={() => handleDownloadReport(selectedResult)}
                  className="btn btn--primary"
                >
                  Download Report
                </button>
                <button
                  onClick={() => setSelectedResult(null)}
                  className="btn btn--secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="quick-actions">
          <div className="quick-actions__content">
            <button
              onClick={() => window.location.href = '/upload'}
              className="btn btn--primary btn--lg"
            >
              📤 Upload New File
            </button>
            <button
              onClick={() => window.location.href = '/live'}
              className="btn btn--success btn--lg"
            >
              📹 Live Detection
            </button>
            <button
              onClick={() => window.location.href = '/notification'}
              className="btn btn--warning btn--lg"
            >
              🔔 View Alerts
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserResultsPage