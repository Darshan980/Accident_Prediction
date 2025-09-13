'use client';
import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle, RefreshCw, Upload, Bug, User, Shield, FileText, Settings } from 'lucide-react';

const AdminUploadDebugger = () => {
  const [debugInfo, setDebugInfo] = useState({});
  const [testResults, setTestResults] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [uploadResults, setUploadResults] = useState({});
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

  // Test specific endpoints
  const testEndpoint = async (endpoint, token, tokenSource) => {
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

  // Test file upload with different file types
  const testFileUpload = async (token, tokenSource, fileType = 'image') => {
    let testFile, fileName, contentType;
    
    if (fileType === 'image') {
      // Create a minimal PNG file (1x1 pixel)
      const pngData = new Uint8Array([
        137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
        0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0, 144, 119, 83, 222,
        0, 0, 0, 12, 73, 68, 65, 84, 8, 153, 99, 248, 15, 0, 0, 1,
        0, 1, 0, 24, 221, 142, 205, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130
      ]);
      testFile = new Blob([pngData], { type: 'image/png' });
      fileName = 'test.png';
      contentType = 'image/png';
    } else if (fileType === 'text') {
      testFile = new Blob(['test content'], { type: 'text/plain' });
      fileName = 'test.txt';
      contentType = 'text/plain';
    } else if (fileType === 'video') {
      testFile = new Blob(['fake video data'], { type: 'video/mp4' });
      fileName = 'test.mp4';
      contentType = 'video/mp4';
    }

    const formData = new FormData();
    formData.append('file', testFile, fileName);

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
        tokenSource: tokenSource,
        fileType: fileType,
        fileName: fileName,
        contentType: contentType
      };

      try {
        const responseText = await response.text();
        try {
          result.data = JSON.parse(responseText);
        } catch {
          result.data = responseText;
        }
      } catch {
        result.data = 'No response body';
      }

      if (!response.ok) {
        result.error = result.data;
      }

      return result;
    } catch (error) {
      return {
        status: 'network_error',
        error: error.message,
        tokenSource: tokenSource,
        fileType: fileType
      };
    }
  };

  // Test URL analysis
  const testUrlAnalysis = async (token, tokenSource) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze-url`, {
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          url: 'https://via.placeholder.com/150x150.png'
        })
      });

      const result = {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        tokenSource: tokenSource
      };

      try {
        result.data = await response.json();
      } catch {
        result.data = await response.text();
      }

      if (!response.ok) {
        result.error = result.data;
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

  // Run comprehensive debugging
  const runComprehensiveDebug = async () => {
    setIsLoading(true);
    setAuthStatus('checking');
    
    const tokens = getAllTokens();
    const results = {
      tokenInventory: tokens,
      authTests: {},
      uploadTests: {},
      urlTests: {},
      systemTests: {}
    };

    // Test system endpoints first
    try {
      const healthResponse = await fetch(`${API_BASE_URL}/health`);
      results.systemTests.health = {
        status: healthResponse.status,
        ok: healthResponse.ok,
        data: await healthResponse.json()
      };
    } catch (e) {
      results.systemTests.health = { error: e.message };
    }

    // Test each token
    for (const [tokenSource, token] of Object.entries(tokens)) {
      if (token && typeof token === 'string' && token.length > 10) {
        // Auth tests
        results.authTests[tokenSource] = {};
        results.authTests[tokenSource]['/auth/me'] = await testEndpoint('/auth/me', token, tokenSource);
        results.authTests[tokenSource]['/auth/admin/me'] = await testEndpoint('/auth/admin/me', token, tokenSource);
        results.authTests[tokenSource]['/api/dashboard/user/profile'] = await testEndpoint('/api/dashboard/user/profile', token, tokenSource);

        // Upload tests with different file types
        results.uploadTests[tokenSource] = {};
        results.uploadTests[tokenSource]['image'] = await testFileUpload(token, tokenSource, 'image');
        results.uploadTests[tokenSource]['text'] = await testFileUpload(token, tokenSource, 'text');
        results.uploadTests[tokenSource]['video'] = await testFileUpload(token, tokenSource, 'video');

        // URL analysis test
        results.urlTests[tokenSource] = await testUrlAnalysis(token, tokenSource);
      }
    }

    setTestResults(results);
    setDebugInfo(results);
    
    // Determine overall auth status
    const hasValidAdminAuth = Object.values(results.authTests).some(tests => 
      tests['/auth/admin/me']?.ok
    );
    
    const hasWorkingUploads = Object.values(results.uploadTests).some(tests => 
      Object.values(tests).some(test => test.ok || (test.status >= 400 && test.status < 500 && test.status !== 401))
    );

    if (hasValidAdminAuth && hasWorkingUploads) {
      setAuthStatus('valid');
    } else if (hasValidAdminAuth) {
      setAuthStatus('partial');
    } else {
      setAuthStatus('invalid');
    }

    setIsLoading(false);
  };

  useEffect(() => {
    runComprehensiveDebug();
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
    if (ok) return 'bg-green-50 border-green-200 text-green-800';
    if (status === 401) return 'bg-red-50 border-red-200 text-red-800';
    if (status === 403) return 'bg-orange-50 border-orange-200 text-orange-800';
    if (status === 500) return 'bg-purple-50 border-purple-200 text-purple-800';
    if (status === 400) return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    return 'bg-gray-50 border-gray-200 text-gray-800';
  };

  const renderErrorDetails = (error) => {
    if (typeof error === 'object' && error.detail) {
      return (
        <div className="text-xs mt-2 p-2 bg-white bg-opacity-50 rounded">
          <div><strong>Detail:</strong> {error.detail}</div>
          {error.error && <div><strong>Error:</strong> {error.error}</div>}
          {error.allowed_types && (
            <div><strong>Allowed Types:</strong> {JSON.stringify(error.allowed_types)}</div>
          )}
        </div>
      );
    } else if (typeof error === 'string') {
      return <div className="text-xs mt-1 opacity-75">{error}</div>;
    } else if (error) {
      return <div className="text-xs mt-1 opacity-75">{JSON.stringify(error)}</div>;
    }
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Bug className="w-8 h-8 text-blue-500" />
              Admin Upload Debugger
            </h1>
            <p className="text-gray-600">
              Diagnose your admin upload authentication and file type issues
            </p>
          </div>
          <button
            onClick={runComprehensiveDebug}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {isLoading ? 'Testing...' : 'Retest All'}
          </button>
        </div>

        {/* Overall Status */}
        <div className="p-4 bg-gray-50 rounded-lg mb-6">
          <div className="flex items-center gap-3 mb-2">
            {getStatusIcon(authStatus)}
            <span className="font-semibold text-lg">Overall Status:</span>
            <span className={`capitalize font-medium ${
              authStatus === 'valid' ? 'text-green-600' : 
              authStatus === 'partial' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {authStatus}
            </span>
          </div>
          
          {authStatus === 'invalid' && (
            <div className="text-red-600">
              No valid admin authentication found. You need to log in as admin.
            </div>
          )}
          {authStatus === 'partial' && (
            <div className="text-yellow-600">
              Admin authentication works but uploads are failing. This is likely the backend bug.
            </div>
          )}
          {authStatus === 'valid' && (
            <div className="text-green-600">
              Everything appears to be working correctly!
            </div>
          )}
        </div>
      </div>

      {/* System Health */}
      {debugInfo.systemTests && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            System Health
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(debugInfo.systemTests).map(([test, result]) => (
              <div key={test} className={`p-3 rounded-lg border ${getStatusColor(result.ok, result.status)}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{test}</span>
                  <span className="text-sm">
                    {result.status} {result.statusText || (result.ok ? 'OK' : 'Error')}
                  </span>
                </div>
                {result.data && result.data.service && (
                  <div className="text-sm opacity-75">
                    Service: {result.data.service} v{result.data.version}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Authentication Tests */}
      {debugInfo.authTests && Object.keys(debugInfo.authTests).length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Authentication Tests
          </h2>
          <div className="space-y-4">
            {Object.entries(debugInfo.authTests).map(([tokenSource, tests]) => (
              <div key={tokenSource} className="border rounded-lg p-4">
                <h3 className="font-medium mb-3 text-lg">{tokenSource}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {Object.entries(tests).map(([endpoint, result]) => (
                    <div key={endpoint} className={`p-3 rounded border ${getStatusColor(result.ok, result.status)}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-sm">{endpoint}</span>
                        <span className="text-sm font-medium">
                          {result.status}
                        </span>
                      </div>
                      {result.data && result.data.username && (
                        <div className="text-xs opacity-75">
                          User: {result.data.username} ({result.data.user_type || 'unknown'})
                        </div>
                      )}
                      {renderErrorDetails(result.error)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Tests - The Main Issue */}
      {debugInfo.uploadTests && Object.keys(debugInfo.uploadTests).length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Tests - This Is Your Main Problem!
          </h2>
          <div className="space-y-4">
            {Object.entries(debugInfo.uploadTests).map(([tokenSource, tests]) => (
              <div key={tokenSource} className="border rounded-lg p-4">
                <h3 className="font-medium mb-3 text-lg">{tokenSource}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {Object.entries(tests).map(([fileType, result]) => (
                    <div key={fileType} className={`p-3 rounded border ${getStatusColor(result.ok, result.status)}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-medium">{fileType} file</div>
                          <div className="text-xs text-gray-500">{result.fileName}</div>
                        </div>
                        <span className="text-sm font-medium">
                          {result.status}
                        </span>
                      </div>
                      
                      {result.status === 500 && (
                        <div className="text-xs bg-red-100 text-red-800 p-2 rounded mt-2">
                          <strong>SERVER ERROR!</strong> This is the bug in your backend.
                        </div>
                      )}
                      
                      {result.data && result.data.success === false && result.data.detail && (
                        <div className="text-xs mt-2">
                          <strong>Error:</strong> {result.data.detail}
                        </div>
                      )}
                      
                      {result.data && result.data.user_type && (
                        <div className="text-xs mt-1 text-green-600">
                          Authenticated as: {result.data.user_type}
                        </div>
                      )}
                      
                      {renderErrorDetails(result.error)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* URL Analysis Tests */}
      {debugInfo.urlTests && Object.keys(debugInfo.urlTests).length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            URL Analysis Tests
          </h2>
          <div className="space-y-3">
            {Object.entries(debugInfo.urlTests).map(([tokenSource, result]) => (
              <div key={tokenSource} className={`p-3 rounded border ${getStatusColor(result.ok, result.status)}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{tokenSource}</span>
                  <span className="text-sm font-medium">
                    {result.status} {result.statusText}
                  </span>
                </div>
                {renderErrorDetails(result.error)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Token Inventory */}
      {debugInfo.tokenInventory && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Token Inventory
          </h2>
          <div className="space-y-2">
            {Object.entries(debugInfo.tokenInventory).map(([source, token]) => (
              <div key={source} className="flex items-center gap-3 p-2 bg-gray-50 rounded font-mono text-sm">
                <span className="font-medium min-w-0 flex-1">{source}:</span>
                <span className="text-gray-600 truncate max-w-md">
                  {typeof token === 'string' ? 
                    `${token.substring(0, 30)}...` : 
                    JSON.stringify(token)
                  }
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Solutions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-blue-900">Identified Issues & Solutions</h2>
        
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-semibold text-red-900 mb-2">Backend Bug Detected!</h3>
            <p className="text-red-800 mb-2">
              Your backend is throwing a 500 error: "Object of type set is not JSON serializable"
            </p>
            <div className="text-sm text-red-700 bg-white p-3 rounded border">
              <strong>Fix needed in api/upload.py line ~84:</strong>
              <pre className="mt-1 text-xs">
{`# Change this:
allowed_types = ALLOWED_FILE_TYPES.copy()
allowed_types.extend([...])

# To this:
allowed_types = list(ALLOWED_FILE_TYPES)
allowed_types.extend([...])`}
              </pre>
            </div>
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-900 mb-2">File Type Restrictions</h3>
            <p className="text-yellow-800">
              Your backend is rejecting text/plain files even for admins. Check your file type validation logic.
            </p>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2">Authentication Working</h3>
            <p className="text-green-800">
              Your admin authentication is working correctly. The issue is purely in the upload file handling.
            </p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-white rounded border">
          <h3 className="font-medium mb-2">Quick Backend Fix:</h3>
          <div className="text-sm font-mono bg-gray-100 p-3 rounded space-y-1">
            <div># In api/upload.py, find line ~84 and change:</div>
            <div className="text-red-600"># allowed_types = ALLOWED_FILE_TYPES.copy()</div>
            <div className="text-green-600"># allowed_types = list(ALLOWED_FILE_TYPES)</div>
            <div></div>
            <div># Also ensure ALLOWED_FILE_TYPES in config/settings.py is a list, not a set</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUploadDebugger;
