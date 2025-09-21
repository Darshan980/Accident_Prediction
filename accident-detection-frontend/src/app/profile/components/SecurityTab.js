import React from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import PasswordField from './PasswordField';

const SecurityTab = ({ 
  formData, 
  handleInputChange, 
  isLoading, 
  showPasswords, 
  togglePasswordVisibility, 
  handleChangePassword 
}) => {
  const getPasswordStrength = (password) => {
    if (password.length >= 8) return { label: 'Strong', color: '#10b981' };
    if (password.length >= 6) return { label: 'Medium', color: '#f59e0b' };
    return { label: 'Weak', color: '#ef4444' };
  };

  const isFormValid = formData.currentPassword && 
    formData.newPassword && 
    formData.confirmPassword && 
    formData.newPassword === formData.confirmPassword;

  return (
    <div className="tab-panel">
      <h3>Change Password</h3>

      <div className="form-grid">
        <PasswordField
          label="Current Password"
          value={formData.currentPassword}
          onChange={(value) => handleInputChange('currentPassword', value)}
          showPassword={showPasswords.current}
          onToggleVisibility={() => togglePasswordVisibility('current')}
          placeholder="Enter current password"
        />

        <PasswordField
          label="New Password"
          value={formData.newPassword}
          onChange={(value) => handleInputChange('newPassword', value)}
          showPassword={showPasswords.new}
          onToggleVisibility={() => togglePasswordVisibility('new')}
          placeholder="Enter new password"
        />

        {formData.newPassword && (
          <div className="password-strength">
            <span>Password strength: </span>
            <span 
              style={{ 
                color: getPasswordStrength(formData.newPassword).color,
                fontWeight: '500'
              }}
            >
              {getPasswordStrength(formData.newPassword).label}
            </span>
          </div>
        )}

        <PasswordField
          label="Confirm New Password"
          value={formData.confirmPassword}
          onChange={(value) => handleInputChange('confirmPassword', value)}
          showPassword={showPasswords.confirm}
          onToggleVisibility={() => togglePasswordVisibility('confirm')}
          placeholder="Confirm new password"
          error={formData.confirmPassword && formData.newPassword && 
                 formData.confirmPassword !== formData.newPassword ? 
                 "Passwords do not match" : null}
        />

        <button
          onClick={handleChangePassword}
          disabled={isLoading || !isFormValid}
          className="btn btn-danger btn-lg"
        >
          {isLoading ? (
            <>
              <div className="spinner-sm" />
              Updating Password...
            </>
          ) : (
            <>
              <Lock size={18} />
              Change Password
            </>
          )}
        </button>
      </div>

      <div className="password-requirements">
        <h5>Password Requirements</h5>
        <ul>
          <li>At least 6 characters long</li>
          <li>Must be different from your current password</li>
          <li>Should contain a mix of letters, numbers, and special characters (recommended)</li>
          <li>Avoid using personal information like your name or email</li>
        </ul>
      </div>
    </div>
  );
};

export default SecurityTab;
