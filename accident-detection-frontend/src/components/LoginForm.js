'use client';
import React, { useState } from 'react';
import { User, LogIn, Eye, EyeOff, Lock, AlertCircle, Shield } from 'lucide-react';
import { useAuth } from './../app/contexts/AuthContext'; // Import your AuthContext

const LoginForm = ({ isAdmin = false, onSwitchToRegister }) => {
  const { login, adminLogin, isLoading: authLoading } = useAuth();
  
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Use loading state from auth context
  const isLoading = authLoading;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      let userData;
      
      if (isAdmin) {
        userData = await adminLogin({
          username: formData.username,
          password: formData.password
        });
        console.log('Admin login successful:', userData);
        // Redirect to admin dashboard
        window.location.href = '/dashboard';
      } else {
        userData = await login({
          username: formData.username,
          password: formData.password
        });
        console.log('User login successful:', userData);
        // Redirect to user dashboard
        window.location.href = '/userdashboard';
      }

    } catch (error) {
      console.error(`${isAdmin ? 'Admin login' : 'Login'} error:`, error);
      
      // Handle different types of errors
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        setError('Unable to connect to the server. Please check if the backend is running.');
      } else if (error.message.includes('Invalid') || error.message.includes('Incorrect')) {
        setError('Invalid username or password. Please try again.');
      } else {
        setError(error.message || `${isAdmin ? 'Admin login' : 'Login'} failed. Please try again.`);
      }
    }
  };

  return (
    <div style={{
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '16px',
      padding: window.innerWidth <= 768 ? '1.5rem' : '3rem',
      width: '100%',
      maxWidth: window.innerWidth <= 768 ? '100%' : '400px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
      backdropFilter: 'blur(10px)',
      boxSizing: 'border-box'
    }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{
          width: '64px',
          height: '64px',
          backgroundColor: isAdmin ? '#dc3545' : '#007bff',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem auto'
        }}>
          {isAdmin ? <Shield size={32} color="white" /> : <LogIn size={32} color="white" />}
        </div>
        <h1 style={{
          fontSize: window.innerWidth <= 768 ? '1.5rem' : '1.8rem',
          fontWeight: 'bold',
          color: '#333',
          marginBottom: '0.5rem'
        }}>
          {isAdmin ? 'Admin Portal' : 'Welcome Back'}
        </h1>
        <p style={{ 
          color: '#666', 
          fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.9rem'
        }}>
          {isAdmin ? 'Sign in to access admin dashboard' : 'Sign in to access accident detection system'}
        </p>
        <div style={{ 
          color: '#999', 
          fontSize: window.innerWidth <= 768 ? '0.7rem' : '0.8rem', 
          marginTop: '0.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem'
        }}>
          {isAdmin ? (
            <>
              <p>Demo Admin: admin/admin123</p>
              <p>API Admin: superadmin/admin123</p>
            </>
          ) : (
            <>
              <p>Demo User: demo/password</p>
              <p>Or register a new account</p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#fee',
          borderLeft: '4px solid #dc3545',
          padding: window.innerWidth <= 768 ? '0.75rem' : '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.9rem'
        }}>
          <AlertCircle size={20} color="#dc3545" />
          <span style={{ color: '#dc3545' }}>
            {error}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            fontWeight: '500',
            color: '#333',
            marginBottom: '0.5rem',
            fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.9rem'
          }}>
            Username
          </label>
          <div style={{ position: 'relative' }}>
            <User 
              size={18} 
              style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#666'
              }} 
            />
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: window.innerWidth <= 768 ? '0.75rem 1rem 0.75rem 3rem' : '0.875rem 1rem 0.875rem 3rem',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: window.innerWidth <= 768 ? '0.9rem' : '1rem',
                transition: 'border-color 0.2s ease',
                outline: 'none',
                backgroundColor: '#fff',
                boxSizing: 'border-box'
              }}
              placeholder="Enter your username"
            />
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{
            display: 'block',
            fontWeight: '500',
            color: '#333',
            marginBottom: '0.5rem',
            fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.9rem'
          }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <Lock 
              size={18} 
              style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#666'
              }} 
            />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: window.innerWidth <= 768 ? '0.75rem 3rem 0.75rem 3rem' : '0.875rem 3rem 0.875rem 3rem',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: window.innerWidth <= 768 ? '0.9rem' : '1rem',
                outline: 'none',
                backgroundColor: '#fff',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease'
              }}
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#666',
                padding: '0.25rem'
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            padding: window.innerWidth <= 768 ? '0.875rem' : '1rem',
            backgroundColor: isAdmin ? '#dc3545' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: window.innerWidth <= 768 ? '0.9rem' : '1rem',
            fontWeight: '600',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'all 0.3s ease',
            boxSizing: 'border-box'
          }}
        >
          {isLoading ? (
            <>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid transparent',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Signing in...
            </>
          ) : (
            <>
              {isAdmin ? <Shield size={18} /> : <LogIn size={18} />}
              Sign In {isAdmin ? 'as Admin' : ''}
            </>
          )}
        </button>
      </form>

      {!isAdmin && onSwitchToRegister && (
        <div style={{
          textAlign: 'center',
          marginTop: '1.5rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid #e1e5e9'
        }}>
          <p style={{ 
            color: '#666', 
            fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.9rem'
          }}>
            Don&apos;t have an account?{' '}
            <button
              onClick={onSwitchToRegister}
              style={{
                color: '#007bff',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontWeight: '500',
                fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.9rem'
              }}
            >
              Sign up here
            </button>
          </p>
        </div>
      )}

      {isAdmin && (
        <div style={{
          textAlign: 'center',
          marginTop: '1.5rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid #e1e5e9'
        }}>
          <p style={{ 
            color: '#666', 
            fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.9rem'
          }}>
            Not an admin?{' '}
            <a
              href="/auth"
              style={{
                color: '#007bff',
                textDecoration: 'underline',
                fontWeight: '500',
                fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.9rem'
              }}
            >
              User login
            </a>
          </p>
        </div>
      )}
    </div>
  );
};

export default LoginForm;
