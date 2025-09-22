import React from 'react';
import { User, Shield, Building } from 'lucide-react';

const MobileProfileCard = ({ user }) => {
  const isAdmin = user?.role === 'admin';

  return (
    <div className="mobile-card profile-card">
      <div className="profile-avatar">
        {isAdmin ? <Shield size={32} /> : <User size={32} />}
      </div>
      
      <div className="profile-info">
        <h1 className="profile-name">{user.username}</h1>
        <div className="profile-email">{user.email}</div>
        
        <div className="profile-badges">
          <div className="badge">
            {isAdmin ? <Shield size={14} /> : <Building size={14} />}
            <span>{isAdmin ? 'Admin' : user.department}</span>
          </div>
          
          <div className="badge status">
            <div className="status-dot"></div>
            <span>Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileProfileCard;
