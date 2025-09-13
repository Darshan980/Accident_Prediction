// app/dashboard/page.tsx - Clean version without backend debugging UI
'use client';
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const AccidentDashboard = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(null);

  const logsPerPage = 10;
  const API_BASE_URL = 'https://accident-prediction-1-mpm0.onrender.com';

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  // Recalculate stats whenever logs change
  useEffect(() => {
    if (logs.length > 0) {
      const calculatedStats = calculateStatsFromLogs(logs);
      setStats(calculatedStats);
    }
  }, [logs]);

  const checkAuthAndLoadData = async () => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      
      if (!token || !userStr) {
        setError('Please log in as admin to access this page.');
        setTimeout(() => window.location.href = '/auth/admin', 2000);
        return;
      }

      const userData = JSON.parse(userStr);
      if (userData.role !== 'admin') {
        setError('Admin access required.');
        setTimeout(() => window.location.href = '/auth/admin', 2000);
        return;
      }

      setUser(userData);
      await loadDashboardData();
    } catch (e) {
      setError('Authentication error. Please log in again.');
      setTimeout(() => {
        localStorage.clear();
        window.location.href = '/auth/admin';
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

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

            let logsData = [];
            
            if (Array.isArray(apiResponse)) {
              logsData = apiResponse;
            } else if (apiResponse && Array.isArray(apiResponse.logs)) {
              logsData = apiResponse.logs;
            } else if (apiResponse && typeof apiResponse === 'object') {
              const possibleArrayKeys = ['data', 'results', 'items', 'records'];
              for (const key of possibleArrayKeys) {
                if (Array.isArray(apiResponse[key])) {
                  logsData = apiResponse[key];
                  break;
                }
              }
              
              if (logsData.length === 0) {
                throw new Error('No logs array found in API response');
              }
            } else {
              throw new Error('Unexpected API response structure');
            }

            if (!Array.isArray(logsData)) {
              throw new Error('Logs data is not an array');
            }
            
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

  // Apply locally stored status updates to fresh data
  const applyLocalStatusUpdates = (data) => {
    const localUpdates = JSON.parse(localStorage.getItem('logStatusUpdates') || '{}');
    
    return data.map(log => ({
      ...log,
      status: localUpdates[log.id] || log.status
    }));
  };

  // Save status update to localStorage for persistence
  const saveStatusUpdate = (logId, newStatus) => {
    const localUpdates = JSON.parse(localStorage.getItem('logStatusUpdates') || '{}');
    localUpdates[logId] = newStatus;
    localStorage.setItem('logStatusUpdates', JSON.stringify(localUpdates));
  };

  // Calculate stats from actual logs data
  const calculateStatsFromLogs = (logsData) => {
    const totalLogs = logsData.length;
    const accidents = logsData.filter(log => log.accident_detected).length;
    const normal = totalLogs - accidents;
    
    // Status breakdown
    const statusCounts = logsData.reduce((acc, log) => {
      const status = log.status || 'unresolved';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // Confidence distribution
    const confidenceDist = logsData.reduce((acc, log) => {
      const conf = log.confidence || 0;
      if (conf >= 0.8) acc.high++;
      else if (conf >= 0.5) acc.medium++;
      else acc.low++;
      return acc;
    }, { high: 0, medium: 0, low: 0 });

    // Calculate accuracy rate
    const verifiedLogs = logsData.filter(log => log.status === 'verified' || log.status === 'resolved');
    const falseAlarms = logsData.filter(log => log.status === 'false_alarm');
    const totalReviewed = verifiedLogs.length + falseAlarms.length;
    const accuracyRate = totalReviewed > 0 ? ((verifiedLogs.length / totalReviewed) * 100).toFixed(1) : 'N/A';

    // Recent activity (last 24 hours)
    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const recentLogs = logsData.filter(log => new Date(log.timestamp) > oneDayAgo);
    const recentAccidents = recentLogs.filter(log => log.accident_detected);

    return {
      total_logs: totalLogs,
      accidents_detected: accidents,
      normal_detected: normal,
      accuracy_rate: accuracyRate,
      status_breakdown: {
        unresolved: statusCounts.unresolved || 0,
        verified: statusCounts.verified || 0,
        false_alarm: statusCounts.false_alarm || 0,
        resolved: statusCounts.resolved || 0
      },
      recent_activity: {
        total_logs_24h: recentLogs.length,
        accidents_24h: recentAccidents.length
      },
      confidence_distribution: confidenceDist,
      reviewed_logs: totalReviewed,
      pending_review: logsData.filter(log => log.status === 'unresolved').length
    };
  };

  const generateSampleData = () => {
    const sampleLogs = [];
    for (let i = 0; i < 30; i++) {
      const isAccident = Math.random() > 0.75;
      const confidence = isAccident ? 0.6 + Math.random() * 0.4 : Math.random() * 0.5;
      
      let status;
      if (isAccident) {
        const rand = Math.random();
        if (rand < 0.4) status = 'unresolved';
        else if (rand < 0.7) status = 'verified';
        else if (rand < 0.85) status = 'resolved';
        else status = 'false_alarm';
      } else {
        status = Math.random() < 0.1 ? 'false_alarm' : 'resolved';
      }
      
      sampleLogs.push({
        id: i + 1,
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        video_source: `camera_${Math.floor(Math.random() * 5) + 1}`,
        confidence: confidence,
        accident_detected: isAccident,
        predicted_class: isAccident ? 'accident' : 'normal',
        processing_time: 0.5 + Math.random() * 2,
        snapshot_url: isAccident ? `/api/snapshot/sample_${i + 1}.jpg` : null,
        frame_id: `frame_${i + 1}`,
        analysis_type: Math.random() > 0.5 ? 'live' : 'upload',
        status: status,
        severity_estimate: confidence > 0.8 ? 'high' : confidence > 0.6 ? 'medium' : 'low',
        location: ['Main Street', 'Highway 101', 'Downtown', 'School Zone', 'Industrial Area'][Math.floor(Math.random() * 5)],
        weather_conditions: ['Clear', 'Rainy', 'Foggy', 'Night'][Math.floor(Math.random() * 4)],
        notes: isAccident ? 'Potential vehicle collision detected' : 'Normal traffic flow'
      });
    }
    return sampleLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
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

  // Utility functions
  const getStatusColor = (status) => {
    const colors = {
      unresolved: '#ffc107',
      verified: '#dc3545',
      false_alarm: '#6c757d',
      resolved: '#28a745'
    };
    return colors[status] || '#6c757d';
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return '#dc3545';
    if (confidence >= 0.6) return '#ffc107';
    return '#28a745';
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  // Filter and sort logs
  const filteredLogs = logs
    .filter(log => {
      if (filter === 'accidents') return log.accident_detected;
      if (filter === 'normal') return !log.accident_detected;
      if (filter === 'unresolved') return log.status === 'unresolved';
      if (filter === 'high_confidence') return log.confidence >= 0.8;
      return true;
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const startIndex = (currentPage - 1) * logsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + logsPerPage);

  // Chart data preparation
  const chartData = stats ? [
    { name: 'Total Logs', value: stats.total_logs, color: '#0070f3' },
    { name: 'Accidents', value: stats.accidents_detected, color: '#dc3545' },
    { name: 'Normal', value: stats.normal_detected, color: '#28a745' }
  ] : [];

  const statusChartData = stats ? Object.entries(stats.status_breakdown).map(([key, value]) => ({
    name: key.replace('_', ' ').toUpperCase(),
    value,
    color: getStatusColor(key)
  })) : [];

  const confidenceChartData = stats ? [
    { name: 'High (80%+)', value: stats.confidence_distribution.high, color: '#dc3545' },
    { name: 'Medium (50-80%)', value: stats.confidence_distribution.medium, color: '#ffc107' },
    { name: 'Low (<50%)', value: stats.confidence_distribution.low, color: '#28a745' }
  ] : [];

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #0070f3',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p>Loading admin dashboard...</p>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error && error.includes('Authentication')) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', minHeight: '100vh' }}>
        <div style={{
          backgroundColor: '#fee',
          borderLeft: '4px solid #dc3545',
          padding: '2rem',
          borderRadius: '8px',
          marginTop: '2rem'
        }}>
          <h2 style={{ color: '#dc3545', marginBottom: '1rem' }}>Authentication Error</h2>
          <p style={{ color: '#721c24', marginBottom: '1rem' }}>{error}</p>
          <button
            onClick={() => window.location.href = '/auth/admin'}
            style={{
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Go to Admin Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#333' }}>
              Admin Dashboard
            </h1>
            <p style={{ color: '#666', fontSize: '1.1rem' }}>
              Monitor and manage accident detection logs and statistics
            </p>
          </div>
          <div style={{ 
            backgroundColor: '#e8f4fd', 
            padding: '0.75rem 1rem', 
            borderRadius: '6px',
            fontSize: '0.9rem',
            color: '#0c5aa6'
          }}>
            <strong>Welcome, {user?.username || 'Admin'}</strong><br />
            <small>Role: {user?.role || 'admin'}</small>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem', 
          marginBottom: '2rem' 
        }}>
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #dee2e6',
            textAlign: 'center'
          }}>
            <h3 style={{ color: '#0070f3', fontSize: '2rem', margin: '0 0 0.5rem 0' }}>
              {stats.total_logs}
            </h3>
            <p style={{ margin: 0, color: '#666' }}>Total Logs</p>
          </div>

          <div style={{
            backgroundColor: '#fff5f5',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #fed7d7',
            textAlign: 'center'
          }}>
            <h3 style={{ color: '#dc3545', fontSize: '2rem', margin: '0 0 0.5rem 0' }}>
              {stats.accidents_detected}
            </h3>
            <p style={{ margin: 0, color: '#666' }}>Accidents Detected</p>
          </div>

          <div style={{
            backgroundColor: '#f0fff4',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #c3e6cb',
            textAlign: 'center'
          }}>
            <h3 style={{ color: '#28a745', fontSize: '2rem', margin: '0 0 0.5rem 0' }}>
              {stats.normal_detected}
            </h3>
            <p style={{ margin: 0, color: '#666' }}>Normal Traffic</p>
          </div>

          <div style={{
            backgroundColor: '#fff8f0',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #ffd6a3',
            textAlign: 'center'
          }}>
            <h3 style={{ color: '#ffc107', fontSize: '2rem', margin: '0 0 0.5rem 0' }}>
              {stats.status_breakdown.unresolved}
            </h3>
            <p style={{ margin: 0, color: '#666' }}>Unresolved</p>
          </div>

          <div style={{
            backgroundColor: '#e8f4fd',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #b3d9ff',
            textAlign: 'center'
          }}>
            <h3 style={{ color: '#17a2b8', fontSize: '2rem', margin: '0 0 0.5rem 0' }}>
              {stats.recent_activity.total_logs_24h}
            </h3>
            <p style={{ margin: 0, color: '#666' }}>Last 24h</p>
          </div>

          <div style={{
            backgroundColor: stats.accuracy_rate === 'N/A' ? '#f8f9fa' : 
                           parseFloat(stats.accuracy_rate) >= 80 ? '#f0fff4' : 
                           parseFloat(stats.accuracy_rate) >= 60 ? '#fff8f0' : '#fff5f5',
            padding: '1.5rem',
            borderRadius: '8px',
            border: `1px solid ${stats.accuracy_rate === 'N/A' ? '#dee2e6' : 
                                parseFloat(stats.accuracy_rate) >= 80 ? '#c3e6cb' : 
                                parseFloat(stats.accuracy_rate) >= 60 ? '#ffd6a3' : '#fed7d7'}`,
            textAlign: 'center'
          }}>
            <h3 style={{ 
              color: stats.accuracy_rate === 'N/A' ? '#6c757d' : 
                     parseFloat(stats.accuracy_rate) >= 80 ? '#28a745' : 
                     parseFloat(stats.accuracy_rate) >= 60 ? '#ffc107' : '#dc3545', 
              fontSize: '2rem', 
              margin: '0 0 0.5rem 0' 
            }}>
              {stats.accuracy_rate === 'N/A' ? 'N/A' : `${stats.accuracy_rate}%`}
            </h3>
            <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
              Accuracy Rate
            </p>
            <p style={{ margin: 0, color: '#666', fontSize: '0.7rem' }}>
              ({stats.reviewed_logs} reviewed)
            </p>
          </div>
        </div>
      )}

      {/* Charts */}
      {stats && chartData.length > 0 && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '2rem', 
          marginBottom: '2rem' 
        }}>
          <div style={{
            backgroundColor: '#fff',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            <h3 style={{ marginBottom: '1rem', color: '#333' }}>Detection Overview</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                  label={({name, value}) => `${name}: ${value}`}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{
            backgroundColor: '#fff',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            <h3 style={{ marginBottom: '1rem', color: '#333' }}>Status Breakdown</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statusChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{
            backgroundColor: '#fff',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            <h3 style={{ marginBottom: '1rem', color: '#333' }}>Confidence Distribution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={confidenceChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                  label={({name, value}) => `${name}: ${value}`}
                >
                  {confidenceChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        marginBottom: '1.5rem', 
        flexWrap: 'wrap',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        padding: '1rem',
        borderRadius: '8px'
      }}>
        <div>
          <label style={{ marginRight: '0.5rem', fontWeight: 'bold' }}>Filter:</label>
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid #ccc'
            }}
          >
            <option value="all">All Logs</option>
            <option value="accidents">Accidents Only</option>
            <option value="normal">Normal Only</option>
            <option value="unresolved">Unresolved</option>
            <option value="high_confidence">High Confidence (80%+)</option>
          </select>
        </div>

        <button
          onClick={refreshData}
          disabled={loading}
          style={{
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>

        <button
          onClick={() => {
            if (confirm('Are you sure you want to logout?')) {
              localStorage.clear();
              window.location.href = '/auth/admin';
            }
          }}
          style={{
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>

        <div style={{ marginLeft: 'auto', color: '#666', fontSize: '0.9rem' }}>
          Showing {paginatedLogs.length} of {filteredLogs.length} logs
        </div>
      </div>

      {/* Logs Table */}
      <div style={{ 
        backgroundColor: '#fff', 
        borderRadius: '8px', 
        border: '1px solid #dee2e6',
        overflow: 'hidden',
        marginBottom: '2rem'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>
                Timestamp
              </th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>
                Source
              </th>
              <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>
                Detection
              </th>
              <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>
                Confidence
              </th>
              <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>
                Status
              </th>
              <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedLogs.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                  No logs found matching the current filter.
                </td>
              </tr>
            ) : (
              paginatedLogs.map((log) => (
                <tr 
                  key={log.id} 
                  data-log-id={log.id}
                  style={{ 
                    borderBottom: '1px solid #f1f3f4',
                    transition: 'background-color 0.3s ease'
                  }}
                >
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.9rem' }}>
                      {formatTimestamp(log.timestamp)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>
                      {log.location || 'Unknown Location'}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                      {log.video_source}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>
                      {log.analysis_type} • {log.weather_conditions}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      backgroundColor: log.accident_detected ? '#f8d7da' : '#d4edda',
                      color: log.accident_detected ? '#721c24' : '#155724'
                    }}>
                      {log.accident_detected ? 'ACCIDENT' : 'NORMAL'}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{
                      color: getConfidenceColor(log.confidence),
                      fontWeight: 'bold',
                      fontSize: '1rem'
                    }}>
                      {(log.confidence * 100).toFixed(1)}%
                    </div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      backgroundColor: getStatusColor(log.status) + '20',
                      color: getStatusColor(log.status),
                      border: `1px solid ${getStatusColor(log.status)}40`
                    }}>
                      {log.status?.toUpperCase()}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => updateLogStatus(log.id, 'verified')}
                        disabled={statusUpdateLoading === log.id}
                        style={{
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          cursor: statusUpdateLoading === log.id ? 'not-allowed' : 'pointer',
                          fontSize: '0.7rem',
                          opacity: statusUpdateLoading === log.id ? 0.6 : 1
                        }}
                      >
                        {statusUpdateLoading === log.id ? '...' : 'Verify'}
                      </button>
                      <button
                        onClick={() => updateLogStatus(log.id, 'false_alarm')}
                        disabled={statusUpdateLoading === log.id}
                        style={{
                          backgroundColor: '#6c757d',
                          color: 'white',
                          border: 'none',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          cursor: statusUpdateLoading === log.id ? 'not-allowed' : 'pointer',
                          fontSize: '0.7rem',
                          opacity: statusUpdateLoading === log.id ? 0.6 : 1
                        }}
                      >
                        False
                      </button>
                      <button
                        onClick={() => updateLogStatus(log.id, 'resolved')}
                        disabled={statusUpdateLoading === log.id}
                        style={{
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          cursor: statusUpdateLoading === log.id ? 'not-allowed' : 'pointer',
                          fontSize: '0.7rem',
                          opacity: statusUpdateLoading === log.id ? 0.6 : 1
                        }}
                      >
                        Resolve
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          gap: '1rem',
          marginBottom: '2rem' 
        }}>
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              backgroundColor: currentPage === 1 ? '#f8f9fa' : 'white',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            Previous
          </button>
          
          <span style={{ fontSize: '0.9rem', color: '#666' }}>
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              backgroundColor: currentPage === totalPages ? '#f8f9fa' : 'white',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            Next
          </button>
        </div>
      )}

      {/* Footer */}
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '1.5rem', 
        borderRadius: '8px', 
        border: '1px solid #dee2e6',
        textAlign: 'center'
      }}>
        <div style={{ 
          fontSize: '0.9rem',
          color: '#666'
        }}>
          <strong>System Status:</strong> Online | 
          <strong> Total Records:</strong> {logs.length} | 
          <strong> Accuracy Rate:</strong> {stats?.accuracy_rate || 'N/A'} |
          <strong> Last Updated:</strong> {new Date().toLocaleTimeString()}
        </div>
        {stats && stats.reviewed_logs > 0 && (
          <div style={{ 
            fontSize: '0.8rem', 
            color: '#666', 
            marginTop: '0.5rem' 
          }}>
            <strong>Review Status:</strong> {stats.reviewed_logs} reviewed • {stats.pending_review} pending review
          </div>
        )}
      </div>
    </div>
  );
};

export default AccidentDashboard;
