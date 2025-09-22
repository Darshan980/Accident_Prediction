'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasToken, setHasToken] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://accident-prediction-7i4e.onrender.com';

  // Get stored auth data
  const getStoredAuth = () => {
    if (typeof window === 'undefined') return null;
    
    try {
      const token = localStorage.getItem('authToken');
      const userData = localStorage.getItem('userData');
      
      if (token && userData) {
        return {
          token,
          user: JSON.parse(userData)
        };
      }
    } catch (error) {
      console.error('Error getting stored auth:', error);
    }
    return null;
  };

  // Save auth data
  const saveAuthData = (token, userData) => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(userData));
      console.log('Auth data saved to storage');
    } catch (error) {
      console.error('Error saving auth data:', error);
    }
  };

  // Clear auth data
  const clearAuthData = () => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      console.log('Auth data cleared from storage');
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  };

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      console.log('Initializing auth state...');
      setIsLoading(true);

      const storedAuth = getStoredAuth();
      
      if (storedAuth) {
        console.log('Found stored auth data:', storedAuth.user.username);
        
        // Verify token is still valid
        try {
          const response = await fetch(`${apiUrl}/auth/verify`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${storedAuth.token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const userData = await response.json();
            console.log('Token verified, user authenticated:', userData.username);
            
            setUser(userData);
            setIsAuthenticated(true);
            setHasToken(true);
            
            // Update stored data with fresh user info
            saveAuthData(
