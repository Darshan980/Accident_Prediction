import React from 'react';
import { User, Lock } from 'lucide-react';

const ProfileTabs = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'general', label: 'General Information', icon: User },
    { id: 'security', label: 'Security', icon: Lock }
  ];

  return (
    <div className="profile-tabs">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setActiveTab(id)}
          className={`tab-button ${activeTab === id ? 'active' : ''}`}
        >
          <Icon size={18} />
          <span className="tab-label">{label}</span>
        </button>
      ))}
    </div>
  );
};

export default ProfileTabs;
