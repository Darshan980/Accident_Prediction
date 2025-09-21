import React, { useState, useRef } from 'react';
import { User, LogOut, Settings, ChevronDown, Shield } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useClickOutside } from '../../../hooks/useClickOutside';

const UserMenu = ({ user }) => {
  const { logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  useClickOutside([menuRef, buttonRef], () => setShowUserMenu(false));

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  return (
    <>
      <div className="user-menu-wrapper" style={{ position: 'relative' }}>
        <button
          ref={buttonRef}
          onClick={() => setShowUserMenu(!showUserMenu)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.5rem 1rem',
            background: showUserMenu 
              ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
              : 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
            border: `2px solid ${showUserMenu ? '#3b82f6' : '#e2e8f0'}`,
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: '500',
            color: showUserMenu ? 'white' : '#334155',
            transition: 'all 0.3s ease',
            boxShadow: showUserMenu 
              ? '0 4px 12px rgba(59, 130, 246, 0.25)'
              : '0 2px 8px rgba(0, 0, 0, 0.05)',
            transform: showUserMenu ? 'translateY(-1px)' : 'translateY(0)'
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            background: showUserMenu 
              ? 'rgba(255, 255, 255, 0.2)'
              : 'rgba(59, 130, 246, 0.1)',
            borderRadius: '50%',
            transition: 'all 0.3s ease'
          }}>
            <User size={18} />
          </div>
          <div 
            className="user-menu-details"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start'
            }}
          >
            <span style={{
              fontSize: '0.9rem',
              fontWeight: '600',
              lineHeight: '1.2'
            }}>
              {user?.username || 'User'}
            </span>
            {user?.email && (
              <span style={{
                fontSize: '0.75rem',
                opacity: '0.7',
                lineHeight: '1.2'
              }}>
                {user.email}
              </span>
            )}
          </div>
          <ChevronDown 
            size={16} 
            style={{
              transition: 'transform 0.3s ease',
              transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0deg)'
            }}
          />
        </button>

        {showUserMenu && (
          <div 
            ref={menuRef} 
            className="dropdown-menu"
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '0.5rem',
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
              minWidth: '280px',
              zIndex: 1000,
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1.25rem',
              background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: 'white',
                borderRadius: '50%'
              }}>
                <User size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{
                  margin: '0 0 0.25rem 0',
                  fontWeight: '600',
                  color: '#111827',
                  fontSize: '0.95rem'
                }}>
                  {user?.username}
                </p>
                {user?.email && (
                  <p style={{
                    margin: '0 0 0.5rem 0',
                    fontSize: '0.8rem',
                    color: '#6b7280'
                  }}>
                    {user.email}
                  </p>
                )}
                {user?.role && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '6px',
                    textTransform: 'uppercase',
                    background: user.role === 'admin' 
                      ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
                      : '#e5e7eb',
                    color: user.role === 'admin' ? 'white' : '#374151'
                  }}>
                    {user.role === 'admin' && <Shield size={12} />}
                    {user.role || 'User'}
                  </span>
                )}
              </div>
            </div>
            
            {/* Menu Items */}
            <div style={{ padding: '0.5rem' }}>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  window.location.href = '/profile';
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.875rem 1rem',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#374151',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#f3f4f6';
                  e.currentTarget.style.color = '#111827';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#374151';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <Settings size={16} />
                Profile Settings
              </button>
              
              <div style={{
                height: '1px',
                background: '#e5e7eb',
                margin: '0.5rem 0'
              }} />
              
              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.875rem 1rem',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#dc2626',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#fef2f2';
                  e.currentTarget.style.color = '#b91c1c';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#dc2626';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CSS Styles - Hide on mobile/tablet */}
      <style jsx>{`
        .user-menu-wrapper {
          display: block;
        }

        /* Hide user menu on mobile and tablet */
        @media (max-width: 1024px) {
          .user-menu-wrapper {
            display: none !important;
          }
        }

        /* Focus styles for accessibility */
        .user-menu-wrapper button:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }
      `}</style>
    </>
  );
};

export default UserMenu;
