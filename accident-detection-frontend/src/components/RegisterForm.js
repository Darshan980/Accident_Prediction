'use client';
import React, { useState } from 'react';
import { User, Mail, Lock, Eye, EyeOff, Building, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from './../app/contexts/AuthContext';

const RegisterForm = ({ onSwitchToLogin }) => {
  const { register, isLoading: authLoading } = useAuth();
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    department: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const isLoading = authLoading;

  // Form validation
  const validateForm = () => {
    const errors = {};
    
    if (!formData.username || formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters long';
    }
    
    if (!formData.email || !formData.email.includes('@')) {
      errors.email = 'Please provide a valid email address';
    }
    
    if (!formData.password || formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }
    
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.department) {
      errors.department = 'Please select a department';
    }
    
    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Validate form
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setValidationErrors({});

    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        department: formData.department
      });
      
      setSuccess('Account created successfully! You can now sign in.');
      
      // Clear form
      setFormData({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        department: ''
      });
      
      // Auto-switch to login after success
      setTimeout(() => {
        if (onSwitchToLogin) {
          onSwitchToLogin();
        }
      }, 2000);
      
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        setError('Unable to connect to the server. Please check if the backend is running.');
      } else if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        setError('Username or email already exists. Please choose different ones.');
      } else {
        setError(error.message || 'Registration failed. Please try again.');
      }
    }
  };

  const departments = [
    'General',
    'Traffic Control',
    'Emergency Services',
    'Law Enforcement',
    'Public Safety',
    'Transportation',
    'City Planning',
    'IT Department'
  ];

  return (
    <div style={{
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '16px',
      padding: window.innerWidth <= 768 ? '1.5rem' : '3rem',
      width: '100%',
      maxWidth: window.innerWidth <= 768 ? '100%' : '450px',
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
          backgroundColor: '#28a745',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem auto'
        }}>
          <UserPlus size={32} color="white" />
        </div>
        <h1 style={{
          fontSize: window.innerWidth <= 768 ? '1.5rem' : '1.8rem',
          fontWeight: 'bold',
          color: '#333',
          marginBottom: '0.5rem'
        }}>
          Create Account
        </h1>
        <p style={{ 
          color: '#666', 
          fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.9rem'
        }}>
          Join the accident detection system
        </p>
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

      {success && (
        <div style={{
          backgroundColor: '#d4edda',
          borderLeft: '4px solid #28a745',
          padding: window.innerWidth <= 768 ? '0.75rem' : '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.9rem'
        }}>
          <CheckCircle size={20} color="#28a745" />
          <span style={{ color: '#28a745' }}>
            {success}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Username Field */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            fontWeight: '500',
            color: '#333',
            marginBottom: '0.5rem',
            fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.9rem'
          }}>
            Username *
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
                border: `2px solid ${validationErrors.username ? '#dc3545' : '#e1e5e9'}`,
                borderRadius: '8px',
                fontSize: window.innerWidth <= 768 ? '0.9rem' : '1rem',
                transition: 'border-color 0.2s ease',
                outline: 'none',
                backgroundColor: '#fff',
                boxSizing: 'border-box'
              }}
              placeholder="Choose a username"
            />
          </div>
          {validationErrors.username && (
            <p style={{ color: '#dc3545', fontSize: window.innerWidth <= 768 ? '0.7rem' : '0.8rem', marginTop: '0.25rem' }}>
              {validationErrors.username}
            </p>
          )}
        </div>

        {/* Email Field */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            fontWeight: '500',
            color: '#333',
            marginBottom: '0.5rem',
            fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.9rem'
          }}>
            Email Address *
          </label>
          <div style={{ position: 'relative' }}>
            <Mail 
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
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: window.innerWidth <= 768 ? '0.75rem 1rem 0.75rem 3rem' : '0.875rem 1rem 0.875rem 3rem',
                border: `2px solid ${validationErrors.email ? '#dc3545' : '#e1e5e9'}`,
                borderRadius: '8px',
                fontSize: window.innerWidth <= 768 ? '0.9rem' : '1rem',
                transition: 'border-color 0.2s ease',
                outline: 'none',
                backgroundColor: '#fff',
                boxSizing: 'border-box'
              }}
              placeholder="Enter your email"
            />
          </div>
          {validationErrors.email && (
            <p style={{ color: '#dc3545', fontSize: window.innerWidth <= 768 ? '0.7rem' : '0.8rem', marginTop: '0.25rem' }}>
              {validationErrors.email}
            </p>
          )}
        </div>

        {/* Department Field */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            fontWeight: '500',
            color: '#333',
            marginBottom: '0.5rem',
            fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.9rem'
          }}>
            Department *
          </label>
          <div style={{ position: 'relative' }}>
            <Building 
              size={18} 
              style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#666',
                zIndex: 1
              }} 
            />
            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: window.innerWidth <= 768 ? '0.75rem 1rem 0.75rem 3rem' : '0.875rem 1rem 0.875rem 3rem',
                border: `2px solid ${validationErrors.department ? '#dc3545' : '#e1e5e9'}`,
                borderRadius: '8px',
                fontSize: window.innerWidth <= 768 ? '0.9rem' : '1rem',
                transition: 'border-color 0.2s ease',
                outline: 'none',
                backgroundColor: '#fff',
                boxSizing: 'border-box',
                appearance: 'none'
              }}
            >
              <option value="">Select your department</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          {validationErrors.department && (
            <p style={{ color: '#dc3545', fontSize: window.innerWidth <= 768 ? '0.7rem' : '0.8rem', marginTop: '0.25rem' }}>
              {validationErrors.department}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            fontWeight: '500',
            color: '#333',
            marginBottom: '0.5rem',
            fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.9rem'
          }}>
            Password *
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
                border: `2px solid ${validationErrors.password ? '#dc3545' : '#e1e5e9'}`,
                borderRadius: '8px',
                fontSize: window.innerWidth <= 768 ? '0.9rem' : '1rem',
                outline: 'none',
                backgroundColor: '#fff',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease'
              }}
              placeholder="Create a password"
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
          {validationErrors.password && (
            <p style={{ color: '#dc3545', fontSize: window.innerWidth <= 768 ? '0.7rem' : '0.8rem', marginTop: '0.25rem' }}>
              {validationErrors.password}
            </p>
          )}
        </div>

        {/* Confirm Password Field */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{
            display: 'block',
            fontWeight: '500',
            color: '#333',
            marginBottom: '0.5rem',
            fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.9rem'
          }}>
            Confirm Password *
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
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: window.innerWidth <= 768 ? '0.75rem 3rem 0.75rem 3rem' : '0.875rem 3rem 0.875rem 3rem',
                border: `2px solid ${validationErrors.confirmPassword ? '#dc3545' : '#e1e5e9'}`,
                borderRadius: '8px',
                fontSize: window.innerWidth <= 768 ? '0.9rem' : '1rem',
                outline: 'none',
                backgroundColor: '#fff',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease'
              }}
              placeholder="Confirm your password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {validationErrors.confirmPassword && (
            <p style={{ color: '#dc3545', fontSize: window.innerWidth <= 768 ? '0.7rem' : '0.8rem', marginTop: '0.25rem' }}>
              {validationErrors.confirmPassword}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            padding: window.innerWidth <= 768 ? '0.875rem' : '1rem',
            backgroundColor: '#28a745',
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
              Creating Account...
            </>
          ) : (
            <>
              <UserPlus size={18} />
              Create Account
            </>
          )}
        </button>
      </form>

      {onSwitchToLogin && (
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
            Already have an account?{' '}
            <button
              onClick={onSwitchToLogin}
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
              Sign in here
            </button>
          </p>
        </div>
      )}
    </div>
  );
};

export default RegisterForm;
