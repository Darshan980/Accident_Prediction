import React from 'react';
import { User, Shield, Building, Clock } from 'lucide-react';

const ProfileHeader = ({ user }) => {
  const isAdmin = user?.role === 'admin';

  return (
    <div className="profile-header">
      <div className="profile-header-content">
        <div className="profile-avatar">
          {isAdmin ? <Shield size={40} /> : <User size={40} />}
        </div>
        <div className="profile-info">
          <h1 className="profile-username">{user.username}</h1>
          <p className="profile-email">{user.email}</p>
          <div className="profile-badges">
            <span className="profile-badge">
              {isAdmin ? <Shield size={16} /> : <Building size={16} />}
              {isAdmin ? 'Administrator' : user.department}
            </span>
            {user.loginTime && (
              <span className="profile-login-time">
                <Clock size={14} />
                Last login: {new Date(user.loginTime).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
