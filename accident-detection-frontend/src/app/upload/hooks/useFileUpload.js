// app/upload/hooks/useFileUpload.js
import { useState, useCallback } from 'react'
import { apiClient } from '../../lib/api'
import notificationService from '../../lib/notificationService'
import { validateFile, createFilePreview } from '../utils/fileUtils'
import { API_STATUS } from '../utils/constants'

export const useFileUpload = (apiStatus, user, saveToHistory) => {
  const [selectedFile, setSelectedFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [error, setError] = useState(null)

  const processSelectedFile = useCallback(async (file) => {
    if (!file) return

    const validation = validateFile(file)
    if (!validation.valid) {
      setError(validation.errors[0])
      return
    }
    
    console.log('Processing file:', file)
    
    setSelectedFile(file)
    setAnalysisResult(null)
    setError(null)
    setUploadProgress(0)
    
    // Create preview for image files
    try {
      const preview = await createFilePreview(file)
      setFilePreview(preview)
    } catch (error) {
      console.error('Error creating preview:', error)
      setFilePreview(null)
    }
  }, [])

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files[0]
    processSelectedFile(file)
  }, [processSelectedFile])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    processSelectedFile(file)
  }, [processSelectedFile])

  const handleUpload = async () => {
    if (!selectedFile || !user) return

    if (apiStatus !== API_STATUS.READY) {
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
      saveToHistory(result, selectedFile)
      
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

  const clearFile = useCallback(() => {
    setSelectedFile(null)
    setFilePreview(null)
    setAnalysisResult(null)
    setError(null)
    setUploadProgress(0)
    const fileInput = document.querySelector('input[type="file"]')
    if (fileInput) fileInput.value = ''
  }, [])

  return {
    selectedFile,
    filePreview,
    isDragging,
    isUploading,
    uploadProgress,
    analysisResult,
    error,
    handleFileSelect,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleUpload,
    clearFile,
    setError
  }
}
