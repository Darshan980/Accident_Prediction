// app/dashboard/hooks/useDashboardData.js
import { useState, useEffect } from 'react';
import { generateSampleData } from '../utils/sampleData';
import { calculateStatsFromLogs } from '../utils/statsCalculator';

const API_BASE_URL = 'https://accident-prediction-7i4e.onrender.com';

export const useDashboardData = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(null);

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
    try {
      const token = localStorage.getItem('token');
      
      if (token) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        try {
          const response = await fetch(`${API_BASE_URL}/api/logs?limit=100`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            signal: controller.signal,
            mode: 'cors'
          });

          clearTimeout(timeoutId);
          
          if (response.ok) {
            const rawResponseText = await response.text();
            let apiResponse;
            
            try {
              apiResponse = JSON.parse(rawResponseText);
            } catch (jsonError) {
              throw new Error(`Invalid JSON response: ${jsonError.message}`);
            }

            let logsData = extractLogsFromResponse(apiResponse);
            const updatedData = applyLocalStatusUpdates(logsData);
            setLogs(updatedData);
            setError(null);
            return;
            
          } else {
            const errorText = await response.text();
            throw new Error(`API returned ${response.status}: ${response.statusText}`);
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            throw new Error('Request timeout');
          }
          throw fetchError;
        }
      } else {
        throw new Error('No authentication token available');
      }
    } catch (err) {
      // Fallback to sample data
      const sampleData = generateSampleData();
      const updatedSampleData = applyLocalStatusUpdates(sampleData);
      setLogs(updatedSampleData);
    }
  };

  const extractLogsFromResponse = (apiResponse) => {
    if (Array.isArray(apiResponse)) {
      return apiResponse;
    } else if (apiResponse && Array.isArray(apiResponse.logs)) {
      return apiResponse.logs;
    } else if (apiResponse && typeof apiResponse === 'object') {
      const possibleArrayKeys = ['data', 'results', 'items', 'records'];
      for (const key of possibleArrayKeys) {
        if (Array.isArray(apiResponse[key])) {
          return apiResponse[key];
        }
      }
      throw new Error('No logs array found in API response');
    } else {
      throw new Error('Unexpected API response structure');
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
      const token = localStorage.getItem('token');
      
      // Try to update via API first
      if (token) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/logs/${logId}/status`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
          });
          
          if (!response.ok) {
            throw new Error('API update failed');
          }
        } catch (apiError) {
          // Continue with local update if API fails
        }
      }
      
      // Always save locally for persistence
      saveStatusUpdate(logId, newStatus);
      
      // Update local state
      setLogs(prevLogs => 
        prevLogs.map(log => 
          log.id === logId ? { ...log, status: newStatus } : log
        )
      );
      
    } catch (error) {
      setError(`Failed to update status: ${error.message}`);
    } finally {
      setStatusUpdateLoading(null);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    await loadDashboardData();
    setLoading(false);
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
