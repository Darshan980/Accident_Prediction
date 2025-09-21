// app/upload/utils/fileUtils.js
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } from './constants'

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const isValidFileType = (file) => {
  return Object.keys(ACCEPTED_FILE_TYPES).includes(file.type)
}

export const validateFile = (file) => {
  const errors = []
  
  if (!file) {
    errors.push('No file selected')
    return { valid: false, errors }
  }
  
  if (!isValidFileType(file)) {
    errors.push(`Invalid file type. Please upload: ${Object.values(ACCEPTED_FILE_TYPES).join(', ')}`)
  }
  
  if (file.size > MAX_FILE_SIZE) {
    errors.push('File too large. Maximum size is 25MB for user uploads.')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

export const createFilePreview = (file) => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      resolve(null)
      return
    }
    
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
