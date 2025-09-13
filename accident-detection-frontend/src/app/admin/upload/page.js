'use client';
import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle, RefreshCw, Key, User, Shield } from 'lucide-react';

const AdminAuthDebugger = () => {
  const [debugInfo, setDebugInfo] = useState({});
  const [testResults, setTestResults] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState('checking');

  const API_BASE_URL = 'https://accident-prediction-1-mpm0.onrender.com';

  // Get all possible tokens
  const getAllTokens = () => {
    const tokens = {};
    const tokenSources = ['token', 'authToken', 'access_token', 'admin_token'];
    
    tokenSources.forEach(key => {
      const localToken = localStorage.getItem(key);
      const sessionToken = sessionStorage.getItem(key);
      
      if (localToken && localToken !== 'null') {
        tokens[`localStorage.${key}`] = localToken;
      }
      if (sessionToken && sessionToken !== 'null') {
        tokens[`sessionStorage.${key}`] = sessionToken;
      }
    });

    // Check user object
    try {
      const userStr = localStorage.getItem('user');
      if (userStr && userStr !== 'null') {
        const userData = JSON.parse(userStr);
        if (userData.token) {
          tokens['user.token'] = userData.token;
        }
        if (userData.access_token) {
          tokens['user.access_token'] = userData.access_token;
        }
      }
    } catch (e) {
      tokens['user.parse_error'] = e.message;
    }

    // Check admin user object
    try {
      const adminStr = localStorage.getItem('admin') || localStorage.getItem('adminUser');
      if (adminStr && adminStr !== 'null') {
        const adminData = JSON.parse(adminStr);
        if (adminData.token) {
          tokens['admin.token'] = adminData.token;
        }
        if (adminData.access_token) {
          tokens['admin.access_token'] = adminData.access_token;
        }
      }
    } catch (e) {
      tokens['admin.parse_error'] = e.message;
    }

    return tokens;
  };

  // Test endpoint with different tokens
  const testEndpointAuth = async (endpoint, token, tokenSource) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        mode: 'cors',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const result = {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        tokenSource: tokenSource
      };

      if (response.ok) {
        try {
          result.data = await response.json();
        } catch {
          result.data = await response.text();
        }
      } else {
        try {
          result.error = await response.json();
        } catch {
          result.error = await response.text();
        }
      }

      return result;
    } catch (error) {
      return {
        status: 'network_error',
        error: error.message,
        tokenSource: tokenSource
      };
    }
  };

  // Test file upload with token
  const testUploadAuth = async (token, tokenSource) => {
    // Create a small test file
    const testFile = new Blob(['test'], { type: 'text/plain' });
    const formData = new FormData();
    formData.append('file', testFile, 'test.txt');

    try {
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        tokenSource: tokenSource
      };

      if (!response.ok) {
        try {
          result.error = await response.json();
        } catch {
          result.error = await response.text();
        }
      } else {
        try {
          result.data = await response.json();
        } catch {
          result.data = await response.text();
        }
      }

      return result;
    } catch (error) {
      return {
        status: 'network_error',
        error: error.message,
        tokenSource: tokenSource
      };
    }
  };

  // Run comprehensive auth debugging
  const runAuthDebug = async () => {
    setIsLoading(true);
    setAuthStatus('checking');
    
    const tokens = getAllTokens();
    const results = {
      tokenInventory: tokens,
      endpointTests: {},
      uploadTests: {}
    };

    // Test each token against various endpoints
    const testEndpoints = [
      '/auth/me',
      '/auth/admin/me', 
      '/api/dashboard/user/profile',
      '/health'
    ];

    for (const [tokenSource, token] of Object.entries(tokens)) {
      if (token && typeof token === 'string' && token.length > 10) {
        results.endpointTests[tokenSource] = {};
        
        // Test each endpoint
        for (const endpoint of testEndpoints) {
          results.endpointTests[tokenSource][endpoint] = await testEndpointAuth(endpoint, token, tokenSource);
        }

        // Test upload specifically
        results.uploadTests[tokenSource] = await testUploadAuth(token, tokenSource);
      }
    }

    setTestResults(results);
    setDebugInfo(results);
    
    // Determine auth status
    const hasValidAdminAuth = Object.values(results.endpointTests).some(tests => 
      tests['/auth/admin/me']?.ok || tests['/auth/me']?.ok
    );
    
    const hasValidUploadAuth = Object.values(results.uploadTests).some(test => 
      test.ok || test.status === 400 // 400 might be file type error, not auth error
    );

    if (hasValidAdminAuth && hasValidUploadAuth) {
      setAuthStatus('valid');
    } else if (hasValidAdminAuth) {
      setAuthStatus('partial');
    } else {
      setAuthStatus('invalid');
    }

    setIsLoading(false);
  };

  // Component mount
  useEffect(() => {
    runAuthDebug();
  }, []);

  const getStatusIcon = (status) => {
    if (status === 'checking' || isLoading) {
      return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
    }
    switch (status) {
      case 'valid':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'partial':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'invalid':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (ok, status) => {
    if (ok) return 'text-green-600 bg-green-50';
    if (status === 401) return 'text-red-600 bg-red-50';
    if (status === 403) return 'text-orange-600 bg-orange-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Shield className="w-6 h-6" />
          Admin Authentication Debugger
        </h1>
        <p className="text-gray-600">
          Comprehensive diagnosis of your admin authentication issues
        </p>
      </div>

      {/* Overall Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getStatusIcon(authStatus)}
            <span className="font-semibold">Authentication Status:</span>
            <span className={`capitalize ${
              authStatus === 'valid' ? 'text-green-600' : 
              authStatus === 'partial' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {authStatus}
            </span>
          </div>
          <button
            onClick={runAuthDebug}
            disabled={isLoading}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? 'Testing...' : 'Retest'}
          </button>
        </div>
        
        {authStatus === 'invalid' && (
          <div className="text-red-600 text-sm">
            No valid admin authentication found. You may need to log in again as admin.
          </div>
        )}
        {authStatus === 'partial' && (
          <div className="text-yellow-600 text-sm">
            Admin authentication works for some endpoints but not uploads. Token may lack upload permissions.
          </div>
        )}
      </div>

      {/* Token Inventory */}
      {debugInfo.tokenInventory && (
        <div className="mb-6 p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Key className="w-5 h-5" />
            Token Inventory
          </h2>
          <div className="space-y-2">
            {Object.entries(debugInfo.tokenInventory).map(([source, token]) => (
              <div key={source} className="flex items-center gap-2 text-sm font-mono">
                <span className="font-medium min-w-0 flex-1">{source}:</span>
                <span className="text-gray-600 truncate max-w-md">
                  {typeof token === 'string' ? 
                    `${token.substring(0, 20)}...` : 
                    JSON.stringify(token)
                  }
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Endpoint Tests */}
      {testResults.endpointTests && Object.keys(testResults.endpointTests).length > 0 && (
        <div className="mb-6 p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <User className="w-5 h-5" />
            Endpoint Authentication Tests
          </h2>
          <div className="space-y-4">
            {Object.entries(testResults.endpointTests).map(([tokenSource, tests]) => (
              <div key={tokenSource} className="border rounded p-3">
                <h3 className="font-medium mb-2">{tokenSource}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Object.entries(tests).map(([endpoint, result]) => (
                    <div key={endpoint} className={`p-2 rounded text-sm ${getStatusColor(result.ok, result.status)}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-mono">{endpoint}</span>
                        <span className="font-medium">
                          {result.status} {result.statusText}
                        </span>
                      </div>
                      {result.error && (
                        <div className="text-xs mt-1 opacity-75">
                          {typeof result.error === 'object' ? 
                            result.error.detail || JSON.stringify(result.error) : 
                            result.error
                          }
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Tests */}
      {testResults.uploadTests && Object.keys(testResults.uploadTests).length > 0 && (
        <div className="mb-6 p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Upload Authentication Tests (This is your main problem!)
          </h2>
          <div className="space-y-3">
            {Object.entries(testResults.uploadTests).map(([tokenSource, result]) => (
              <div key={tokenSource} className={`p-3 rounded ${getStatusColor(result.ok, result.status)}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{tokenSource}</span>
                  <span className="font-medium">
                    {result.status} {result.statusText}
                  </span>
                </div>
                {result.error && (
                  <div className="text-sm">
                    <strong>Error:</strong> {typeof result.error === 'object' ? 
                      result.error.detail || JSON.stringify(result.error) : 
                      result.error
                    }
                  </div>
                )}
                {result.ok && result.data && (
                  <div className="text-sm">
                    <strong>Success:</strong> Upload authentication works with this token!
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Recommended Solutions</h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <span className="font-medium">1.</span>
            <span>Check if you're logged in as admin - look for tokens with "admin" in the name above</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-medium">2.</span>
            <span>If no admin tokens found, log out and log back in using admin credentials</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-medium">3.</span>
            <span>Check if your backend requires different permissions for admin uploads vs user uploads</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-medium">4.</span>
            <span>Verify your backend's `/api/upload` endpoint accepts admin tokens properly</span>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-white rounded border">
          <h3 className="font-medium mb-2">Quick Fix Commands:</h3>
          <div className="space-y-1 text-xs font-mono bg-gray-100 p-2 rounded">
            <div>// Clear all tokens and re-login as admin:</div>
            <div>localStorage.clear(); sessionStorage.clear();</div>
            <div>// Then navigate to admin login page</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAuthDebugger;
