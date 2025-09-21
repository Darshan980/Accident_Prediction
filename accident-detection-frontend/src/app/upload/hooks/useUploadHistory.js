// app/upload/hooks/useUploadHistory.js
import { useState, useEffect } from 'react'
import { MAX_HISTORY_ITEMS, MAX_VISIBLE_HISTORY, MAX_ALERTS } from '../utils/constants'
import notificationService from '../../lib/notificationService'

export const useUploadHistory = (user) => {
  const [uploadHistory, setUploadHistory] = useState([])

  const loadUploadHistory = () => {
    try {
      const history = JSON.parse(localStorage.getItem('userUploadHistory') || '[]')
      setUploadHistory(history.slice(0, MAX_VISIBLE_HISTORY))
    } catch (error) {
      console.error('Error loading upload history:', error)
    }
  }

  const saveToHistory = (result, selectedFile) => {
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
      const updatedHistory = [historyItem, ...existingHistory].slice(0, MAX_HISTORY_ITEMS)
      
      localStorage.setItem('userUploadHistory', JSON.stringify(updatedHistory))
      setUploadHistory(updatedHistory.slice(0, MAX_VISIBLE_HISTORY))
      
      // Trigger notification if accident detected
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
      const trimmedAlerts = existingAlerts.slice(0, MAX_ALERTS)
      
      localStorage.setItem('userAlertHistory', JSON.stringify(trimmedAlerts))
      
      return true
    } catch (error) {
      console.error('Failed to trigger notification alert:', error)
      return false
    }
  }

  useEffect(() => {
    loadUploadHistory()
  }, [])

  return {
    uploadHistory,
    saveToHistory,
    loadUploadHistory
  }
}
