import React from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import LoadingSpinner from '../LoadingSpinner';
import Logo from '../Logo';
import NavLinks from './NavLinks';
import UserMenu from './UserMenu';
import AuthButtons from './AuthButtons';
import '../../../styles/animations.css';

const Navigation = () => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <nav style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        padding: '1rem 0'
      }}>
        <div className="nav-container" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 2rem',
          maxWidth: '1400px',
          margin: '0 auto',
          height: '70px'
        }}>
          <Logo isAuthenticated={isAuthenticated} user={user} />
          <LoadingSpinner size={24} minHeight="auto" />
        </div>
      </nav>
    );
  }

  return (
    <nav style={{
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
      boxShadow: '0 2px 20px rgba(0, 0, 0, 0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      transition: 'all 0.3s ease'
    }}>
      <div className="nav-container" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 2rem',
        maxWidth: '1400px',
        margin: '0 auto',
        height: '70px'
      }}>
        <Logo isAuthenticated={isAuthenticated} user={user} />
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2rem'
        }}>
          {isAuthenticated ? (
            <>
              <NavLinks user={user} />
              <UserMenu user={user} />
            </>
          ) : (
            <AuthButtons />
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
