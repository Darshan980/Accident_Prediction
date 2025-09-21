/**
 * Utility functions for result processing and formatting
 */

/**
 * Format file size from bytes to human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return 'Unknown'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Truncate filename to specified length with ellipsis
 * @param {string} filename - Original filename
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated filename
 */
export const truncateFilename = (filename, maxLength = 30) => {
  if (!filename || filename.length <= maxLength) return filename
  
  // Try to keep file extension visible
  const lastDotIndex = filename.lastIndexOf('.')
  if (lastDotIndex > 0 && lastDotIndex > maxLength - 10) {
    const extension = filename.slice(lastDotIndex)
    const nameWithoutExt = filename.slice(0, lastDotIndex)
    const truncatedName = nameWithoutExt.slice(0, maxLength - extension.length - 3)
    return `${truncatedName}...${extension}`
  }
  
  return `${filename.slice(0, maxLength - 3)}...`
}

/**
 * Smart text truncation that tries to break at word boundaries
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text
  
  const truncated = text.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  
  // If we can break at a word boundary and it's not too short, do so
  if (lastSpace > maxLength * 0.8) {
    return `${text.slice(0, lastSpace)}...`
  }
  
  return `${truncated}...`
}

/**
 * Generate a download report object
 * @param {Object} result - Analysis result
 * @param {Object} user - User information
 * @returns {Object} Report object
 */
export const generateReport = (result, user) => {
  return {
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
      analysis_type: result.analysis_type || result.source,
      report_generated: new Date().toISOString()
    }
  }
}

/**
 * Download a JSON report
 * @param {Object} reportData - Report data to download
 * @param {string} filename - Download filename
 */
export const downloadReport = (reportData, filename) => {
  const blob = new Blob([JSON.stringify(reportData, null, 2)], { 
    type: 'application/json' 
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Get relative time string (e.g., "2 hours ago")
 * @param {string|Date} timestamp - Timestamp to format
 * @returns {string} Relative time string
 */
export const getRelativeTime = (timestamp) => {
  const now = new Date()
  const then = new Date(timestamp)
  const diffInSeconds = Math.floor((now - then) / 1000)
  
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`
  
  return then.toLocaleDateString()
}

/**
 * Get confidence level description
 * @param {number} confidence - Confidence score (0-1)
 * @returns {string} Confidence description
 */
export const getConfidenceLevel = (confidence) => {
  if (confidence >= 0.9) return 'Very High'
  if (confidence >= 0.8) return 'High'
  if (confidence >= 0.6) return 'Medium'
  if (confidence >= 0.4) return 'Low'
  return 'Very Low'
}

/**
 * Filter results based on search term
 * @param {Array} results - Array of results
 * @param {string} searchTerm - Search term
 * @returns {Array} Filtered results
 */
export const filterResultsBySearch = (results, searchTerm) => {
  if (!searchTerm || !searchTerm.trim()) return results
  
  const term = searchTerm.toLowerCase().trim()
  return results.filter(result => 
    result.filename?.toLowerCase().includes(term) ||
    result.predicted_class?.toLowerCase().includes(term) ||
    result.details?.toLowerCase().includes(term) ||
    result.source?.toLowerCase().includes(term)
  )
}

/**
 * Sort results by different criteria
 * @param {Array} results - Array of results
 * @param {string} sortBy - Sort criteria ('date', 'confidence', 'filename')
 * @param {string} order - Sort order ('asc', 'desc')
 * @returns {Array} Sorted results
 */
export const sortResults = (results, sortBy = 'date', order = 'desc') => {
  const sorted = [...results].sort((a, b) => {
    let comparison = 0
    
    switch (sortBy) {
      case 'date':
        comparison = new Date(a.timestamp) - new Date(b.timestamp)
        break
      case 'confidence':
        comparison = a.confidence - b.confidence
        break
      case 'filename':
        comparison = (a.filename || '').localeCompare(b.filename || '')
        break
      default:
        comparison = new Date(a.timestamp) - new Date(b.timestamp)
    }
    
    return order === 'desc' ? -comparison : comparison
  })
  
  return sorted
}
