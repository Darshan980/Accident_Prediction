// app/dashboard/components/mobile/MobileBottomNav.jsx
import React from 'react';

const MobileBottomNav = ({ activeTab, setActiveTab, unresolvedCount }) => {
  const navItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: '📊',
      badge: null
    },
    {
      id: 'logs',
      label: 'Logs',
      icon: '📋',
      badge: unresolvedCount > 0 ? unresolvedCount : null
    },
    {
      id: 'filters',
      label: 'Filters',
      icon: '🔍',
      badge: null
    }
  ];

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'white',
      borderTop: '1px solid #e5e5e5',
      padding: '0.5rem 0',
      boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
      zIndex: 1000
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center'
      }}>
        {navItems.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            isActive={activeTab === item.id}
            onClick={() => setActiveTab(item.id)}
          />
        ))}
      </div>
    </div>
  );
};

const NavItem = ({ item, isActive, onClick }) => (
  <button
    onClick={onClick}
    style={{
      backgroundColor: 'transparent',
      border: 'none',
      padding: '0.5rem 1rem',
      borderRadius: '8px',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.25rem',
      position: 'relative',
      minWidth: '60px',
      transition: 'all 0.2s ease'
    }}
  >
    <div style={{ position: 'relative' }}>
      <span style={{ 
        fontSize: '1.5rem',
        filter: isActive ? 'none' : 'grayscale(50%)',
        opacity: isActive ? 1 : 0.7
      }}>
        {item.icon}
      </span>
      
      {item.badge && (
        <div style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          backgroundColor: '#dc3545',
          color: 'white',
          borderRadius: '50%',
          width: '18px',
          height: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.7rem',
          fontWeight: 'bold',
          border: '2px solid white'
        }}>
          {item.badge > 99 ? '99+' : item.badge}
        </div>
      )}
    </div>
    
    <span style={{
      fontSize: '0.7rem',
      fontWeight: isActive ? 'bold' : 'normal',
      color: isActive ? '#0070f3' : '#666'
    }}>
      {item.label}
    </span>
    
    {isActive && (
      <div style={{
        position: 'absolute',
        top: '0',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '4px',
        height: '4px',
        backgroundColor: '#0070f3',
        borderRadius: '2px'
      }} />
    )}
  </button>
);

export default MobileBottomNav;
