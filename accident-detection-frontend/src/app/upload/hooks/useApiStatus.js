// app/upload/hooks/useApiStatus.js
import { useState, useEffect } from 'react'
import { apiClient } from '../../lib/api'
import { API_STATUS } from '../utils/constants'

export const useApiStatus = () => {
  const [apiStatus, setApiStatus] = useState(API_STATUS.CHECKING)
  const [error, setError] = useState(null)

  const checkApiHealth = async () => {
    try {
      const health = await apiClient.healthCheck()
      if (health.fallback) {
        setApiStatus(API_STATUS.OFFLINE)
        setError('Backend server is not running. Please start the Python backend server on http://localhost:8000')
      } else {
        setApiStatus(health.model_loaded ? API_STATUS.READY : API_STATUS.MODEL_NOT_LOADED)
        if (!health.model_loaded) {
          setError('AI model is not loaded on the backend. Please check the server logs.')
        } else {
          setError(null)
        }
      }
    } catch (error) {
      console.error('API health check failed:', error)
      setApiStatus(API_STATUS.OFFLINE)
      setError('Cannot connect to backend server. Please ensure the Python backend is running on http://localhost:8000')
    }
  }

  useEffect(() => {
    checkApiHealth()
  }, [])

  return {
    apiStatus,
    error,
    checkApiHealth
  }
}
