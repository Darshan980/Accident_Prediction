import React from 'react';
import { User, Mail, Building, Edit3, Save, Shield, Calendar } from 'lucide-react';
import FormField from './FormField';

const GeneralTab = ({ 
  user, 
  formData, 
  handleInputChange, 
  isLoading, 
  isEditing, 
  setIsEditing, 
  handleUpdateProfile 
}) => {
  const isAdmin = user?.role === 'admin';

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form data to original values
    handleInputChange('username', user.username || '');
    handleInputChange('email', user.email || '');
    handleInputChange('department', user.department || '');
  };

  return (
    <div className="tab-panel">
      <div className="tab-panel-header">
        <h3>Profile Information</h3>
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)} 
            className="btn btn-primary btn-sm"
          >
            <Edit3 size={16} />
            <span>Edit Profile</span>
          </button>
        ) : (
          <div className="button-group">
            <button 
              onClick={handleCancel}
              className="btn btn-secondary btn-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateProfile}
              disabled={isLoading}
              className="btn btn-success btn-sm"
            >
              {isLoading ? (
                <div className="spinner-sm" />
              ) : (
                <Save size={16} />
              )}
              <span>Save Changes</span>
            </button>
          </div>
        )}
      </div>

      <div className="form-grid">
        <FormField
          label="Username"
          icon={User}
          type="text"
          value={formData.username}
          onChange={(value) => handleInputChange('username', value)}
          disabled={!isEditing}
          placeholder="Enter your username"
          warning={isEditing && formData.username !== user.username ? 
            "⚠️ Changing username will require you to log in again with the new username" : null}
        />

        <FormField
          label="Email Address"
          icon={Mail}
          type="email"
          value={formData.email}
          onChange={(value) => handleInputChange('email', value)}
          disabled={!isEditing}
          placeholder="Enter your email"
        />

        <FormField
          label="Department"
          icon={Building}
          type="text"
          value={formData.department}
          onChange={(value) => handleInputChange('department', value)}
          disabled={!isEditing}
          placeholder="Enter your department"
        />
      </div>

      <div className="account-details">
        <h4>Account Details</h4>
        <div className="details-grid">
          <div className="detail-item">
            <span className="detail-label">Account Type</span>
            <span className="detail-value">
              {isAdmin ? 'Administrator' : 'User'}
            </span>
          </div>
          {user.created_at && (
            <div className="detail-item">
              <span className="detail-label">Member Since</span>
              <span className="detail-value">
                {new Date(user.created_at).toLocaleDateString()}
              </span>
            </div>
          )}
          <div className="detail-item">
            <span className="detail-label">Status</span>
            <span className="detail-value status-active">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneralTab;
