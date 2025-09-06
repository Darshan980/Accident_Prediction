'use client';
import React, { useState, useEffect } from 'react';
import { 
  User, 
  Lock, 
  Mail, 
  Building, 
  Shield, 
  Eye, 
  EyeOff, 
  Save, 
  AlertCircle, 
  CheckCircle, 
  Edit3,
  Calendar,
  Clock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ProfilePage = () => {
  const { user, updateProfile, isLoading: authLoading } = useAuth();
  
  // Form states
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    department: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', content: '' });
  const [isEditing, setIsEditing] = useState(false);

  // Initialize form data when user data loads
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        username: user.username || '',
        email: user.email || '',
        department: user.department || ''
      }));
    }
  }, [user]);

  // Clear message after 5 seconds
  useEffect(() => {
    if (message.content) {
      const timer = setTimeout(() => {
        setMessage({ type: '', content: '' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear any existing messages when user starts typing
    if (message.content) {
      setMessage({ type: '', content: '' });
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const validateGeneralInfo = () => {
    if (!formData.username.trim()) {
      throw new Error('Username is required');
    }
    if (formData.username.length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }
    if (!formData.email.trim()) {
      throw new Error('Email is required');
    }
    if (!formData.email.includes('@')) {
      throw new Error('Please enter a valid email address');
    }
  };

  const validatePasswordChange = () => {
    if (!formData.currentPassword) {
      throw new Error('Current password is required');
    }
    if (!formData.newPassword) {
      throw new Error('New password is required');
    }
    if (formData.newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long');
    }
    if (formData.newPassword !== formData.confirmPassword) {
      throw new Error('New passwords do not match');
    }
    if (formData.currentPassword === formData.newPassword) {
      throw new Error('New password must be different from current password');
    }
  };

  const handleUpdateProfile = async () => {
    setIsLoading(true);
    setMessage({ type: '', content: '' });

    try {
      validateGeneralInfo();
      
      const updateData = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        department: formData.department.trim() || user.department
      };

      const result = await updateProfile(updateData);
      
      // Check if username changed and page refresh is needed
      if (updateData.username !== user.username) {
        setMessage({ 
          type: 'success', 
          content: 'Username updated! Page will refresh to apply changes...' 
        });
        // The AuthContext will handle the page refresh
      } else {
        setMessage({ 
          type: 'success', 
          content: 'Profile updated successfully!' 
        });
      }
      
      setIsEditing(false);
      
    } catch (error) {
      console.error('Profile update error:', error);
      setMessage({ 
        type: 'error', 
        content: error.message || 'Failed to update profile' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setIsLoading(true);
    setMessage({ type: '', content: '' });

    try {
      validatePasswordChange();

      await updateProfile({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });

      // Clear password fields on success
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));

      setMessage({ 
        type: 'success', 
        content: 'Password changed successfully!' 
      });
      
    } catch (error) {
      console.error('Password change error:', error);
      setMessage({ 
        type: 'error', 
        content: error.message || 'Failed to change password' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #f3f4f6',
          borderTop: '3px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    );
  }

  const isAdmin = user.role === 'admin';

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '2rem 1rem'
    }}>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '16px',
          padding: '2rem',
          color: 'white',
          marginBottom: '2rem',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '80px',
              height: '80px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)'
            }}>
              {isAdmin ? <Shield size={40} /> : <User size={40} />}
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ 
                margin: '0 0 0.5rem 0', 
                fontSize: '2rem', 
                fontWeight: '700' 
              }}>
                {user.username}
              </h1>
              <p style={{ 
                margin: '0 0 0.5rem 0', 
                opacity: '0.9', 
                fontSize: '1.1rem' 
              }}>
                {user.email}
              </p>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}>
                  {isAdmin ? <Shield size={16} /> : <Building size={16} />}
                  {isAdmin ? 'Administrator' : user.department}
                </span>
                {user.loginTime && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.85rem',
                    opacity: '0.8'
                  }}>
                    <Clock size={14} />
                    Last login: {new Date(user.loginTime).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message.content && (
          <div style={{
            backgroundColor: message.type === 'success' ? '#f0f9ff' : '#fef2f2',
            borderLeft: `4px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            {message.type === 'success' ? (
              <CheckCircle size={20} color="#10b981" />
            ) : (
              <AlertCircle size={20} color="#ef4444" />
            )}
            <span style={{
              color: message.type === 'success' ? '#065f46' : '#991b1b',
              fontWeight: '500'
            }}>
              {message.content}
            </span>
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          marginBottom: '1.5rem',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
            <button
              onClick={() => setActiveTab('general')}
              style={{
                flex: 1,
                padding: '1rem 1.5rem',
                border: 'none',
                backgroundColor: activeTab === 'general' ? '#3b82f6' : 'transparent',
                color: activeTab === 'general' ? 'white' : '#6b7280',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <User size={18} />
              General Information
            </button>
            <button
              onClick={() => setActiveTab('security')}
              style={{
                flex: 1,
                padding: '1rem 1.5rem',
                border: 'none',
                backgroundColor: activeTab === 'security' ? '#3b82f6' : 'transparent',
                color: activeTab === 'security' ? 'white' : '#6b7280',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <Lock size={18} />
              Security
            </button>
          </div>

          {/* General Information Tab */}
          {activeTab === 'general' && (
            <div style={{ padding: '2rem' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{
                  margin: 0,
                  color: '#111827',
                  fontSize: '1.25rem',
                  fontWeight: '600'
                }}>
                  Profile Information
                </h3>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
                  >
                    <Edit3 size={16} />
                    Edit Profile
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        // Reset form data
                        setFormData(prev => ({
                          ...prev,
                          username: user.username || '',
                          email: user.email || '',
                          department: user.department || ''
                        }));
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateProfile}
                      disabled={isLoading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        fontSize: '0.9rem',
                        opacity: isLoading ? 0.7 : 1
                      }}
                    >
                      {isLoading ? (
                        <div style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid transparent',
                          borderTop: '2px solid white',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }} />
                      ) : (
                        <Save size={16} />
                      )}
                      Save Changes
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {/* Username Field */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Username
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={18} style={{
                      position: 'absolute',
                      left: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af'
                    }} />
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      disabled={!isEditing}
                      style={{
                        width: '100%',
                        padding: '0.875rem 1rem 0.875rem 3rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        backgroundColor: isEditing ? 'white' : '#f9fafb',
                        color: isEditing ? '#111827' : '#6b7280',
                        cursor: isEditing ? 'text' : 'not-allowed',
                        transition: 'all 0.2s ease',
                        boxSizing: 'border-box'
                      }}
                      placeholder="Enter your username"
                    />
                  </div>
                  {isEditing && formData.username !== user.username && (
                    <p style={{
                      margin: '0.5rem 0 0 0',
                      fontSize: '0.8rem',
                      color: '#f59e0b'
                    }}>
                      ⚠️ Changing username will require you to log in again with the new username
                    </p>
                  )}
                </div>

                {/* Email Field */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{
                      position: 'absolute',
                      left: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af'
                    }} />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      disabled={!isEditing}
                      style={{
                        width: '100%',
                        padding: '0.875rem 1rem 0.875rem 3rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        backgroundColor: isEditing ? 'white' : '#f9fafb',
                        color: isEditing ? '#111827' : '#6b7280',
                        cursor: isEditing ? 'text' : 'not-allowed',
                        transition: 'all 0.2s ease',
                        boxSizing: 'border-box'
                      }}
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                {/* Department Field */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Department
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Building size={18} style={{
                      position: 'absolute',
                      left: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af'
                    }} />
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => handleInputChange('department', e.target.value)}
                      disabled={!isEditing}
                      style={{
                        width: '100%',
                        padding: '0.875rem 1rem 0.875rem 3rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        backgroundColor: isEditing ? 'white' : '#f9fafb',
                        color: isEditing ? '#111827' : '#6b7280',
                        cursor: isEditing ? 'text' : 'not-allowed',
                        transition: 'all 0.2s ease',
                        boxSizing: 'border-box'
                      }}
                      placeholder="Enter your department"
                    />
                  </div>
                </div>

                {/* Account Info */}
                <div style={{
                  backgroundColor: '#f8fafc',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <h4 style={{
                    margin: '0 0 1rem 0',
                    color: '#374151',
                    fontSize: '1rem',
                    fontWeight: '600'
                  }}>
                    Account Details
                  </h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem'
                  }}>
                    <div>
                      <p style={{
                        margin: '0 0 0.25rem 0',
                        fontSize: '0.8rem',
                        color: '#6b7280',
                        fontWeight: '500'
                      }}>
                        Account Type
                      </p>
                      <p style={{
                        margin: 0,
                        color: '#111827',
                        fontWeight: '600',
                        textTransform: 'capitalize'
                      }}>
                        {isAdmin ? 'Administrator' : 'User'}
                      </p>
                    </div>
                    {user.created_at && (
                      <div>
                        <p style={{
                          margin: '0 0 0.25rem 0',
                          fontSize: '0.8rem',
                          color: '#6b7280',
                          fontWeight: '500'
                        }}>
                          Member Since
                        </p>
                        <p style={{
                          margin: 0,
                          color: '#111827',
                          fontWeight: '600'
                        }}>
                          {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    <div>
                      <p style={{
                        margin: '0 0 0.25rem 0',
                        fontSize: '0.8rem',
                        color: '#6b7280',
                        fontWeight: '500'
                      }}>
                        Status
                      </p>
                      <p style={{
                        margin: 0,
                        color: '#10b981',
                        fontWeight: '600'
                      }}>
                        Active
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div style={{ padding: '2rem' }}>
              <h3 style={{
                margin: '0 0 1.5rem 0',
                color: '#111827',
                fontSize: '1.25rem',
                fontWeight: '600'
              }}>
                Change Password
              </h3>

              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {/* Current Password */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Current Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{
                      position: 'absolute',
                      left: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af'
                    }} />
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={formData.currentPassword}
                      onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.875rem 3rem 0.875rem 3rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        transition: 'border-color 0.2s ease',
                        boxSizing: 'border-box'
                      }}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('current')}
                      style={{
                        position: 'absolute',
                        right: '1rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#6b7280',
                        padding: '0.25rem'
                      }}
                    >
                      {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    New Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{
                      position: 'absolute',
                      left: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af'
                    }} />
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={formData.newPassword}
                      onChange={(e) => handleInputChange('newPassword', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.875rem 3rem 0.875rem 3rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        transition: 'border-color 0.2s ease',
                        boxSizing: 'border-box'
                      }}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('new')}
                      style={{
                        position: 'absolute',
                        right: '1rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#6b7280',
                        padding: '0.25rem'
                      }}
                    >
                      {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {formData.newPassword && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        Password strength:
                        <span style={{
                          color: formData.newPassword.length >= 8 ? '#10b981' : 
                                formData.newPassword.length >= 6 ? '#f59e0b' : '#ef4444',
                          fontWeight: '500',
                          marginLeft: '0.5rem'
                        }}>
                          {formData.newPassword.length >= 8 ? 'Strong' :
                           formData.newPassword.length >= 6 ? 'Medium' : 'Weak'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm New Password */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Confirm New Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{
                      position: 'absolute',
                      left: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af'
                    }} />
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.875rem 3rem 0.875rem 3rem',
                        border: `2px solid ${
                          formData.confirmPassword && formData.newPassword && 
                          formData.confirmPassword !== formData.newPassword ? '#ef4444' : '#e5e7eb'
                        }`,
                        borderRadius: '8px',
                        fontSize: '1rem',
                        transition: 'border-color 0.2s ease',
                        boxSizing: 'border-box'
                      }}
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('confirm')}
                      style={{
                        position: 'absolute',
                        right: '1rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#6b7280',
                        padding: '0.25rem'
                      }}
                    >
                      {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {formData.confirmPassword && formData.newPassword && 
                   formData.confirmPassword !== formData.newPassword && (
                    <p style={{
                      margin: '0.5rem 0 0 0',
                      fontSize: '0.8rem',
                      color: '#ef4444'
                    }}>
                      Passwords do not match
                    </p>
                  )}
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={isLoading || !formData.currentPassword || !formData.newPassword || 
                           !formData.confirmPassword || formData.newPassword !== formData.confirmPassword}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '1rem 1.5rem',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: isLoading || !formData.currentPassword || !formData.newPassword || 
                           !formData.confirmPassword || formData.newPassword !== formData.confirmPassword 
                           ? 'not-allowed' : 'pointer',
                    opacity: isLoading || !formData.currentPassword || !formData.newPassword || 
                           !formData.confirmPassword || formData.newPassword !== formData.confirmPassword 
                           ? 0.5 : 1,
                    transition: 'all 0.2s ease',
                    marginTop: '0.5rem'
                  }}
                  onMouseOver={(e) => {
                    if (!e.target.disabled) {
                      e.target.style.backgroundColor = '#dc2626';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!e.target.disabled) {
                      e.target.style.backgroundColor = '#ef4444';
                    }
                  }}
                >
                  {isLoading ? (
                    <>
                      <div style={{
                        width: '18px',
                        height: '18px',
                        border: '2px solid transparent',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Updating Password...
                    </>
                  ) : (
                    <>
                      <Lock size={18} />
                      Change Password
                    </>
                  )}
                </button>

                {/* Password Requirements */}
                <div style={{
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginTop: '1rem'
                }}>
                  <h5 style={{
                    margin: '0 0 0.75rem 0',
                    color: '#1e40af',
                    fontSize: '0.9rem',
                    fontWeight: '600'
                  }}>
                    Password Requirements
                  </h5>
                  <ul style={{
                    margin: 0,
                    paddingLeft: '1.25rem',
                    color: '#374151',
                    fontSize: '0.85rem',
                    lineHeight: '1.5'
                  }}>
                    <li>At least 6 characters long</li>
                    <li>Must be different from your current password</li>
                    <li>Should contain a mix of letters, numbers, and special characters (recommended)</li>
                    <li>Avoid using personal information like your name or email</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Account Actions */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
        }}>
          <h3 style={{
            margin: '0 0 1rem 0',
            color: '#111827',
            fontSize: '1.25rem',
            fontWeight: '600'
          }}>
            Account Actions
          </h3>
          
          <div style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))'
          }}>
            {/* Account Status */}
            <div style={{
              padding: '1.5rem',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: '#f8fafc'
            }}>
              <h4 style={{
                margin: '0 0 0.5rem 0',
                color: '#374151',
                fontSize: '1rem',
                fontWeight: '600'
              }}>
                Account Status
              </h4>
              <p style={{
                margin: '0 0 1rem 0',
                color: '#6b7280',
                fontSize: '0.9rem',
                lineHeight: '1.5'
              }}>
                Your account is currently active and in good standing.
              </p>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#10b981',
                  borderRadius: '50%'
                }} />
                <span style={{
                  color: '#10b981',
                  fontSize: '0.85rem',
                  fontWeight: '500'
                }}>
                  Active
                </span>
              </div>
            </div>

            {/* Quick Stats */}
            <div style={{
              padding: '1.5rem',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: '#f8fafc'
            }}>
              <h4 style={{
                margin: '0 0 0.5rem 0',
                color: '#374151',
                fontSize: '1rem',
                fontWeight: '600'
              }}>
                Quick Stats
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.75rem',
                marginTop: '1rem'
              }}>
                <div>
                  <p style={{
                    margin: '0 0 0.25rem 0',
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Role
                  </p>
                  <p style={{
                    margin: 0,
                    color: '#111827',
                    fontWeight: '600',
                    textTransform: 'capitalize'
                  }}>
                    {user.role}
                  </p>
                </div>
                {user.last_login && (
                  <div>
                    <p style={{
                      margin: '0 0 0.25rem 0',
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Last Login
                    </p>
                    <p style={{
                      margin: 0,
                      color: '#111827',
                      fontWeight: '600',
                      fontSize: '0.85rem'
                    }}>
                      {new Date(user.last_login).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Additional Account Information for Admin */}
          {isAdmin && (
            <div style={{
              marginTop: '1.5rem',
              padding: '1.5rem',
              backgroundColor: '#fef3f2',
              border: '1px solid #fecaca',
              borderRadius: '8px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1rem'
              }}>
                <Shield size={20} color="#dc2626" />
                <h4 style={{
                  margin: 0,
                  color: '#dc2626',
                  fontSize: '1rem',
                  fontWeight: '600'
                }}>
                  Administrator Account
                </h4>
              </div>
              <p style={{
                margin: '0 0 1rem 0',
                color: '#991b1b',
                fontSize: '0.9rem',
                lineHeight: '1.5'
              }}>
                You have administrator privileges. Please ensure your account credentials are kept secure and avoid sharing access with unauthorized personnel.
              </p>
              {user.admin_level && (
                <p style={{
                  margin: 0,
                  color: '#7f1d1d',
                  fontSize: '0.85rem'
                }}>
                  Admin Level: <strong style={{ textTransform: 'capitalize' }}>{user.admin_level}</strong>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div style={{
          textAlign: 'center',
          marginTop: '2rem',
          padding: '1rem',
          color: '#6b7280',
          fontSize: '0.85rem',
          lineHeight: '1.5'
        }}>
          <p style={{ margin: 0 }}>
            If you need help or have questions about your account, please contact support.
          </p>
          <p style={{ margin: '0.5rem 0 0 0' }}>
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;