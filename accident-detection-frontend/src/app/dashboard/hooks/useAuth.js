// app/dashboard/hooks/useAuth.js
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
      setError(null);
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

  const logout = () => {
    if (confirm('Are you sure you want to logout?')) {
      localStorage.clear();
      window.location.href = '/auth/admin';
    }
  };

  return {
    user,
    loading,
    error,
    logout
  };
};
