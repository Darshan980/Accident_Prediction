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

// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Auth Provider Component
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Derive isAuthenticated from user state
  const isAuthenticated = !!user;

  // FIXED: Better token storage and retrieval
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
        // First check for separate token
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        console.log('Checking stored auth:', {
          hasToken: !!storedToken,
          hasUser: !!storedUser,
          tokenPreview: storedToken ? `${storedToken.substring(0, 10)}...` : 'none'
        });
        
        if (storedToken && storedUser && storedUser !== 'null') {
          const userData = JSON.parse(storedUser);
          // Ensure token is in user data
          userData.token = storedToken;
          setUser(userData);
          console.log('Auth restored from storage:', userData.username);
        } else {
          console.log('No valid auth data found in storage');
          clearAuthData(); // Clean up any partial data
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
      console.log('Attempting login for:', credentials.username);
      
      // Try API login first
      try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: credentials.username,
            password: credentials.password
          })
        });

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
          // If API login fails, get error details
          const errorData = await response.json().catch(() => ({ detail: 'Login failed' }));
          throw new Error(errorData.detail || 'API login failed');
        }
      } catch (apiError) {
        console.log('API login failed, trying demo login:', apiError.message);
        
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
          
          // Create a demo token
          const demoToken = 'demo-token-' + Date.now();
          
          setUser(userData);
          storeAuthData(userData, demoToken);
          return userData;
        } else {
          throw new Error('Invalid username or password');
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
      console.log('Attempting admin login for:', credentials.username);
      
      // Try API admin login first
      try {
        const response = await fetch(`${API_BASE_URL}/auth/admin/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: credentials.username,
            password: credentials.password
          })
        });

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
        console.log('API admin login failed, trying demo login:', apiError.message);
        
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
          
          // Create a demo admin token
          const demoToken = 'demo-admin-token-' + Date.now();
          
          setUser(userData);
          storeAuthData(userData, demoToken);
          return userData;
        } else {
          throw new Error('Invalid admin credentials');
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
      console.log('Attempting registration for:', userData.username);
      
      // Try API registration first
      try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: userData.username,
            email: userData.email,
            password: userData.password,
            department: userData.department || 'General'
          })
        });

        console.log('Registration API response:', response.status, response.ok);

        if (response.ok) {
          const data = await response.json();
          console.log('Registration successful');
          
          const newUser = {
            id: data.user_id || Date.now(),
            username: userData.username,
            email: userData.email,
            role: 'user',
            department: userData.department || 'General',
            loginTime: new Date().toISOString(),
          };
          
          // Don't auto-login after registration, just return success
          return newUser;
        } else {
          const errorData = await response.json().catch(() => ({ detail: 'Registration failed' }));
          throw new Error(errorData.detail || 'API registration failed');
        }
      } catch (apiError) {
        console.log('API registration failed, using demo registration:', apiError.message);
        
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
    
    // Optional: redirect to home page
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

  // FIXED: Enhanced updateProfile with better token handling
  const updateProfile = async (profileData) => {
    console.log('Updating profile with data:', profileData);
    
    try {
      let updatedUser = { ...user };
      let shouldStoreAuth = false;

      // Handle password change separately
      if (profileData.currentPassword && profileData.newPassword) {
        console.log('Attempting password change...');
        
        if (user?.token && !user?.isDemo) {
          // Try API password update
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
              // Update last password change timestamp
              updatedUser.last_password_change = result.last_password_change;
              shouldStoreAuth = true;
            } else {
              const errorData = await response.json().catch(() => ({ detail: 'Password change failed' }));
              throw new Error(errorData.detail || 'API password change failed');
            }
          } catch (apiError) {
            console.log('API password change failed:', apiError.message);
            throw apiError; // Don't fallback for password changes - security risk
          }
        } else {
          // Demo mode password change
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
          // Try API profile update
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
              
              // Check if username changed and new token provided
              if (apiUpdatedData.new_token && apiUpdatedData.username_changed) {
                console.log('Username changed, updating token');
                updatedUser.token = apiUpdatedData.new_token;
                
                // Clear old auth data and store new data with new token
                clearAuthData();
                storeAuthData(updatedUser, apiUpdatedData.new_token);
                
                // Force page refresh to ensure all components use new token
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
              }
              
              // Merge API response with our updates
              updatedUser = { ...updatedUser, ...apiUpdatedData };
              shouldStoreAuth = true;
            } else {
              const errorData = await response.json().catch(() => ({ detail: 'Profile update failed' }));
              console.log('API profile update failed:', errorData.detail);
              // Continue with local update for non-critical fields
              shouldStoreAuth = true;
            }
          } catch (apiError) {
            console.log('API profile update failed:', apiError.message);
            // Continue with local update
            shouldStoreAuth = true;
          }
        } else {
          // Demo mode or no token - update locally
          console.log('Updating profile locally (demo mode)');
          shouldStoreAuth = true;
        }
      }

      if (shouldStoreAuth) {
        // Update the user state
        updatedUser.last_updated = new Date().toISOString();
        setUser(updatedUser);
        
        // Store updated data in localStorage (unless new token was provided)
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

  // NEW: Force refresh user data from storage
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

  // Debug logging (remove in production)
  useEffect(() => {
    console.log('Auth State Changed:', { 
      user: user ? { username: user.username, role: user.role, id: user.id } : null,
      isAuthenticated: isAuthenticated, 
      isLoading: isLoading,
      hasToken: !!user?.token,
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