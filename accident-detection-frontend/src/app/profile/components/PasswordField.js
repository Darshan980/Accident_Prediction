import React from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

const PasswordField = ({ 
  label, 
  value, 
  onChange, 
  showPassword, 
  onToggleVisibility, 
  placeholder = '', 
  error = null 
}) => {
  return (
    <div className="form-field">
      <label className="form-label">{label}</label>
      <div className="form-input-container">
        <Lock size={18} className="form-input-icon" />
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`form-input password-input ${error ? 'error' : ''}`}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="password-toggle"
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
};

export default PasswordField;
