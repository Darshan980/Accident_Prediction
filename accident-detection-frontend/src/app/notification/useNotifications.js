import { useState, useEffect } from 'react';
import { NOTIFICATION_PERMISSION } from './constants';

export const useNotifications = () => {
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notifications');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        showDesktopNotification(
          'Notifications Enabled', 
          'You will now receive accident detection alerts'
        );
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  };

  const showDesktopNotification = (title, body, options = {}) => {
    if (notificationPermission !== 'granted') {
      console.warn('Desktop notifications not permitted');
      return null;
    }

    try {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        requireInteraction: true,
        tag: 'accident-detection',
        ...options
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-close after 10 seconds
      setTimeout(() => {
        notification.close();
      }, 10000);

      return notification;
    } catch (error) {
      console.error('Failed to show desktop notification:', error);
      return null;
    }
  };

  return {
    notificationPermission,
    notificationsEnabled,
    requestNotificationPermission,
    showDesktopNotification
  };
};
