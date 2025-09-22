// app/dashboard/hooks/useDashboardData.js - Real-time fix
import { useState, useEffect } from 'react';
import AdminDataService from '../services/adminDataService';
import { calculateStatsFromLogs } from '../utils/statsCalculator';

export const useDashboardData = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(null);
  const [dataService] = useState(() => new AdminDataService());

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Recalculate stats whenever logs change
  useEffect(() => {
    if (logs.length > 0) {
      const calculatedStats = calculateStatsFromLogs(logs);
      setStats(calculatedStats);
    }
  }, [logs]);

  const ensureAuthentication = async () => {
    // Check if we have auth token - updated to match your useAuth hook
    let token = localStorage.getItem('token') || 
               localStorage.getItem('authToken') || 
               sessionStorage.getItem('token');
    
    if (!token) {
      // Try to get from cookies
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'token' || name === 'authToken') {
          token = value;
          localStorage.setItem('token', token); // Store as 'token' to match useAuth
          break;
        }
      }
    }

    if (!token) {
      // Try to authenticate with the admin service
      try {
        const authResult = await dataService.authenticate();
        if (authResult && authResult.token) {
          localStorage.setItem('token', authResult.token); // Store as 'token'
          token = authResult.token;
        }
      } catch (authError) {
        console.error('Authentication failed:', authError);
        throw new Error('Authentication required. Please log in.');
      }
    }

    return token;
  };

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Loading admin dashboard data...');
      
      // Ensure we're authenticated first
      await ensureAuthentication();
      
      // Try to fetch all user logs via the admin data service
      const allLogs = await dataService.fetchAllUserLogs();
      
      // Validate the response
      if (!allLogs) {
        throw new Error('No response from API');
      }

      // Check if response contains error message
      if (typeof allLogs === 'object' && allLogs.message && allLogs.message.includes('log in')) {
        throw new Error('Authentication expired. Please log in again.');
      }

      // Check if it's an array or has logs property
      let logsData = [];
      if (Array.isArray(allLogs)) {
        logsData = allLogs;
      } else if (allLogs.logs && Array.isArray(allLogs.logs)) {
        logsData = allLogs.logs;
      } else if (allLogs.data && Array.isArray(allLogs.data)) {
        logsData = allLogs.data;
      } else {
        console.warn('Unexpected API response format:', allLogs);
        throw new Error('Invalid data format from API');
      }
      
      // Apply any local status updates
      const updatedData = applyLocalStatusUpdates(logsData);
      
      setLogs(updatedData);
      setError(null);
      
      console.log(`✅ Successfully loaded ${updatedData.length} logs for admin dashboard`);
      
    } catch (err) {
      console.error('❌ Failed to load admin dashboard data:', err);
      
      // Handle authentication errors
      if (err.message.includes('Authentication') || err.message.includes('log in')) {
        setError('Authentication required');
        
        // Clear auth data - updated to match your useAuth hook
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('authToken');
        sessionStorage.clear();
        
        // Redirect to login - FIXED: changed from /auth/admin to /auth
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.location.href = '/auth'; // Changed this line!
          }
        }, 1000);
      } else {
        setError(err.message);
      }
      
    } finally {
      setLoading(false);
    }
  };

  const applyLocalStatusUpdates = (data) => {
    try {
      const localUpdates = JSON.parse(localStorage.getItem('logStatusUpdates') || '{}');
      
      return data.map(log => ({
        ...log,
        status: localUpdates[log.id] || log.status
      }));
    } catch (error) {
      console.error('Error applying local status updates:', error);
      return data;
    }
  };

  const saveStatusUpdate = (logId, newStatus) => {
    try {
      const localUpdates = JSON.parse(localStorage.getItem('logStatusUpdates') || '{}');
      localUpdates[logId] = newStatus;
      localStorage.setItem('logStatusUpdates', JSON.stringify(localUpdates));
    } catch (error) {
      console.error('Error saving status update locally:', error);
    }
  };

  const updateLogStatus = async (logId, newStatus) => {
    setStatusUpdateLoading(logId);
    
    try {
      console.log(`🔄 Updating status for log ${logId} to ${newStatus}`);
      
      // Ensure authentication
      await ensureAuthentication();
      
      // Try to update via API
      const apiUpdateSuccessful = await dataService.updateLogStatus(logId, newStatus);
      
      if (!apiUpdateSuccessful) {
        throw new Error('API update failed');
      }
      
      console.log('✅ Status updated successfully via API');
      
      // Save locally and update state
      saveStatusUpdate(logId, newStatus);
      
      setLogs(prevLogs => 
        prevLogs.map(log => 
          log.id === logId ? { ...log, status: newStatus } : log
        )
      );
      
    } catch (error) {
      console.error('❌ Status update error:', error);
      setError(`Failed to update status: ${error.message}`);
    } finally {
      setStatusUpdateLoading(null);
    }
  };

  const refreshData = async () => {
    console.log('🔄 Refreshing dashboard data...');
    await loadDashboardData();
  };

  return {
    logs,
    stats,
    loading,
    error,
    statusUpdateLoading,
    refreshData,
    updateLogStatus
  };
};
