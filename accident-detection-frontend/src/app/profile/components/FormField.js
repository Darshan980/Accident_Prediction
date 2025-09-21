import React from 'react';

const FormField = ({ 
  label, 
  icon: Icon, 
  type = 'text', 
  value, 
  onChange, 
  disabled = false, 
  placeholder = '', 
  warning = null,
  error = null 
}) => {
  return (
    <div className="form-field">
      <label className="form-label">{label}</label>
      <div className="form-input-container">
        <Icon size={18} className="form-input-icon" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`form-input ${disabled ? 'disabled' : ''} ${error ? 'error' : ''}`}
          placeholder={placeholder}
        />
      </div>
      {warning && <p className="form-warning">{warning}</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
};

export default FormField;
