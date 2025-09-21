import { useState, useEffect } from 'react'
import { generateReport, downloadReport, filterResultsBySearch } from '../utils/resultUtils'

export const useUserResults = (user, isAuthenticated, searchParams) => {
  const [results, setResults] = useState([])
  const [filteredResults, setFilteredResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedResult, setSelectedResult] = useState(null)

  // Load user results
  useEffect(() => {
    loadUserResults()
  }, [user, isAuthenticated])

  // Apply filters when results, filter, or search term changes
  useEffect(() => {
    applyFilters()
  }, [results, filter, searchTerm])

  // Check for specific result from URL params
  useEffect(() => {
    const resultId = searchParams.get('id')
    if (resultId && results.length > 0) {
      const specificResult = results.find(r => r.id === resultId)
      if (specificResult) {
        setSelectedResult(specificResult)
      }
    }
  }, [results, searchParams])

  const loadUserResults = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (!isAuthenticated || !user) {
        setError('You must be logged in to view your results.')
        setLoading(false)
        return
      }

      // Load data from localStorage
      const uploadHistory = JSON.parse(localStorage.getItem('userUploadHistory') || '[]')
      const liveHistory = JSON.parse(localStorage.getItem('detectionHistory') || '[]')
      const notificationHistory = JSON.parse(localStorage.getItem('accident_notifications') || '[]')

      const userResults = []

      // Process upload results
      uploadHistory.forEach(item => {
        if (item.user === user.username || item.analysis_type === 'user_upload') {
          userResults.push({
            ...item,
            source: 'upload',
            type: item.accident_detected ? 'accident' : 'safe',
            id: item.id || generateId()
          })
        }
      })

      // Process live detection results
      liveHistory.forEach(item => {
        if (item.analysis_type === 'live' || item.detection_source === 'live_camera') {
          userResults.push({
            ...item,
            source: 'live',
            type: item.accident_detected ? 'accident' : 'safe',
            id: item.id || generateId()
          })
        }
      })

      // Process notification results
      notificationHistory.forEach(item => {
        if (item.user?.username === user.username && item.result) {
          const existingResult = userResults.find(r => 
            Math.abs(new Date(r.timestamp) - new Date(item.timestamp)) < 60000
          )
          
          if (!existingResult) {
            userResults.push({
              ...item.result,
              id: item.id || generateId(),
              timestamp: item.timestamp,
              source: item.source === 'live' ? 'live' : 'upload',
