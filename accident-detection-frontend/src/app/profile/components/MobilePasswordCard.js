import React from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

const MobilePasswordCard = ({ 
  formData, 
  handleInputChange, 
  isLoading, 
  showPasswords, 
  togglePasswordVisibility, 
  handleChangePassword 
}) => {
  const getPasswordStrength = (password) => {
    if (password.length >= 8) return 'Strong';
    if (password.length >= 6) return 'Medium';
    return 'Weak';
  };

  const isFormValid = formData.currentPassword && 
    formData.newPassword && 
    formData.confirmPassword && 
    formData.newPassword === formData.confirmPassword;

  return (
    <div className="mobile-card">
      <div className="card-header">
        <h2>Change Password</h2>
      </div>

      <div className="form-fields">
        <div className="field">
          <label>Current Password</label>
          <div className="input-group">
            <Lock size={16} />
            <input
              type={showPasswords.current ? 'text' : 'password'}
              value={formData.currentPassword}
              onChange={(e) => handleInputChange('currentPassword', e.target.value)}
              placeholder="Current password"
            />
            <button 
              type="button"
              onClick={() => togglePasswordVisibility('current')}
              className="toggle-password"
            >
              {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="field">
          <label>New Password</label>
          <div className="input-group">
            <Lock size={16} />
            <input
              type={showPasswords.new ? 'text' : 'password'}
              value={formData.newPassword}
              onChange={(e) => handleInputChange('newPassword', e.target.value)}
              placeholder="New password"
            />
            <button 
              type="button"
              onClick={() => togglePasswordVisibility('new')}
              className="toggle-password"
            >
              {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {formData.newPassword && (
            <div className="password-strength">
              Strength: <span className={`strength-${getPasswordStrength(formData.newPassword).toLowerCase()}`}>
                {getPasswordStrength(formData.newPassword)}
              </span>
            </div>
          )}
        </div>

        <div className="field">
          <label>Confirm Password</label>
          <div className="input-group">
            <Lock size={16} />
            <input
              type={showPasswords.confirm ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              placeholder="Confirm new password"
              className={formData.confirmPassword && formData.newPassword && 
                        formData.confirmPassword !== formData.newPassword ? 'error' : ''}
            />
            <button 
              type="button"
              onClick={() => togglePasswordVisibility('confirm')}
              className="toggle-password"
            >
              {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {formData.confirmPassword && formData.newPassword && 
           formData.confirmPassword !== formData.newPassword && (
            <div className="error-text">Passwords don't match</div>
          )}
        </div>

        <button
          onClick={handleChangePassword}
          disabled={isLoading || !isFormValid}
          className="btn-danger"
        >
          {isLoading ? (
            <>
              <div className="spinner"></div>
              Changing...
            </>
          ) : (
            <>
              <Lock size={16} />
              Change Password
            </>
          )}
        </button>

        <div className="password-tips">
          <h4>Password Requirements:</h4>
          <ul>
            <li>At least 6 characters</li>
            <li>Different from current password</li>
            <li>Mix of letters and numbers recommended</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MobilePasswordCard;
