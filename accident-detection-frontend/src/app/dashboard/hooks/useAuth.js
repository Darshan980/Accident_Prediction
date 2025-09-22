import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      
      if (!token || !userStr) {
        setError('Please log in as admin to access this page.');
        setLoading(false);
        setTimeout(() => window.location.href = '/auth', 2000); // Changed from /auth/admin to /auth
        return;
      }

      const userData = JSON.parse(userStr);
      
      // Check if user role is admin or superadmin
      if (userData.role !== 'admin' && userData.role !== 'superadmin') {
        setError('Admin access required.');
        setLoading(false);
        setTimeout(() => window.location.href = '/auth', 2000); // Changed from /auth/admin to /auth
        return;
      }

      setUser(userData);
      setError(null);
    } catch (e) {
      console.error('Auth error:', e);
      setError('Authentication error. Please log in again.');
      setTimeout(() => {
        localStorage.clear();
        window.location.href = '/auth'; // Changed from /auth/admin to /auth
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    if (confirm('Are you sure you want to logout?')) {
      localStorage.clear();
      window.location.href = '/auth'; // Changed from /auth/admin to /auth
    }
  };

  return {
    user,
    loading,
    error,
    logout
  };
};
