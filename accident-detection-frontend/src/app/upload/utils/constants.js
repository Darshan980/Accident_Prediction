//utils/constants.js
export const ACCEPTED_FILE_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png', 
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/avi': '.avi',
  'video/mov': '.mov',
  'video/quicktime': '.mov'
}

export const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB
export const MAX_HISTORY_ITEMS = 50
export const MAX_VISIBLE_HISTORY = 10
export const MAX_ALERTS = 25

export const API_STATUS = {
  CHECKING: 'checking',
  READY: 'ready',
  OFFLINE: 'offline',
  MODEL_NOT_LOADED: 'model_not_loaded'
}
