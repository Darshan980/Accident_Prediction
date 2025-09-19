
import React from 'react';
import Link from 'next/link';

const Logo = ({ isAuthenticated, user }) => {
  const getHref = () => {
    if (!isAuthenticated) return '/auth';
    return user?.role === 'admin' ? '/dashboard' : '/userdashboard';
  };

  return (
    <Link 
      href={getHref()}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        textDecoration: 'none',
        transition: 'transform 0.2s ease'
      }}
      onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
      onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      <span style={{
        fontSize: '1.75rem',
        filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
      }}>
        🚨
      </span>
      <span 
        className="nav-logo-text"
        style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          background: 'linear-gradient(135deg, #3b82f6, #1e40af)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}
      >
        Accident Detection
      </span>
    </Link>
  );
};

export default Logo;
