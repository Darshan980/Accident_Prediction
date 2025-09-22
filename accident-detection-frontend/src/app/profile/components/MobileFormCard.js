import React from 'react';
import { User, Mail, Building, Edit3, Save, X } from 'lucide-react';

const MobileFormCard = ({ 
  user, 
  formData, 
  handleInputChange, 
  isLoading, 
  isEditing, 
  setIsEditing, 
  handleUpdateProfile 
}) => {
  const handleCancel = () => {
    setIsEditing(false);
    handleInputChange('username', user.username || '');
    handleInputChange('email', user.email || '');
    handleInputChange('department', user.department || '');
  };

  return (
    <div className="mobile-card">
      <div className="card-header">
        <h2>Profile Info</h2>
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)} className="btn-edit">
            <Edit3 size={16} />
          </button>
        ) : (
          <button onClick={handleCancel} className="btn-cancel">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="form-fields">
        <div className="field">
          <label>Username</label>
          <div className="input-group">
            <User size={16} />
            <input
              type="text"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              disabled={!isEditing}
              placeholder="Username"
            />
          </div>
          {isEditing && formData.username !== user.username && (
            <div className="warning">Username change requires re-login</div>
          )}
        </div>

        <div className="field">
          <label>Email</label>
          <div className="input-group">
            <Mail size={16} />
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={!isEditing}
              placeholder="Email address"
            />
          </div>
        </div>

        <div className="field">
          <label>Department</label>
          <div className="input-group">
            <Building size={16} />
            <input
              type="text"
              value={formData.department}
              onChange={(e) => handleInputChange('department', e.target.value)}
              disabled={!isEditing}
              placeholder="Department"
            />
          </div>
        </div>

        {isEditing && (
          <button 
            onClick={handleUpdateProfile}
            disabled={isLoading}
            className="btn-save"
          >
            {isLoading ? (
              <>
                <div className="spinner"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default MobileFormCard;
