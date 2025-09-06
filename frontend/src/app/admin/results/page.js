'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { AlertTriangle, CheckCircle, Clock, FileText, Camera, ArrowLeft, Download, Search, Users, Shield, Filter } from 'lucide-react'

const AdminResultsPage = () => {
  const { user, isAuthenticated } = useAuth()
  const [allResults, setAllResults] = useState([])
  const [filteredResults, setFilteredResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all') // 'all', 'accidents', 'safe', 'upload', 'live', 'user', 'admin'
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedResult, setSelectedResult] = useState(null)
  const [userFilter, setUserFilter] = useState('all')
  const [uniqueUsers, setUniqueUsers] = useState([])

  useEffect(() => {
    loadAllResults()
  }, [user])

  useEffect(() => {
    applyFilters()
  }, [allResults, filter, searchTerm, userFilter])

  const loadAllResults = () => {
    try {
      setLoading(true)
      
      if (!isAuthenticated || !user || (user.role !== 'admin' && !user.admin_level)) {
        setError('Admin access required to view all results.')
        setLoading(false)
        return
      }

      // Load all data sources
      const userUploadHistory = JSON.parse(localStorage.getItem('userUploadHistory') || '[]')
      const adminUploadHistory = JSON.parse(localStorage.getItem('adminUploadHistory') || '[]')
      const liveHistory = JSON.parse(localStorage.getItem('detectionHistory') || '[]')
      const notificationHistory = JSON.parse(localStorage.getItem('accident_notifications') || '[]')
      const alertHistory = JSON.parse(localStorage.getItem('alertHistory') || '[]')

      const combinedResults = []
      const users = new Set()

      // Add user upload results
      userUploadHistory.forEach(item => {
        combinedResults.push({
          ...item,
          source: 'upload',
          user_type: 'user',
          type: item.accident_detected ? 'accident' : 'safe'
        })
        if (item.user) users.add(item.user)
      })

      // Add admin upload results
      adminUploadHistory.forEach(item => {
        combinedResults.push({
          ...item,
          source: 'admin_upload',
          user_type: 'admin',
          type: item.accident_detected ? 'accident' : 'safe'
        })
        if (item.user) users.add(item.user)
      })

      // Add live detection results
      liveHistory.forEach(item => {
        combinedResults.push({
          ...item,
          source: 'live',
          user_type: 'user', // Live detection is typically user-initiated
          type: item.accident_detected ? 'accident' : 'safe'
        })
        if (item.user) users.add(item.user)
      })

      // Add notification results
      notificationHistory.forEach(item => {
        if (item.result) {
          const existingResult = combinedResults.find(r => 
            Math.abs(new Date(r.timestamp) - new Date(item.timestamp)) < 60000
          )
          
          if (!existingResult) {
            combinedResults.push({
              ...item.result,
              id: item.id,
              timestamp: item.timestamp,
              source: item.source === 'live' ? 'live' : 'upload',
              user_type: item.user?.role || 'user',
              user: item.user?.username || 'unknown',
              type: item.result.accident_detected ? 'accident' : 'safe'
            })
            if (item.user?.username) users.add(item.user.username)
          }
        }
      })

      // Add alert history for additional context
      alertHistory.forEach(item => {
        const existingResult = combinedResults.find(r => 
          Math.abs(new Date(r.timestamp) - new Date(item.timestamp)) < 60000
        )
        
        if (!existingResult) {
          combinedResults.push({
            id: item.id,
            timestamp: item.timestamp,
            filename: item.filename,
            source: item.source?.includes('Live') ? 'live' : 'upload',
            user_type: item.user_type || 'user',
            user: item.user || 'unknown',
            accident_detected: item.accident_detected,
            confidence: item.confidence,
            predicted_class: item.predicted_class,
            processing_time: item.processing_time,
            analysis_type: item.analysis_type,
            type: item.accident_detected ? 'accident' : 'safe',
            severity: item.severity
          })
          if (item.user) users.add(item.user)
        }
      })

      // Remove duplicates and sort
      const uniqueResults = combinedResults.reduce((acc, current) => {
        const existing = acc.find(item => 
          item.id === current.id || 
          (item.filename === current.filename && 
           Math.abs(new Date(item.timestamp) - new Date(current.timestamp)) < 5000)
        )
        if (!existing) {
          acc.push(current)
        }
        return acc
      }, [])

      uniqueResults.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

      setAllResults(uniqueResults)
      setUniqueUsers(['all', ...Array.from(users).sort()])
      setLoading(false)

    } catch (error) {
      console.error('Error loading all results:', error)
      setError('Failed to load results. Please try again.')
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...allResults]

    // Apply type filter
    if (filter === 'accidents') {
      filtered = filtered.filter(r => r.accident_detected === true)
    } else if (filter === 'safe') {
      filtered = filtered.filter(r => r.accident_detected === false)
    } else if (filter === 'upload') {
      filtered = filtered.filter(r => r.source === 'upload')
    } else if (filter === 'live') {
      filtered = filtered.filter(r => r.source === 'live')
    } else if (filter === 'admin_upload') {
      filtered = filtered.filter(r => r.source === 'admin_upload')
    } else if (filter === 'user') {
      filtered = filtered.filter(r => r.user_type === 'user')
    } else if (filter === 'admin') {
      filtered = filtered.filter(r => r.user_type === 'admin')
    }

    // Apply user filter
    if (userFilter !== 'all') {
      filtered = filtered.filter(r => r.user === userFilter)
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.filename?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.predicted_class?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.user?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.details?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredResults(filtered)
  }

  const handleDownloadAllReport = () => {
    const report = {
      admin_info: {
        username: user.username,
        email: user.email,
        role: user.role,
        export_timestamp: new Date().toISOString()
      },
      summary: {
        total_results: allResults.length,
        accidents_detected: allResults.filter(r => r.accident_detected).length,
        safe_results: allResults.filter(r => !r.accident_detected).length,
        unique_users: uniqueUsers.length - 1, // Exclude 'all'
        sources: {
          uploads: allResults.filter(r => r.source === 'upload').length,
          live_detections: allResults.filter(r => r.source === 'live').length,
          admin_uploads: allResults.filter(r => r.source === 'admin_upload').length
        }
      },
      results: filteredResults.map(result => ({
        id: result.id,
        timestamp: result.timestamp,
        user: result.user,
        user_type: result.user_type,
        source: result.source,
        filename: result.filename,
        accident_detected: result.accident_detected,
        confidence: result.confidence,
        predicted_class: result.predicted_class,
        processing_time: result.processing_time,
        file_size: result.file_size,
        content_type: result.content_type
      }))
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `admin_all_results_${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDownloadReport = (result) => {
    const report = {
      admin_info: {
        username: user.username,
        role: user.role,
        export_timestamp: new Date().toISOString()
      },
      result_details: {
        id: result.id,
        user: result.user,
        user_type: result.user_type,
        source: result.source,
        timestamp: result.timestamp,
        filename: result.filename,
        accident_detected: result.accident_detected,
        confidence: result.confidence,
        predicted_class: result.predicted_class,
        processing_time: result.processing_time,
        file_size: result.file_size,
        content_type: result.content_type,
        details: result.details
      }
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `admin_result_${result.id || Date.now()}.json`
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
      return <AlertTriangle style={{ width: '24px', height: '24px', color: '#ef4444' }} />
    }
    return <CheckCircle style={{ width: '24px', height: '24px', color: '#10b981' }} />
  }

  const getResultColor = (result) => {
    if (result.accident_detected) {
      return result.confidence > 0.8 ? 'result-danger' : 'result-warning'
    }
    return 'result-success'
  }

  const getSourceIcon = (source) => {
    const iconStyle = { width: '16px', height: '16px' }
    switch (source) {
      case 'live':
        return <Camera style={iconStyle} />
      case 'admin_upload':
        return <Shield style={iconStyle} />
      default:
        return <FileText style={iconStyle} />
    }
  }

  const getSourceColor = (source) => {
    switch (source) {
      case 'live':
        return 'source-live'
      case 'admin_upload':
        return 'source-admin'
      default:
        return 'source-upload'
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="auth-required">
        <div className="auth-content">
          <div className="auth-icon">🔒</div>
          <h1 className="auth-title">Authentication Required</h1>
          <p className="auth-text">Please log in to access admin features.</p>
          <button
            onClick={() => window.location.href = '/auth'}
            className="btn btn-primary"
          >
            Login
          </button>
        </div>
      </div>
    )
  }

  if (!user || (user.role !== 'admin' && !user.admin_level)) {
    return (
      <div className="auth-required">
        <div className="auth-content">
          <div className="auth-icon">⛔</div>
          <h1 className="auth-title">Admin Access Required</h1>
          <p className="auth-text">You need administrator privileges to view all results.</p>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="btn btn-primary"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="spinner"></div>
          <p className="loading-text">Loading all results...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="auth-required">
        <div className="auth-content">
          <div className="auth-icon">⚠️</div>
          <h1 className="auth-title">Error Loading Results</h1>
          <p className="auth-text">{error}</p>
          <button
            onClick={() => window.location.href = '/admin/dashboard'}
            className="btn btn-primary"
          >
            Go to Admin Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <style jsx>{`
        .page-container {
          min-height: 100vh;
          background-color: #f9fafb;
          padding: 32px 0;
        }

        .main-content {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 16px;
        }

        .back-button {
          display: flex;
          align-items: center;
          color: #2563eb;
          text-decoration: none;
          margin-bottom: 16px;
          font-size: 14px;
          transition: color 0.2s;
        }

        .back-button:hover {
          color: #1d4ed8;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
        }

        .header-title {
          margin: 0 0 8px 0;
          font-size: 30px;
          font-weight: bold;
          color: #1f2937;
        }

        .header-subtitle {
          color: #6b7280;
          margin: 0;
        }

        .admin-info {
          text-align: right;
        }

        .admin-info div {
          margin: 2px 0;
        }

        .admin-label {
          font-size: 14px;
          color: #6b7280;
        }

        .admin-value {
          font-weight: 600;
          color: #1f2937;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 24px;
        }

        .stat-content {
          display: flex;
          align-items: center;
        }

        .stat-icon {
          padding: 8px;
          border-radius: 8px;
          margin-right: 16px;
        }

        .stat-icon-blue { background-color: #dbeafe; }
        .stat-icon-red { background-color: #fee2e2; }
        .stat-icon-green { background-color: #dcfce7; }
        .stat-icon-purple { background-color: #f3e8ff; }
        .stat-icon-orange { background-color: #fed7aa; }

        .stat-value {
          font-size: 32px;
          font-weight: bold;
          color: #1f2937;
          margin: 0;
        }

        .stat-label {
          color: #6b7280;
          margin: 0;
        }

        .filters-card {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 24px;
          margin-bottom: 32px;
        }

        .filters-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .filter-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .filter-btn {
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-btn.active {
          color: white;
        }

        .filter-btn.inactive {
          background-color: #e5e7eb;
          color: #374151;
        }

        .filter-btn.inactive:hover {
          background-color: #d1d5db;
        }

        .filter-all.active { background-color: #2563eb; }
        .filter-accidents.active { background-color: #dc2626; }
        .filter-safe.active { background-color: #16a34a; }
        .filter-upload.active { background-color: #9333ea; }
        .filter-live.active { background-color: #ea580c; }
        .filter-admin.active { background-color: #4f46e5; }

        .filter-controls {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .filter-row {
          display: flex;
          gap: 16px;
          align-items: center;
          justify-content: space-between;
        }

        .filter-left {
          display: flex;
          gap: 16px;
        }

        .select-input {
          padding: 8px 16px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          min-width: 150px;
        }

        .select-input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .btn-primary {
          background-color: #2563eb;
          color: white;
        }

        .btn-primary:hover {
          background-color: #1d4ed8;
        }

        .btn-success {
          background-color: #16a34a;
          color: white;
        }

        .btn-success:hover {
          background-color: #15803d;
        }

        .btn-secondary {
          background-color: #6b7280;
          color: white;
        }

        .btn-secondary:hover {
          background-color: #4b5563;
        }

        .btn-gray {
          background-color: #d1d5db;
          color: #374151;
        }

        .btn-gray:hover {
          background-color: #9ca3af;
        }

        .search-container {
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
          width: 20px;
          height: 20px;
        }

        .search-input {
          padding: 8px 16px 8px 40px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          min-width: 300px;
        }

        .search-input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .results-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .result-card {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border-left: 4px solid;
          padding: 24px;
        }

        .result-danger {
          border-left-color: #ef4444;
          background-color: #fef2f2;
        }

        .result-warning {
          border-left-color: #f59e0b;
          background-color: #fffbeb;
        }

        .result-success {
          border-left-color: #10b981;
          background-color: #f0fdf4;
        }

        .result-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
        }

        .result-content {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          flex: 1;
        }

        .result-details {
          flex: 1;
        }

        .result-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }

        .result-title {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .badge {
          padding: 4px 8px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .source-live {
          background-color: #fed7aa;
          color: #9a3412;
        }

        .source-admin {
          background-color: #e9d5ff;
          color: #6b21a8;
        }

        .source-upload {
          background-color: #dbeafe;
          color: #1e40af;
        }

        .badge-danger {
          background-color: #fee2e2;
          color: #991b1b;
        }

        .badge-success {
          background-color: #dcfce7;
          color: #166534;
        }

        .badge-gray {
          background-color: #f3f4f6;
          color: #1f2937;
        }

        .result-info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
          font-size: 14px;
          color: #6b7280;
        }

        .info-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .result-details-text {
          margin-top: 8px;
          font-size: 14px;
          color: #6b7280;
        }

        .result-actions {
          display: flex;
          gap: 8px;
        }

        .no-results {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 48px;
          text-align: center;
        }

        .no-results-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }

        .no-results-title {
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 8px 0;
        }

        .no-results-text {
          color: #6b7280;
          margin: 0 0 24px 0;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          max-width: 768px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-title {
          font-size: 24px;
          font-weight: bold;
          color: #1f2937;
          margin: 0;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 20px;
          color: #9ca3af;
          cursor: pointer;
          padding: 4px;
        }

        .modal-close:hover {
          color: #6b7280;
        }

        .modal-body {
          padding: 24px;
        }

        .modal-section {
          margin-bottom: 24px;
        }

        .modal-section:last-child {
          margin-bottom: 0;
        }

        .section-title {
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 12px;
          font-size: 16px;
        }

        .section-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          font-size: 14px;
        }

        .section-item label {
          color: #6b7280;
          display: block;
          margin-bottom: 2px;
        }

        .section-item .value {
          font-weight: 500;
          color: #1f2937;
        }

        .section-item .value.small {
          font-size: 12px;
        }

        .details-text {
          font-size: 14px;
          color: #6b7280;
          background-color: #f9fafb;
          padding: 12px;
          border-radius: 6px;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
        }

        .quick-actions {
          margin-top: 32px;
          text-align: center;
        }

        .quick-actions-grid {
          display: flex;
          justify-content: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .btn-purple {
          background-color: #7c3aed;
          color: white;
          padding: 12px 24px;
        }

        .btn-purple:hover {
          background-color: #6d28d9;
        }

        .btn-orange {
          background-color: #ea580c;
          color: white;
          padding: 12px 24px;
        }

        .btn-orange:hover {
          background-color: #c2410c;
        }

        .auth-required {
          min-height: 100vh;
          background-color: #f9fafb;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .auth-content {
          text-align: center;
        }

        .auth-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }

        .auth-title {
          font-size: 24px;
          font-weight: bold;
          color: #1f2937;
          margin: 0 0 8px 0;
        }

        .auth-text {
          color: #6b7280;
          margin: 0 0 16px 0;
        }

        .loading-container {
          min-height: 100vh;
          background-color: #f9fafb;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .loading-content {
          text-align: center;
        }

        .spinner {
          width: 48px;
          height: 48px;
          border: 2px solid #e5e7eb;
          border-top: 2px solid #2563eb;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        .loading-text {
          color: #6b7280;
          margin: 0;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .status-card {
          padding: 16px;
          border-radius: 8px;
          border-left: 4px solid;
        }

        .status-card.danger {
          border-left-color: #ef4444;
          background-color: #fef2f2;
        }

        .status-card.success {
          border-left-color: #10b981;
          background-color: #f0fdf4;
        }

        .status-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .status-title {
          font-size: 18px;
          font-weight: bold;
          margin: 0 0 4px 0;
        }

        .status-title.danger {
          color: #991b1b;
        }

        .status-title.success {
          color: #065f46;
        }

        .status-confidence {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }

        @media (max-width: 768px) {
          .header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }

          .filter-row {
            flex-direction: column;
            align-items: flex-start;
          }

          .filter-left {
            flex-direction: column;
            width: 100%;
          }

          .search-input {
            min-width: 100%;
          }

          .select-input {
            width: 100%;
          }

          .result-header {
            flex-direction: column;
            gap: 16px;
          }

          .result-actions {
            align-self: flex-start;
          }

          .section-grid {
            grid-template-columns: 1fr;
          }

          .quick-actions-grid {
            flex-direction: column;
            align-items: center;
          }
        }
      `}</style>
      
      <div className="main-content">
        {/* Header */}
        <div>
          <button
            onClick={() => window.location.href = '/admin/dashboard'}
            className="back-button"
          >
            <ArrowLeft style={{ width: '16px', height: '16px', marginRight: '8px' }} />
            Back to Admin Dashboard
          </button>
          
          <div className="header">
            <div>
              <h1 className="header-title">
                🛡️ All System Results
              </h1>
              <p className="header-subtitle">
                Complete accident detection analysis history for all users
              </p>
            </div>
            
            <div className="admin-info">
              <div className="admin-label">Admin Access</div>
              <div className="admin-value">{user.username}</div>
              <div className="admin-label">{user.role}</div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-icon stat-icon-blue">
                <FileText style={{ width: '24px', height: '24px', color: '#2563eb' }} />
              </div>
              <div>
                <div className="stat-value">{allResults.length}</div>
                <div className="stat-label">Total Results</div>
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-icon stat-icon-red">
                <AlertTriangle style={{ width: '24px', height: '24px', color: '#dc2626' }} />
              </div>
              <div>
                <div className="stat-value">
                  {allResults.filter(r => r.accident_detected).length}
                </div>
                <div className="stat-label">Accidents</div>
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-icon stat-icon-green">
                <CheckCircle style={{ width: '24px', height: '24px', color: '#16a34a' }} />
              </div>
              <div>
                <div className="stat-value">
                  {allResults.filter(r => !r.accident_detected).length}
                </div>
                <div className="stat-label">Safe</div>
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-icon stat-icon-purple">
                <Camera style={{ width: '24px', height: '24px', color: '#7c3aed' }} />
              </div>
              <div>
                <div className="stat-value">
                  {allResults.filter(r => r.source === 'live').length}
                </div>
                <div className="stat-label">Live</div>
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-icon stat-icon-orange">
                <Users style={{ width: '24px', height: '24px', color: '#ea580c' }} />
              </div>
              <div>
                <div className="stat-value">
                  {uniqueUsers.length - 1}
                </div>
                <div className="stat-label">Users</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="filters-card">
          <div className="filters-content">
            {/* Type Filters */}
            <div className="filter-buttons">
              <button
                onClick={() => setFilter('all')}
                className={`filter-btn filter-all ${filter === 'all' ? 'active' : 'inactive'}`}
              >
                All ({allResults.length})
              </button>
              <button
                onClick={() => setFilter('accidents')}
                className={`filter-btn filter-accidents ${filter === 'accidents' ? 'active' : 'inactive'}`}
              >
                Accidents ({allResults.filter(r => r.accident_detected).length})
              </button>
              <button
                onClick={() => setFilter('safe')}
                className={`filter-btn filter-safe ${filter === 'safe' ? 'active' : 'inactive'}`}
              >
                Safe ({allResults.filter(r => !r.accident_detected).length})
              </button>
              <button
                onClick={() => setFilter('upload')}
                className={`filter-btn filter-upload ${filter === 'upload' ? 'active' : 'inactive'}`}
              >
                Uploads ({allResults.filter(r => r.source === 'upload').length})
              </button>
              <button
                onClick={() => setFilter('live')}
                className={`filter-btn filter-live ${filter === 'live' ? 'active' : 'inactive'}`}
              >
                Live ({allResults.filter(r => r.source === 'live').length})
              </button>
              <button
                onClick={() => setFilter('admin_upload')}
                className={`filter-btn filter-admin ${filter === 'admin_upload' ? 'active' : 'inactive'}`}
              >
                Admin ({allResults.filter(r => r.source === 'admin_upload').length})
              </button>
            </div>
            
            {/* Search and User Filter */}
            <div className="filter-controls">
              <div className="filter-row">
                <div className="filter-left">
                  <select
                    value={userFilter}
                    onChange={(e) => setUserFilter(e.target.value)}
                    className="select-input"
                  >
                    {uniqueUsers.map(user => (
                      <option key={user} value={user}>
                        {user === 'all' ? 'All Users' : user}
                      </option>
                    ))}
                  </select>
                  
                  <button
                    onClick={handleDownloadAllReport}
                    className="btn btn-success"
                  >
                    <Download style={{ width: '16px', height: '16px' }} />
                    Export All
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
          </div>
        </div>

        {/* Results List */}
        {filteredResults.length === 0 ? (
          <div className="no-results">
            <div className="no-results-icon">📊</div>
            <h3 className="no-results-title">No Results Found</h3>
            <p className="no-results-text">
              {allResults.length === 0 
                ? "No analysis results found in the system."
                : "No results match your current filters. Try adjusting your search criteria."
              }
            </p>
          </div>
        ) : (
          <div className="results-list">
            {filteredResults.map((result, index) => (
              <div
                key={result.id || index}
                className={`result-card ${getResultColor(result)}`}
              >
                <div className="result-header">
                  <div className="result-content">
                    {getResultIcon(result)}
                    <div className="result-details">
                      <div className="result-title-row">
                        <h3 className="result-title">
                          {result.filename || `${result.source} Detection`}
                        </h3>
                        <span className={`badge ${getSourceColor(result.source)}`}>
                          {getSourceIcon(result.source)}
                          {result.source === 'live' ? 'Live Detection' : 
                           result.source === 'admin_upload' ? 'Admin Upload' : 'User Upload'}
                        </span>
                        <span className={`badge ${
                          result.accident_detected ? 'badge-danger' : 'badge-success'
                        }`}>
                          {result.accident_detected ? 'ACCIDENT' : 'SAFE'}
                        </span>
                        <span className="badge badge-gray">
                          👤 {result.user || 'Unknown'}
                        </span>
                      </div>
                      
                      <div className="result-info-grid">
                        <div className="info-item">
                          <Clock style={{ width: '16px', height: '16px' }} />
                          {new Date(result.timestamp).toLocaleString()}
                        </div>
                        <div className="info-item">
                          <div style={{ width: '16px', height: '16px', textAlign: 'center' }}>
                            📊
                          </div>
                          Confidence: {(result.confidence * 100).toFixed(1)}%
                        </div>
                        {result.file_size && (
                          <div className="info-item">
                            <FileText style={{ width: '16px', height: '16px' }} />
                            {formatFileSize(result.file_size)}
                          </div>
                        )}
                        <div className="info-item">
                          <Users style={{ width: '16px', height: '16px' }} />
                          {result.user_type || 'user'}
                        </div>
                      </div>
                      
                      {result.details && (
                        <p className="result-details-text">{result.details}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="result-actions">
                    <button
                      onClick={() => setSelectedResult(result)}
                      className="btn btn-primary"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleDownloadReport(result)}
                      className="btn btn-secondary"
                    >
                      <Download style={{ width: '16px', height: '16px' }} />
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
            <div className="modal-content">
              <div className="modal-header">
                <h2 className="modal-title">Admin Analysis Details</h2>
                <button
                  onClick={() => setSelectedResult(null)}
                  className="modal-close"
                >
                  ✕
                </button>
              </div>
              
              <div className="modal-body">
                {/* Result Status */}
                <div className={`status-card ${selectedResult.accident_detected ? 'danger' : 'success'}`}>
                  <div className="status-content">
                    {getResultIcon(selectedResult)}
                    <div>
                      <h3 className={`status-title ${
                        selectedResult.accident_detected ? 'danger' : 'success'
                      }`}>
                        {selectedResult.accident_detected ? 'ACCIDENT DETECTED' : 'NO ACCIDENT DETECTED'}
                      </h3>
                      <p className="status-confidence">
                        Confidence: {(selectedResult.confidence * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* User Information */}
                <div className="modal-section">
                  <h4 className="section-title">User Information</h4>
                  <div className="section-grid">
                    <div className="section-item">
                      <label>Username:</label>
                      <div className="value">{selectedResult.user || 'Unknown'}</div>
                    </div>
                    <div className="section-item">
                      <label>User Type:</label>
                      <div className="value" style={{ textTransform: 'capitalize' }}>{selectedResult.user_type || 'user'}</div>
                    </div>
                  </div>
                </div>
                
                {/* File Information */}
                <div className="modal-section">
                  <h4 className="section-title">File Information</h4>
                  <div className="section-grid">
                    <div className="section-item">
                      <label>Filename:</label>
                      <div className="value">{selectedResult.filename || 'Live Detection'}</div>
                    </div>
                    <div className="section-item">
                      <label>Source:</label>
                      <div className="value" style={{ textTransform: 'capitalize' }}>{selectedResult.source?.replace('_', ' ')}</div>
                    </div>
                    {selectedResult.file_size && (
                      <div className="section-item">
                        <label>File Size:</label>
                        <div className="value">{formatFileSize(selectedResult.file_size)}</div>
                      </div>
                    )}
                    {selectedResult.content_type && (
                      <div className="section-item">
                        <label>Type:</label>
                        <div className="value">{selectedResult.content_type}</div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Analysis Results */}
                <div className="modal-section">
                  <h4 className="section-title">Analysis Results</h4>
                  <div className="section-grid">
                    <div className="section-item">
                      <label>Predicted Class:</label>
                      <div className="value">{selectedResult.predicted_class || 'Unknown'}</div>
                    </div>
                    <div className="section-item">
                      <label>Processing Time:</label>
                      <div className="value">{selectedResult.processing_time?.toFixed(2) || 'N/A'}s</div>
                    </div>
                    <div className="section-item">
                      <label>Analysis Date:</label>
                      <div className="value">{new Date(selectedResult.timestamp).toLocaleString()}</div>
                    </div>
                    <div className="section-item">
                      <label>Analysis ID:</label>
                      <div className="value small">{selectedResult.id}</div>
                    </div>
                    {selectedResult.severity && (
                      <div className="section-item">
                        <label>Severity:</label>
                        <div className="value" style={{ textTransform: 'capitalize' }}>{selectedResult.severity}</div>
                      </div>
                    )}
                  </div>
                </div>
                
                {selectedResult.details && (
                  <div className="modal-section">
                    <h4 className="section-title">Additional Details</h4>
                    <p className="details-text">
                      {selectedResult.details}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="modal-footer">
                <button
                  onClick={() => handleDownloadReport(selectedResult)}
                  className="btn btn-primary"
                >
                  Download Report
                </button>
                <button
                  onClick={() => setSelectedResult(null)}
                  className="btn btn-gray"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="quick-actions">
          <div className="quick-actions-grid">
            <button
              onClick={() => window.location.href = '/admin/upload'}
              className="btn btn-purple"
            >
              🛡️ Admin Upload
            </button>
            <button
              onClick={() => window.location.href = '/admin/dashboard'}
              className="btn btn-primary"
              style={{ padding: '12px 24px' }}
            >
              📊 Admin Dashboard
            </button>
            <button
              onClick={() => window.location.href = '/notification'}
              className="btn btn-orange"
            >
              🔔 View All Alerts
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminResultsPage