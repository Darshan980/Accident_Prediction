'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import MobileProfileCard from './components/MobileProfileCard';
import MobileFormCard from './components/MobileFormCard';
import MobilePasswordCard from './components/MobilePasswordCard';
import MessageAlert from './components/MessageAlert';
import LoadingSpinner from './components/LoadingSpinner';
import './styles/mobile-profile.css';

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

      await updateProfile(updateData);
      
      if (updateData.username !== user.username) {
        setMessage({ 
          type: 'success', 
          content: 'Username updated! Page will refresh to apply changes...' 
        });
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
    return <LoadingSpinner />;
  }

  return (
    <div className="mobile-profile">
      <div className="mobile-container">
        <MobileProfileCard user={user} />
        
        <MessageAlert message={message} />

        <MobileFormCard
          user={user}
          formData={formData}
          handleInputChange={handleInputChange}
          isLoading={isLoading}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          handleUpdateProfile={handleUpdateProfile}
        />

        <MobilePasswordCard
          formData={formData}
          handleInputChange={handleInputChange}
          isLoading={isLoading}
          showPasswords={showPasswords}
          togglePasswordVisibility={togglePasswordVisibility}
          handleChangePassword={handleChangePassword}
        />

        <div className="mobile-footer">
          <p>Need help? Contact support</p>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
