// Enhanced Global Notification System - Fixed Assignment Error
// This addresses the TypeError in showModalAlert method
class GlobalNotificationManager {
  constructor() {
    this.audioContext = null;
    this.alertHistory = [];
    this.isEnabled = true;
    this.lastAlertTime = 0;
    this.cooldownPeriod = 5000; // 5 seconds between alerts
    this.init();
  }

  init() {
    try {
      // Initialize audio context with user gesture handling
      this.initAudioContext();
      console.log('Audio context prepared');
    } catch (error) {
      console.warn('Audio not available:', error);
    }
    
    // Load existing alert history from localStorage
    this.loadAlertHistory();
    
    // Make globally available
    window.GlobalNotificationSystem = this;
    console.log('GlobalNotificationSystem initialized');

    // Auto-request notification permission on user interaction
    this.setupPermissionRequest();
  }

  // Initialize audio context (requires user gesture)
  initAudioContext() {
    // Don't create AudioContext immediately to avoid Chrome warnings
    // It will be created on first user interaction
    document.addEventListener('click', () => {
      if (!this.audioContext) {
        try {
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
          console.log('Audio context initialized on user interaction');
        } catch (error) {
          console.warn('Audio context initialization failed:', error);
        }
      }
    }, { once: true });
  }

  // Setup automatic permission request
  setupPermissionRequest() {
    if ('Notification' in window && Notification.permission === 'default') {
      // Request permission on first user interaction
      const requestOnInteraction = async () => {
        await this.requestPermission();
        document.removeEventListener('click', requestOnInteraction);
      };
      document.addEventListener('click', requestOnInteraction, { once: true });
    }
  }

