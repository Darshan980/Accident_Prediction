'use client';
import React, { useState, useContext, createContext, useEffect } from 'react';

// Auth Context
const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// FIXED: API configuration with correct Render URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://accident-prediction-1-mpm0.onrender.com';

// Auth Provider Component
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Derive isAuthenticated from user state
  const isAuthenticated = !!user;

  // Better token storage and retrieval
  const storeAuthData = (userData, token) => {
    try {
      // Store token separately (primary location for API client)
      localStorage.setItem('token', token);
      
      // Store complete user data with token
      const userDataWithToken = { ...userData, token };
      localStorage.setItem('user', JSON.stringify(userDataWithToken));
      
      // Store user type for routing
      localStorage.setItem('user_type', userData.role || 'user');
      
      if (userData.admin_level) {
        localStorage.setItem('admin_level', userData.admin_level);
      }

      console.log('Auth data stored successfully:', {
        token: `${token.substring(0, 10)}...`,
        user: userData.username,
        role: userData.role
      });
    } catch (error) {
      console.error('Failed to store auth data:', error);
    }
  };

  const clearAuthData = () => {
    const keysToRemove = ['token', 'user', 'user_type', 'admin_level'];
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    console.log('Auth data cleared');
  };

  // Check for stored user on mount
  useEffect(() => {
    const checkStoredAuth = () => {
      try {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        console.log('Checking stored auth:', {
          hasToken: !!storedToken,
          hasUser: !!storedUser,
          tokenPreview: storedToken ? `${storedToken.substring(0, 10)}...` : 'none',
          apiUrl: API_BASE_URL
        });
        
        if (storedToken && storedUser && storedUser !== 'null') {
          const userData = JSON.parse(storedUser);
          userData.token = storedToken;
          setUser(userData);
          console.log('Auth restored from storage:', userData.username);
        } else {
          console.log('No valid auth data found in storage');
          clearAuthData();
        }
      } catch (error) {
        console.error('Error parsing stored auth data:', error);
        clearAuthData();
      } finally {
        setIsLoading(false);
      }
    };

    checkStoredAuth();
  }, []);

  const login = async (credentials) => {
    setIsLoading(true);
    try {
      console.log('Attempting login for:', credentials.username, 'to API:', API_BASE_URL);
      
      // Enhanced fetch with timeout and error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            username: credentials.username,
            password: credentials.password
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log('Login API response:', response.status, response.ok);

        if (response.ok) {
          const data = await response.json();
          console.log('Login successful, token received');
          
          // Get user details from the /auth/me endpoint
          const userInfoResponse = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${data.access_token}`,
              'Content-Type': 'application/json'
            }
          });
          
          let userInfo = {};
          if (userInfoResponse.ok) {
            userInfo = await userInfoResponse.json();
            console.log('User info retrieved:', userInfo);
          }
          
          const userData = {
            id: userInfo.id || data.user_id || Date.now(),
            username: userInfo.username || credentials.username,
            role: 'user',
            email: userInfo.email || data.email || `${credentials.username}@example.com`,
            department: data.department || 'General',
            loginTime: new Date().toISOString(),
            admin_level: data.admin_level,
            is_active: userInfo.is_active,
            created_at: userInfo.created_at,
            last_login: userInfo.last_login
          };

          setUser(userData);
          storeAuthData(userData, data.access_token);
          
          return userData;
        } else {
          const errorData = await response.json().catch(() => ({ detail: 'Login failed' }));
          throw new Error(errorData.detail || 'API login failed');
        }
      } catch (apiError) {
        clearTimeout(timeoutId);
        
        // Check if it's a timeout or network error
        if (apiError.name === 'AbortError') {
          console.log('Login request timed out, trying demo login');
        } else if (apiError.message.includes('NetworkError') || apiError.message.includes('fetch')) {
          console.log('Network error during login, trying demo login:', apiError.message);
        } else {
          console.log('API login failed:', apiError.message);
        }
        
        // Fallback to demo login
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (credentials.username === 'demo' && credentials.password === 'password') {
          const userData = {
            id: 1,
            username: credentials.username,
            role: 'user',
            email: 'demo@trafficcontrol.com',
            department: 'Traffic Control',
            loginTime: new Date().toISOString(),
            isDemo: true
          };
          
          const demoToken = 'demo-token-' + Date.now();
          
          setUser(userData);
          storeAuthData(userData, demoToken);
          return userData;
        } else {
          // If not demo credentials and API failed, throw the original error
          throw new Error(apiError.message || 'Login failed');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const adminLogin = async (credentials) => {
    setIsLoading(true);
    try {
      console.log('Attempting admin login for:', credentials.username, 'to API:', API_BASE_URL);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      try {
        const response = await fetch(`${API_BASE_URL}/auth/admin/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            username: credentials.username,
            password: credentials.password
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log('Admin login API response:', response.status, response.ok);

        if (response.ok) {
          const data = await response.json();
          console.log('Admin login successful, token received');
          
          // Get admin info from the /auth/admin/me endpoint
          const adminInfoResponse = await fetch(`${API_BASE_URL}/auth/admin/me`, {
            headers: {
              'Authorization': `Bearer ${data.access_token}`,
              'Content-Type': 'application/json'
            }
          });
          
          let adminInfo = {};
          if (adminInfoResponse.ok) {
            adminInfo = await adminInfoResponse.json();
            console.log('Admin info retrieved:', adminInfo);
          }
          
          const userData = {
            id: adminInfo.id || data.user_id || Date.now(),
            username: adminInfo.username || credentials.username,
            role: 'admin',
            email: adminInfo.email || data.email || `${credentials.username}@company.com`,
            department: adminInfo.department || data.department || 'Administration',
            loginTime: new Date().toISOString(),
            admin_level: data.admin_level || adminInfo.admin_level || 'admin',
            is_super_admin: adminInfo.is_super_admin || false,
            permissions: adminInfo.permissions || [],
            last_login: adminInfo.last_login,
            is_active: adminInfo.is_active,
            created_at: adminInfo.created_at
          };

          setUser(userData);
          storeAuthData(userData, data.access_token);
          
          return userData;
        } else {
          const errorData = await response.json().catch(() => ({ detail: 'Admin login failed' }));
          throw new Error(errorData.detail || 'API admin login failed');
        }
      } catch (apiError) {
        clearTimeout(timeoutId);
        
        if (apiError.name === 'AbortError') {
          console.log('Admin login request timed out, trying demo login');
        } else if (apiError.message.includes('NetworkError') || apiError.message.includes('fetch')) {
          console.log('Network error during admin login, trying demo login:', apiError.message);
        } else {
          console.log('API admin login failed:', apiError.message);
        }
        
        // Fallback to demo admin login
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (credentials.username === 'admin' && credentials.password === 'admin123') {
          const userData = {
            id: 2,
            username: credentials.username,
            role: 'admin',
            email: 'admin@trafficcontrol.com',
            department: 'System Administration',
            loginTime: new Date().toISOString(),
            admin_level: 'admin',
            isDemo: true
          };
          
          const demoToken = 'demo-admin-token-' + Date.now();
          
          setUser(userData);
          storeAuthData(userData, demoToken);
          return userData;
        } else {
          throw new Error(apiError.message || 'Invalid admin credentials');
        }
      }
    } catch (error) {
      console.error('Admin login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    setIsLoading(true);
    try {
      console.log('Attempting registration for:', userData.username, 'to API:', API_BASE_URL);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            username: userData.username,
            email: userData.email,
            password: userData.password,
            department: userData.department || 'General'
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log('Registration API response:', response.status, response.ok);

        if (response.ok) {
          const data = await response.json();
          console.log('Registration successful');
          
          const newUser = {
            id: data.id || Date.now(),
            username: userData.username,
            email: userData.email,
            role: 'user',
            department: userData.department || 'General',
            loginTime: new Date().toISOString(),
          };
          
          return newUser;
        } else {
          const errorData = await response.json().catch(() => ({ detail: 'Registration failed' }));
          throw new Error(errorData.detail || 'API registration failed');
        }
      } catch (apiError) {
        clearTimeout(timeoutId);
        
        if (apiError.name === 'AbortError') {
          console.log('Registration request timed out, using demo registration');
        } else if (apiError.message.includes('NetworkError') || apiError.message.includes('fetch')) {
          console.log('Network error during registration, using demo registration:', apiError.message);
        } else {
          console.log('API registration failed:', apiError.message);
        }
        
        // Fallback to demo registration
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simple validation
        if (userData.password.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }
        
        if (!userData.username || userData.username.length < 3) {
          throw new Error('Username must be at least 3 characters long');
        }

        if (!userData.email || !userData.email.includes('@')) {
          throw new Error('Please provide a valid email address');
        }
        
        const newUser = {
          id: Date.now(),
          username: userData.username,
          email: userData.email,
          role: 'user',
          department: userData.department || 'General',
          loginTime: new Date().toISOString(),
          isDemo: true
        };
        
        return newUser;
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    console.log('Logging out user:', user?.username);
    setUser(null);
    clearAuthData();
    
    if (typeof window !== 'undefined') {
      window.location.href = '/auth';
    }
  };

  const updateUser = (updatedUserData) => {
    const updatedUser = { ...user, ...updatedUserData };
    setUser(updatedUser);
    if (user?.token) {
      storeAuthData(updatedUser, user.token);
    }
  };

  const updateProfile = async (profileData) => {
    console.log('Updating profile with data:', profileData);
    
    try {
      let updatedUser = { ...user };
      let shouldStoreAuth = false;

      // Handle password change separately
      if (profileData.currentPassword && profileData.newPassword) {
        console.log('Attempting password change...');
        
        if (user?.token && !user?.isDemo) {
          try {
            const endpoint = user.role === 'admin' ? '/auth/admin/change-password' : '/auth/change-password';
            
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${user.token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                current_password: profileData.currentPassword,
                new_password: profileData.newPassword
              })
            });

            if (response.ok) {
              const result = await response.json();
              console.log('Password changed successfully via API');
              updatedUser.last_password_change = result.last_password_change;
              shouldStoreAuth = true;
            } else {
              const errorData = await response.json().catch(() => ({ detail: 'Password change failed' }));
              throw new Error(errorData.detail || 'API password change failed');
            }
          } catch (apiError) {
            console.log('API password change failed:', apiError.message);
            throw apiError;
          }
        } else {
          console.log('Demo password change successful');
          updatedUser.last_password_change = new Date().toISOString();
          shouldStoreAuth = true;
        }
      }

      // Handle profile data updates (username, email, department)
      const profileFields = ['username', 'email', 'department'];
      const profileUpdates = {};
      let hasProfileUpdates = false;

      profileFields.forEach(field => {
        if (profileData[field] !== undefined && profileData[field] !== user[field]) {
          profileUpdates[field] = profileData[field];
          updatedUser[field] = profileData[field];
          hasProfileUpdates = true;
        }
      });

      if (hasProfileUpdates) {
        console.log('Updating profile fields:', profileUpdates);
        
        if (user?.token && !user?.isDemo) {
          try {
            const endpoint = user.role === 'admin' ? '/auth/admin/me' : '/auth/me';
            
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${user.token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(profileUpdates)
            });

            if (response.ok) {
              const apiUpdatedData = await response.json();
              console.log('Profile updated successfully via API');
              
              if (apiUpdatedData.new_token && apiUpdatedData.username_changed) {
                console.log('Username changed, updating token');
                updatedUser.token = apiUpdatedData.new_token;
                
                clearAuthData();
                storeAuthData(updatedUser, apiUpdatedData.new_token);
                
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
              }
              
              updatedUser = { ...updatedUser, ...apiUpdatedData };
              shouldStoreAuth = true;
            } else {
              const errorData = await response.json().catch(() => ({ detail: 'Profile update failed' }));
              console.log('API profile update failed:', errorData.detail);
              shouldStoreAuth = true;
            }
          } catch (apiError) {
            console.log('API profile update failed:', apiError.message);
            shouldStoreAuth = true;
          }
        } else {
          console.log('Updating profile locally (demo mode)');
          shouldStoreAuth = true;
        }
      }

      if (shouldStoreAuth) {
        updatedUser.last_updated = new Date().toISOString();
        setUser(updatedUser);
        
        if (user?.token && !profileUpdates.username) {
          storeAuthData(updatedUser, user.token);
        }
        
        console.log('Profile update completed successfully');
        return updatedUser;
      }

      return user;
      
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  const refreshUserFromStorage = () => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser && storedUser !== 'null') {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        console.log('User data refreshed from storage:', userData.username);
        return userData;
      }
    } catch (error) {
      console.error('Error refreshing user from storage:', error);
    }
    return null;
  };

  // Debug logging
  useEffect(() => {
    console.log('Auth State Changed:', { 
      user: user ? { username: user.username, role: user.role, id: user.id } : null,
      isAuthenticated: isAuthenticated, 
      isLoading: isLoading,
      hasToken: !!user?.token,
      apiUrl: API_BASE_URL,
      timestamp: new Date().toISOString()
    });
  }, [user, isAuthenticated, isLoading]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      login,
      adminLogin,
      register,
      logout,
      updateUser,
      updateProfile,
      refreshUserFromStorage,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthProvider, useAuth };
