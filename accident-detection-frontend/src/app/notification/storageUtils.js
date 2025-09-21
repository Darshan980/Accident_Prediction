import { STORAGE_KEYS } from './constants';

/**
 * Save data to localStorage with error handling
 */
export const saveToStorage = (key, data) => {
  try {
    const serializedData = JSON.stringify(data);
    localStorage.setItem(key, serializedData);
    console.log(`Data saved to ${key}:`, data.length || 'N/A', 'items');
    return true;
  } catch (error) {
    console.error(`Failed to save to ${key}:`, error);
    return false;
  }
};

/**
 * Load data from localStorage with error handling
 */
export const loadFromStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      console.log(`No data found for ${key}, using default`);
      return defaultValue;
    }
    
    const parsed = JSON.parse(item);
    console.log(`Data loaded from ${key}:`, parsed.length || 'N/A', 'items');
    return parsed;
  } catch (error) {
    console.error(`Failed to load from ${key}:`, error);
    return defaultValue;
  }
};

/**
 * Remove data from localStorage
 */
export const removeFromStorage = (key) => {
  try {
    localStorage.removeItem(key);
    console.log(`Data removed from ${key}`);
    return true;
  } catch (error) {
    console.error(`Failed to remove ${key}:`, error);
    return false;
  }
};

/**
 * Clear all notification-related storage
 */
export const clearNotificationStorage = () => {
  const keys = Object.values(STORAGE_KEYS);
  let success = true;
  
  keys.forEach(key => {
    if (!removeFromStorage(key)) {
      success = false;
    }
  });
  
  return success;
};

/**
 * Trigger storage event for cross-tab synchronization
 */
export const triggerStorageEvent = (key, newValue, oldValue = null) => {
  try {
    window.dispatchEvent(new StorageEvent('storage', {
      key,
      newValue: JSON.stringify(newValue),
      oldValue: oldValue ? JSON.stringify(oldValue) : null,
      url: window.location.href
    }));
  } catch (error) {
    console.error('Failed to trigger storage event:', error);
  }
};

/**
 * Validate and clean alert history data
 */
export const validateAlertHistory = (history) => {
  if (!Array.isArray(history)) {
    return [];
  }
  
  return history.filter(alert => {
    return alert && 
           typeof alert === 'object' &&
           alert.id && 
           alert.timestamp &&
           typeof alert.confidence === 'number';
  });
};
