// app/dashboard/hooks/useDashboardData.js - Updated version
import { useState, useEffect } from 'react';
import AdminDataService from '../services/adminDataService';
import { generateSampleData } from '../utils/sampleData';
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

  const loadDashboardData = async () => {
    setLoading(true);
    
    try {
      console.log('Loading admin dashboard data...');
      
      // Try to fetch all user logs via the admin data service
      const allLogs = await dataService.fetchAllUserLogs();
      
      // Apply any local status updates
      const updatedData = applyLocalStatusUpdates(allLogs);
      
      setLogs(updatedData);
      setError(null);
      
      console.log(`Successfully loaded ${updatedData.length} logs for admin dashboard`);
      
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
      setError(err.message);
      
      // Fallback to sample data if API fails
      console.log('Falling back to sample data...');
      const sampleData = generateSampleData(50); // Generate more sample data for admin view
      const updatedSampleData = applyLocalStatusUpdates(sampleData);
      setLogs(updatedSampleData);
    } finally {
      setLoading(false);
    }
  };

  const applyLocalStatusUpdates = (data) => {
    const localUpdates = JSON.parse(localStorage.getItem('logStatusUpdates') || '{}');
    
    return data.map(log => ({
      ...log,
      status: localUpdates[log.id] || log.status
    }));
  };

  const saveStatusUpdate = (logId, newStatus) => {
    const localUpdates = JSON.parse(localStorage.getItem('logStatusUpdates') || '{}');
    localUpdates[logId] = newStatus;
    localStorage.setItem('logStatusUpdates', JSON.stringify(localUpdates));
  };

  const updateLogStatus = async (logId, newStatus) => {
    setStatusUpdateLoading(logId);
    
    try {
      console.log(`Updating status for log ${logId} to ${newStatus}`);
      
      // Try to update via API
      const apiUpdateSuccessful = await dataService.updateLogStatus(logId, newStatus);
      
      if (apiUpdateSuccessful) {
        console.log('Status updated successfully via API');
      } else {
        console.log('API update failed, saving locally only');
      }
      
      // Always save locally for persistence
      saveStatusUpdate(logId, newStatus);
      
      // Update local state immediately
      setLogs(prevLogs => 
        prevLogs.map(log => 
          log.id === logId ? { ...log, status: newStatus } : log
        )
      );
      
    } catch (error) {
      console.error('Status update error:', error);
      setError(`Failed to update status: ${error.message}`);
      
      // Still try to update locally
      saveStatusUpdate(logId, newStatus);
      setLogs(prevLogs => 
        prevLogs.map(log => 
          log.id === logId ? { ...log, status: newStatus } : log
        )
      );
    } finally {
      setStatusUpdateLoading(null);
    }
  };

  const refreshData = async () => {
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
