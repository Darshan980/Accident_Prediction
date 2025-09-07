// Fixed Notification Service - Assignment Error Resolved
// src/app/lib/notificationService.js

class NotificationService {
  constructor() {
    this.listeners = new Set();
    this.isInitialized = false;
    this.globalSystemAvailable = false;
  }

  // Initialize the notification service
  init() {
    if (this.isInitialized) return;
    
    // Request notification permission
    this.requestPermission();
    
    // Listen for storage events (cross-tab communication)
    window.addEventListener('storage', this.handleStorageEvent.bind(this));
    
    this.isInitialized = true;
    console.log('NotificationService initialized');
  }

  // Request browser notification permission
  async requestPermission() {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
        return permission === 'granted';
      }
      return Notification.permission === 'granted';
    }
    return false;
  }

  // Add a listener for notifications
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Remove a listener
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  // Notify all listeners
  notifyListeners(data) {
    this.listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  // Handle storage events for cross-tab communication
  handleStorageEvent(event) {
    if (event.key === 'accident_notification') {
      try {
        const data = JSON.parse(event.newValue);
        this.notifyListeners(data);
      } catch (error) {
        console.error('Error parsing storage notification:', error);
      }
    }
  }

  // FIXED: Trigger global notification system if available
  triggerGlobalNotification(result, sourceType) {
    if (this.globalSystemAvailable && window.GlobalNotificationSystem && result.accident_detected) {
      try {
        // FIXED: Create local variables instead of reassigning parameters
        const notificationSource = sourceType === 'live' ? 'Live Detection' : 'File Upload';
        const locationInfo = result.filename || 'Unknown Location';
        const currentUser = this.getCurrentUser();
        
        // FIXED: Build alert data object properly
        const alertData = {
          confidence: result.confidence,
          accident_detected: result.accident_detected,
          source: notificationSource,
          location: locationInfo,
          predicted_class: result.predicted_class,
          filename: result.filename,
          processing_time: result.processing_time,
          analysis_type: sourceType === 'live' ? 'Live Analysis' : 'Upload Analysis',
          content_type: result.content_type,
          file_size: result.file_size,
          frame_id: result.frame_id || `NOTIF_${Date.now()}`,
          user: currentUser?.username || 'user'
        };
        
        window.GlobalNotificationSystem.triggerAlert(alertData);
        
        console.log('Global notification system triggered successfully');
        return true;
      } catch (error) {
        console.error('Failed to trigger global notification system:', error);
        return false;
      }
    }
    return false;
  }

  // Create an accident detection notification (ONLY for actual accidents)
  createAccidentNotification(result, source = 'upload') {
    // ONLY create notifications for actual accidents
    if (!result.accident_detected) {
      console.log('[NOTIFICATION] Skipping notification - no accident detected');
      return null;
    }

    const notification = {
      id: `accident-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type: 'accident_detection',
      source: source, // 'upload', 'live', 'admin_upload'
      result: result,
      user: this.getCurrentUser(),
      severity: this.calculateSeverity(result),
      redirectUrl: this.getRedirectUrl(result, source)
    };

    console.log('[NOTIFICATION] Creating accident notification:', notification);

    // Store in localStorage for persistence
    this.storeNotification(notification);

    // Show browser notification (FIXED - no actions)
    this.showBrowserNotification(notification);

    // Notify listeners
    this.notifyListeners(notification);

    // Auto-redirect if accident detected
    if (result.accident_detected && notification.redirectUrl) {
      this.scheduleRedirect(notification);
    }

    // Trigger global notification system if available and accident detected
    if (result.accident_detected) {
      this.triggerGlobalNotification(result, source);
    }

    return notification;
  }

  // Calculate severity based on confidence and result
  calculateSeverity(result) {
    if (!result.accident_detected) return 'info';
    
    const confidence = result.confidence || 0;
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  }

  // Get redirect URL based on result and source
  getRedirectUrl(result, source) {
    const user = this.getCurrentUser();
    const isAdmin = user?.role === 'admin' || user?.admin_level;

    if (result.accident_detected) {
      // Redirect to results page with the result data
      const params = new URLSearchParams({
        source: source,
        confidence: result.confidence,
        timestamp: new Date().toISOString(),
        filename: result.filename || 'unknown'
      });

      if (isAdmin) {
        return `/admin/results?${params.toString()}`;
      } else {
        return `/results?${params.toString()}`;
      }
    }

    return null;
  }

  // Get current user from storage
  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr && userStr !== 'null') {
        return JSON.parse(userStr);
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
    return null;
  }

  // Store notification in localStorage
  storeNotification(notification) {
    try {
      // Get existing notifications
      const existing = JSON.parse(localStorage.getItem('accident_notifications') || '[]');
      
      // Add new notification at the beginning
      existing.unshift(notification);
      
      // Keep only last 50 notifications
      const trimmed = existing.slice(0, 50);
      
      // Store back
      localStorage.setItem('accident_notifications', JSON.stringify(trimmed));
      
      // Also trigger storage event for cross-tab communication
      localStorage.setItem('accident_notification', JSON.stringify(notification));
      
    } catch (error) {
      console.error('Error storing notification:', error);
    }
  }

  // FIXED: Show browser notification without actions
  showBrowserNotification(notification) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      console.log('Notification permission not granted or not available');
      return;
    }

    const { result, source, severity } = notification;
    
    let title, body, icon;
    
    if (result.accident_detected) {
      title = 'Accident Detected!';
      body = `${source === 'live' ? 'Live detection' : 'File analysis'} found an accident with ${(result.confidence * 100).toFixed(1)}% confidence`;
      icon = '/accident-icon.png';
    } else {
      title = 'Analysis Complete';
      body = `${source === 'live' ? 'Live detection' : 'File analysis'} completed - no accident detected`;
      icon = '/safe-icon.png';
    }

    try {
      // Create notification with safe options only (NO ACTIONS)
      const browserNotification = new Notification(title, {
        body: body,
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: notification.id,
        requireInteraction: result.accident_detected, // Keep accident notifications visible
        silent: false,
        // REMOVED: actions property - this was causing the error
        // Actions are only supported for persistent notifications via Service Worker
      });

      // Handle notification click
      browserNotification.onclick = () => {
        console.log('Notification clicked');
        if (notification.redirectUrl) {
          window.focus();
          window.location.href = notification.redirectUrl;
        }
        browserNotification.close();
      };

      // Handle notification errors
      browserNotification.onerror = (error) => {
        console.error('Notification error:', error);
      };

      // Auto-close non-accident notifications after 8 seconds
      if (!result.accident_detected) {
        setTimeout(() => {
          try {
            browserNotification.close();
          } catch (closeError) {
            console.warn('Failed to close notification:', closeError);
          }
        }, 8000);
      } else {
        // Auto-close accident notifications after 15 seconds
        setTimeout(() => {
          try {
            browserNotification.close();
          } catch (closeError) {
            console.warn('Failed to close notification:', closeError);
          }
        }, 15000);
      }

      console.log('Browser notification shown successfully');
      return browserNotification;

    } catch (error) {
      console.error('Failed to show browser notification:', error);
      return null;
    }
  }

  // Schedule redirect for accident detections
  scheduleRedirect(notification, delay = 3000) {
    if (!notification.result.accident_detected || !notification.redirectUrl) {
      return;
    }

    // Show countdown notification
    this.showRedirectCountdown(notification, delay);

    // Schedule the redirect
    setTimeout(() => {
      if (confirm(`Accident detected! Redirect to results page?`)) {
        window.location.href = notification.redirectUrl;
      }
    }, delay);
  }

  // Show redirect countdown
  showRedirectCountdown(notification, delay) {
    const countdownElement = document.createElement('div');
    countdownElement.id = 'accident-redirect-countdown';
    countdownElement.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #dc3545;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      max-width: 300px;
    `;

    const seconds = Math.ceil(delay / 1000);
    let remaining = seconds;

    const updateCountdown = () => {
      countdownElement.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 8px;">Accident Detected!</div>
        <div style="margin-bottom: 8px;">Redirecting to results in ${remaining}s...</div>
        <div style="display: flex; gap: 8px;">
          <button onclick="window.location.href='${notification.redirectUrl}'" 
                  style="background: white; color: #dc3545; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">
            View Now
          </button>
          <button onclick="this.parentElement.parentElement.remove()" 
                  style="background: rgba(255,255,255,0.2); color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">
            Cancel
          </button>
        </div>
      `;
    };

    updateCountdown();
    document.body.appendChild(countdownElement);

    const interval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(interval);
        countdownElement.remove();
      } else {
        updateCountdown();
      }
    }, 1000);

    // Auto-remove after delay
    setTimeout(() => {
      if (countdownElement.parentElement) {
        countdownElement.remove();
      }
    }, delay + 1000);
  }

  // Get stored notifications
  getStoredNotifications() {
    try {
      return JSON.parse(localStorage.getItem('accident_notifications') || '[]');
    } catch (error) {
      console.error('Error getting stored notifications:', error);
      return [];
    }
  }

  // Clear old notifications
  clearOldNotifications(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days
    try {
      const notifications = this.getStoredNotifications();
      const cutoff = new Date(Date.now() - maxAge);
      
      const filtered = notifications.filter(notification => 
        new Date(notification.timestamp) > cutoff
      );
      
      localStorage.setItem('accident_notifications', JSON.stringify(filtered));
      
      return notifications.length - filtered.length; // Return number of cleared notifications
    } catch (error) {
      console.error('Error clearing old notifications:', error);
      return 0;
    }
  }

  // Enhanced alert sound with better error handling
  playAlertSound(type = 'accident') {
    try {
      // Create audio context (requires user interaction in modern browsers)
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Resume audio context if suspended
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const createBeep = (frequency, startTime, duration) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, startTime);
        
        gainNode.gain.setValueAtTime(0.2, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };
      
      if (type === 'accident') {
        // Urgent alert sound - 3 beeps with increasing frequency
        createBeep(800, audioContext.currentTime, 0.2);
        createBeep(1000, audioContext.currentTime + 0.3, 0.2);
        createBeep(1200, audioContext.currentTime + 0.6, 0.2);
      } else {
        // Gentle completion sound
        createBeep(600, audioContext.currentTime, 0.15);
        createBeep(800, audioContext.currentTime + 0.2, 0.15);
      }

      console.log('Alert sound played successfully');
    } catch (error) {
      console.warn('Could not play alert sound:', error);
    }
  }

  // Enhanced integration with Global Notification System
  integrateWithGlobalSystem() {
    if (window.GlobalNotificationSystem && window.GlobalNotificationSystem.triggerAlert) {
      console.log('Integrating with Global Notification System');
      this.globalSystemAvailable = true;
    } else {
      console.warn('Global Notification System not found - notifications will work independently');
      this.globalSystemAvailable = false;
    }
  }

  // Create notification for live detection
  notifyLiveDetection(result) {
    return this.createAccidentNotification(result, 'live');
  }

  // Create notification for file upload
  notifyUploadResult(result) {
    return this.createAccidentNotification(result, 'upload');
  }

  // Create notification for admin upload
  notifyAdminUpload(result) {
    return this.createAccidentNotification(result, 'admin_upload');
  }
}

// Create singleton instance
const notificationService = new NotificationService();

// Auto-initialize when imported
if (typeof window !== 'undefined') {
  // Initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      notificationService.init();
      // Try to integrate with global system after a short delay
      setTimeout(() => {
        notificationService.integrateWithGlobalSystem();
      }, 1000);
    });
  } else {
    notificationService.init();
    // Try to integrate with global system
    setTimeout(() => {
      notificationService.integrateWithGlobalSystem();
    }, 1000);
  }
}

export default notificationService;