  // Load alert history from localStorage with error handling
  loadAlertHistory() {
    try {
      const stored = localStorage.getItem('notificationAlerts');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate the data structure
        if (Array.isArray(parsed)) {
          this.alertHistory = parsed;
          console.log('Loaded alert history:', this.alertHistory.length, 'alerts');
        } else {
          console.warn('Invalid alert history format, resetting');
          this.alertHistory = [];
        }
      }
    } catch (error) {
      console.error('Failed to load alert history:', error);
      this.alertHistory = [];
    }
  }

  // Save alert history to localStorage with error handling
  saveAlertHistory() {
    try {
      localStorage.setItem('notificationAlerts', JSON.stringify(this.alertHistory));
      console.log('Alert history saved:', this.alertHistory.length, 'alerts');
      
      // Dispatch custom event for cross-tab synchronization
      window.dispatchEvent(new CustomEvent('alertHistoryUpdated', {
        detail: { count: this.alertHistory.length }
      }));
      
    } catch (error) {
      console.error('Failed to save alert history:', error);
    }
  }

  // Add alert to history with enhanced data validation
  addAlertToHistory(alertData) {
    try {
      // Validate required fields
      if (!alertData || typeof alertData.confidence !== 'number') {
        console.error('Invalid alert data provided');
        return null;
      }

      const historyItem = {
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        type: alertData.accident_detected ? 'accident' : 'detection',
        confidence: Math.max(0, Math.min(1, alertData.confidence)), // Clamp to 0-1
        source: alertData.source || alertData.location || 'Unknown',
        filename: alertData.filename || 'N/A',
        predicted_class: alertData.predicted_class || 'N/A',
        analysis_type: alertData.analysis_type || 'Unknown',
        processing_time: alertData.processing_time || 0,
        acknowledged: false,
        dismissed: false,
        title: alertData.accident_detected ? 'ACCIDENT DETECTED!' : 'DETECTION ALERT',
        description: `Confidence: ${(alertData.confidence * 100).toFixed(1)}% at ${alertData.source || alertData.location || 'Unknown'}`,
        severity: alertData.accident_detected && alertData.confidence > 0.7 ? 'high' : 'medium',
        // Additional metadata
        frame_id: alertData.frame_id,
        content_type: alertData.content_type,
        file_size: alertData.file_size,
        user: alertData.user || 'system'
      }

      // Add to beginning of array
      this.alertHistory.unshift(historyItem);
      
      // Keep only last 100 alerts to prevent memory issues
      this.alertHistory = this.alertHistory.slice(0, 100);
      
      // Save to localStorage
      this.saveAlertHistory();
      
      console.log('Alert added to history:', historyItem.id);
      return historyItem;
    } catch (error) {
      console.error('Failed to add alert to history:', error);
      return null;
    }
  }

  // Enhanced alarm sound with better error handling
  playAlarmSound() {
    if (!this.audioContext) {
      console.warn('Audio context not available');
      return;
    }

    try {
      // Resume audio context if suspended (Chrome autoplay policy)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      // Play 3 beeps with different frequencies for urgency
      const frequencies = [800, 1000, 1200];
      
      frequencies.forEach((freq, i) => {
        setTimeout(() => {
          try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.3);
          } catch (beepError) {
            console.error('Failed to play beep', i + 1, beepError);
          }
        }, i * 400);
      });
      
      console.log('Alarm sound played');
    } catch (error) {
      console.error('Failed to play alarm:', error);
    }
  }

  // Fixed desktop notification without actions property
  showDesktopNotification(title, body, options = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        // Create notification with safe options only
        const safeOptions = {
          body: body,
          icon: options.icon || '/favicon.ico',
          badge: options.badge || '/favicon.ico',
          requireInteraction: true,
          tag: 'accident-alert',
          silent: false,
          // Remove any unsupported properties
          ...options
        };

        // Explicitly remove actions if present (causes the error)
        delete safeOptions.actions;
        delete safeOptions.data; // Also remove data as it can cause issues

        const notification = new Notification(title, safeOptions);
        
        notification.onclick = () => {
          window.focus();
          notification.close();
          // Show details modal if available
          this.showNotificationDetails(options.alertData);
        };

        notification.onerror = (error) => {
          console.error('Notification error:', error);
        };

        // Auto-close after 8 seconds
        setTimeout(() => {
          try {
            notification.close();
          } catch (closeError) {
            console.warn('Failed to close notification:', closeError);
          }
        }, 8000);
        
        console.log('Desktop notification shown successfully');
        return notification;
      } catch (error) {
        console.error('Failed to show desktop notification:', error);
        return null;
      }
    } else {
      console.log('Desktop notifications not available or not permitted');
      return null;
    }
  }

  // Show notification details modal
  showNotificationDetails(alertData) {
    if (alertData) {
      // Find the alert in history or create a temporary one
      const historyItem = this.alertHistory.find(a => 
        a.confidence === alertData.confidence && 
        a.source === alertData.source
      );
      
      if (historyItem) {
        this.showModalAlert(alertData, historyItem);
      }
    }
  }

  // FIXED: Enhanced modal alert with better accessibility - NO PARAMETER REASSIGNMENT
  showModalAlert(alertData, historyItem) {
    // Remove any existing modal
    const existing = document.getElementById('accident-alert-modal');
    if (existing) {
      existing.remove();
    }

    // Create modal overlay with better structure
    const overlay = document.createElement('div');
    overlay.id = 'accident-alert-modal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'modal-title');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(4px);
      animation: fadeIn 0.3s ease-in;
    `;

    const isAccident = alertData.accident_detected;
    const confidencePercent = (alertData.confidence * 100).toFixed(1);

    // Create modal content with better structure
    const modal = document.createElement('div');
    modal.style.cssText = `
      background-color: ${isAccident ? '#dc3545' : '#ff6b35'};
      color: white;
      padding: 40px;
      border-radius: 16px;
      max-width: 600px;
      width: 90%;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      animation: modalBounce 0.5s ease-out;
      position: relative;
      max-height: 80vh;
      overflow-y: auto;
    `;

    // FIXED: Create closeModal function without reassigning parameters
    const closeModalHandler = () => {
      if (document.body.contains(overlay)) {
        overlay.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
          if (document.body.contains(overlay)) {
            document.body.removeChild(overlay);
          }
        }, 300);
      }
    };

    modal.innerHTML = `
      <div style="font-size: 4rem; margin-bottom: 20px;" aria-hidden="true">⚠️</div>
      <h2 id="modal-title" style="margin: 0 0 16px 0; font-size: 2rem; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
        ${isAccident ? 'ACCIDENT DETECTED!' : 'DETECTION ALERT'}
      </h2>
      
      <div style="background-color: rgba(255,255,255,0.1); padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: left;">
        <div style="margin-bottom: 12px;">
          <strong>Confidence:</strong> ${confidencePercent}%
        </div>
        <div style="margin-bottom: 12px;">
          <strong>Source:</strong> ${alertData.source || alertData.location || 'Unknown'}
        </div>
        ${alertData.predicted_class ? `
          <div style="margin-bottom: 12px;">
            <strong>Type:</strong> ${alertData.predicted_class}
          </div>
        ` : ''}
        ${alertData.filename ? `
          <div style="margin-bottom: 12px;">
            <strong>File:</strong> ${alertData.filename}
          </div>
        ` : ''}
        ${alertData.processing_time ? `
          <div style="margin-bottom: 12px;">
            <strong>Processing Time:</strong> ${alertData.processing_time}s
          </div>
        ` : ''}
        <div style="margin-bottom: 0;">
          <strong>Time:</strong> ${new Date().toLocaleTimeString()}
        </div>
      </div>
      
      <div style="display: flex; gap: 12px; justify-content: center; margin-bottom: 20px;">
        <button id="acknowledge-btn" style="
          background-color: rgba(255,255,255,0.2);
          color: white;
          border: 2px solid rgba(255,255,255,0.3);
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: bold;
          backdrop-filter: blur(10px);
          transition: all 0.2s ease;
        " onmouseover="this.style.backgroundColor='rgba(255,255,255,0.3)'" onmouseout="this.style.backgroundColor='rgba(255,255,255,0.2)'">
          ACKNOWLEDGE
        </button>
        <button id="dismiss-btn" style="
          background-color: rgba(255,255,255,0.1);
          color: white;
          border: 2px solid rgba(255,255,255,0.2);
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.2s ease;
        " onmouseover="this.style.backgroundColor='rgba(255,255,255,0.2)'" onmouseout="this.style.backgroundColor='rgba(255,255,255,0.1)'">
          DISMISS
        </button>
      </div>
      
      <div style="font-size: 0.8rem; opacity: 0.7;">
        Auto-closes in 10 seconds
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Add event listeners
    const acknowledgeBtn = modal.querySelector('#acknowledge-btn');
    const dismissBtn = modal.querySelector('#dismiss-btn');

    acknowledgeBtn.addEventListener('click', () => {
      console.log('Alert acknowledged via modal');
      if (historyItem) {
        this.acknowledgeAlert(historyItem.id);
      }
      closeModalHandler();
    });

    dismissBtn.addEventListener('click', () => {
      console.log('Alert dismissed via modal');
      if (historyItem) {
        this.dismissAlert(historyItem.id);
      }
      closeModalHandler();
    });

    // Close on escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeModalHandler();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Close on overlay click (but not modal content)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModalHandler();
      }
    });

    // Auto-close after 10 seconds
    const autoCloseTimer = setTimeout(() => {
      console.log('Modal auto-closed');
      closeModalHandler();
    }, 10000);

    // Clear timer if manually closed by modifying the close handler
    const originalCloseHandler = closeModalHandler;
    const closeModalWithCleanup = () => {
      clearTimeout(autoCloseTimer);
      document.removeEventListener('keydown', handleEscape);
      originalCloseHandler();
    };

    // Update event listeners to use the cleanup version
    acknowledgeBtn.onclick = () => {
      console.log('Alert acknowledged via modal');
      if (historyItem) {
        this.acknowledgeAlert(historyItem.id);
      }
      closeModalWithCleanup();
    };

    dismissBtn.onclick = () => {
      console.log('Alert dismissed via modal');
      if (historyItem) {
        this.dismissAlert(historyItem.id);
      }
      closeModalWithCleanup();
    };

    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeModalWithCleanup();
      }
    };

    // Add CSS animations if not already present
    this.ensureModalStyles();

    console.log('Modal alert shown');
    return overlay;
  }

  // Ensure modal styles are available
  ensureModalStyles() {
    if (!document.getElementById('modal-animations')) {
      const style = document.createElement('style');
      style.id = 'modal-animations';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes modalBounce {
          0% { transform: scale(0.8) translateY(-50px); opacity: 0; }
          50% { transform: scale(1.05) translateY(0); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  // Main trigger method with cooldown and validation
  triggerAlert(alertData) {
    console.log('🚨 GlobalNotificationSystem.triggerAlert called with:', alertData);

    // Check if system is enabled
    if (!this.isEnabled) {
      console.log('⏸️ Notification system is disabled');
      return false;
    }

    // Validate alert data
    if (!alertData || typeof alertData.confidence !== 'number') {
      console.error('❌ Invalid alert data provided');
      return false;
    }

    // Check cooldown period
    const now = Date.now();
    if (now - this.lastAlertTime < this.cooldownPeriod) {
      console.log('⏳ Alert in cooldown period, skipping');
      return false;
    }
    this.lastAlertTime = now;

    try {
      // Add to history first
      const historyItem = this.addAlertToHistory(alertData);
      if (!historyItem) {
        console.error('❌ Failed to add alert to history');
        return false;
      }

      // Play sound alert
      this.playAlarmSound();

      // Show desktop notification (fixed to avoid actions error)
      const title = alertData.accident_detected ? 'ACCIDENT DETECTED!' : 'DETECTION ALERT';
      const body = `Confidence: ${(alertData.confidence * 100).toFixed(1)}% at ${alertData.source || alertData.location || 'Unknown'}`;
      this.showDesktopNotification(title, body, { 
        alertData: alertData,
        historyItem: historyItem 
      });

      // Show modal alert
      this.showModalAlert(alertData, historyItem);

      console.log('✅ All notification alerts triggered successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to trigger notification alerts:', error);
      return false;
    }
  }

  // Utility methods (unchanged but with better error handling)
  getAlertHistory() {
    return [...this.alertHistory]; // Return copy to prevent external modification
  }

  acknowledgeAlert(alertId) {
    try {
      const alert = this.alertHistory.find(a => a.id === alertId);
      if (alert && !alert.acknowledged) {
        alert.acknowledged = true;
        alert.acknowledgedAt = new Date().toISOString();
        this.saveAlertHistory();
        console.log('Alert acknowledged:', alertId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      return false;
    }
  }

  dismissAlert(alertId) {
    try {
      const alert = this.alertHistory.find(a => a.id === alertId);
      if (alert && !alert.dismissed) {
        alert.dismissed = true;
        alert.dismissedAt = new Date().toISOString();
        this.saveAlertHistory();
        console.log('Alert dismissed:', alertId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
      return false;
    }
  }

  clearAllAlerts() {
    try {
      this.alertHistory = [];
      this.saveAlertHistory();
      console.log('All alerts cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear alerts:', error);
      return false;
    }
  }

  getAlertStats() {
    try {
      const total = this.alertHistory.length;
      const accidents = this.alertHistory.filter(a => a.type === 'accident').length;
      const detections = this.alertHistory.filter(a => a.type === 'detection').length;
      const acknowledged = this.alertHistory.filter(a => a.acknowledged).length;
      const dismissed = this.alertHistory.filter(a => a.dismissed).length;
      
      return {
        total,
        accidents,
        detections,
        acknowledged,
        dismissed,
        unhandled: total - acknowledged - dismissed,
        highSeverity: this.alertHistory.filter(a => a.severity === 'high').length
      };
    } catch (error) {
      console.error('Failed to get alert stats:', error);
      return { total: 0, accidents: 0, detections: 0, acknowledged: 0, dismissed: 0, unhandled: 0, highSeverity: 0 };
    }
  }

  // Enhanced permission request
  async requestPermission() {
    if ('Notification' in window) {
      try {
        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          console.log('Notification permission result:', permission);
          
          // Show confirmation notification if granted
          if (permission === 'granted') {
            this.showDesktopNotification(
              'Notifications Enabled', 
              'You will now receive accident detection alerts',
              { icon: '/favicon.ico' }
            );
          }
          
          return permission;
        } else {
          console.log('Notification permission already set:', Notification.permission);
          return Notification.permission;
        }
      } catch (error) {
        console.error('Failed to request notification permission:', error);
        return 'denied';
      }
    } else {
      console.log('Notifications not supported in this browser');
      return 'denied';
    }
  }

  // System control methods
  enable() {
    this.isEnabled = true;
    console.log('Notification system enabled');
  }

  disable() {
    this.isEnabled = false;
    console.log('Notification system disabled');
  }

  isSystemEnabled() {
    return this.isEnabled;
  }
}

// Initialize the system
console.log('Initializing Enhanced GlobalNotificationManager...');
const notificationManager = new GlobalNotificationManager();

// Enhanced utility functions
window.NotificationUtils = {
  getAlertHistory: () => window.GlobalNotificationSystem?.getAlertHistory() || [],
  getAlertStats: () => window.GlobalNotificationSystem?.getAlertStats() || {},
  acknowledgeAlert: (id) => window.GlobalNotificationSystem?.acknowledgeAlert(id) || false,
  dismissAlert: (id) => window.GlobalNotificationSystem?.dismissAlert(id) || false,
  clearAllAlerts: () => window.GlobalNotificationSystem?.clearAllAlerts() || false,
  enableSystem: () => window.GlobalNotificationSystem?.enable(),
  disableSystem: () => window.GlobalNotificationSystem?.disable(),
  isEnabled: () => window.GlobalNotificationSystem?.isSystemEnabled() || false,
  requestPermission: () => window.GlobalNotificationSystem?.requestPermission(),
  testAlert: () => window.GlobalNotificationSystem?.triggerAlert({
    confidence: 0.85,
    accident_detected: true,
    source: 'Test System',
    location: 'Test Location',
    predicted_class: 'accident',
    filename: 'test.jpg',
    processing_time: 1.2,
    analysis_type: 'manual_test'
  })
};

console.log('Enhanced notification system loaded successfully');