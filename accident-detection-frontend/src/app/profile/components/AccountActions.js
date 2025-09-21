import React from 'react';
import { Shield } from 'lucide-react';

const AccountActions = ({ user }) => {
  const isAdmin = user?.role === 'admin';

  return (
    <div className="account-actions">
      <h3>Account Actions</h3>
      
      <div className="actions-grid">
        <div className="action-card">
          <h4>Account Status</h4>
          <p>Your account is currently active and in good standing.</p>
          <div className="status-indicator">
            <div className="status-dot active" />
            <span className="status-text">Active</span>
          </div>
        </div>

        <div className="action-card">
          <h4>Quick Stats</h4>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Role</span>
              <span className="stat-value">{user.role}</span>
            </div>
            {user.last_login && (
              <div className="stat-item">
                <span className="stat-label">Last Login</span>
                <span className="stat-value">
                  {new Date(user.last_login).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="admin-notice">
          <div className="admin-notice-header">
            <Shield size={20} />
            <h4>Administrator Account</h4>
          </div>
          <p>
            You have administrator privileges. Please ensure your account credentials are kept secure 
            and avoid sharing access with unauthorized personnel.
          </p>
          {user.admin_level && (
            <p>
              Admin Level: <strong>{user.admin_level}</strong>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default AccountActions;
