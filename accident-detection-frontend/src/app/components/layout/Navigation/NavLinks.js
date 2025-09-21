// Updated NavLinks.js with mobile hamburger menu including user profile
import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X, User, Settings, LogOut, Shield } from 'lucide-react';
import { getNavItems } from '../../../utils/navigation';
import { useAuth } from '../../../contexts/AuthContext';

const NavLinks = ({ user }) => {
  const { logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navItems = getNavItems(user);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    closeMobileMenu();
  };

  return (
    <>
      {/* Desktop Navigation */}
      <div className="nav-links desktop-nav" style={{ display: 'flex', gap: '0.5rem' }}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              color: '#374151',
              textDecoration: 'none',
              fontWeight: '500',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
              e.currentTarget.style.color = '#3b82f6';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#374151';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>

      {/* Mobile Hamburger Button */}
      <button
        className="mobile-menu-button"
        onClick={toggleMobileMenu}
        style={{
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          background: 'transparent',
          border: '2px solid #e2e8f0',
          borderRadius: '8px',
          cursor: 'pointer',
          color: '#374151',
          transition: 'all 0.2s ease'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = '#f3f4f6';
          e.currentTarget.style.borderColor = '#3b82f6';
          e.currentTarget.style.color = '#3b82f6';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = '#e2e8f0';
          e.currentTarget.style.color = '#374151';
        }}
      >
        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-nav-overlay"
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            display: 'none'
          }}
          onClick={closeMobileMenu}
        >
          <div 
            className="mobile-nav-menu"
            style={{
              position: 'fixed',
              top: '0',
              right: '0',
              height: '100vh',
              width: '240px',
              maxWidth: '75vw',
              background: 'white',
              boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.15)',
              padding: '1rem 1rem',
              transform: 'translateX(0)',
              transition: 'transform 0.3s ease',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Menu Header with User Profile */}
            <div style={{
              marginBottom: '1rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid #e5e7eb'
            }}>
              {/* Header with close button */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: user ? '1rem' : '0'
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  color: '#111827'
                }}>
                  {user ? 'Menu' : 'Navigation'}
                </h3>
                <button
                  onClick={closeMobileMenu}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '28px',
                    height: '28px',
                    background: 'transparent',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: '#6b7280'
                  }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* User Profile Section (only show if user is logged in) */}
              {user && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
                  borderRadius: '10px',
                  marginBottom: '0.5rem'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '40px',
                    height: '40px',
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    color: 'white',
                    borderRadius: '50%',
                    flexShrink: 0
                  }}>
                    <User size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: '0 0 0.2rem 0',
                      fontWeight: '600',
                      color: '#111827',
                      fontSize: '0.9rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {user.username}
                    </p>
                    {user.email && (
                      <p style={{
                        margin: '0 0 0.4rem 0',
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {user.email}
                      </p>
                    )}
                    {user.role && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        fontSize: '0.7rem',
                        fontWeight: '500',
                        padding: '0.2rem 0.4rem',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        background: user.role === 'admin' 
                          ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
                          : '#e5e7eb',
                        color: user.role === 'admin' ? 'white' : '#374151'
                      }}>
                        {user.role === 'admin' && <Shield size={10} />}
                        {user.role}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Items */}
            <div className="mobile-nav-items">
              {navItems.map((item, index) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 0',
                    color: '#374151',
                    textDecoration: 'none',
                    fontWeight: '500',
                    fontSize: '0.9rem',
                    borderBottom: (index < navItems.length - 1 || user) ? '1px solid #f3f4f6' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.color = '#3b82f6';
                    e.currentTarget.style.paddingLeft = '0.25rem';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.color = '#374151';
                    e.currentTarget.style.paddingLeft = '0';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '36px',
                    height: '36px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: '8px',
                    flexShrink: 0
                  }}>
                    <item.icon size={16} />
                  </div>
                  <span>{item.label}</span>
                </Link>
              ))}

              {/* User Profile Actions (only show if user is logged in) */}
              {user && (
                <>
                  <button
                    onClick={() => {
                      closeMobileMenu();
                      window.location.href = '/profile';
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 0',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#374151',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      borderBottom: '1px solid #f3f4f6',
                      transition: 'all 0.2s ease',
                      textAlign: 'left'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.color = '#3b82f6';
                      e.currentTarget.style.paddingLeft = '0.25rem';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.color = '#374151';
                      e.currentTarget.style.paddingLeft = '0';
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '36px',
                      height: '36px',
                      background: 'rgba(59, 130, 246, 0.1)',
                      borderRadius: '8px',
                      flexShrink: 0
                    }}>
                      <Settings size={16} />
                    </div>
                    <span>Profile Settings</span>
                  </button>
                  
                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 0',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#dc2626',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                      textAlign: 'left'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.color = '#b91c1c';
                      e.currentTarget.style.paddingLeft = '0.25rem';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.color = '#dc2626';
                      e.currentTarget.style.paddingLeft = '0';
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '36px',
                      height: '36px',
                      background: 'rgba(220, 38, 38, 0.1)',
                      borderRadius: '8px',
                      flexShrink: 0
                    }}>
                      <LogOut size={16} />
                    </div>
                    <span>Sign Out</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CSS Styles */}
      <style jsx>{`
        /* Desktop styles - default */
        .desktop-nav {
          display: flex;
        }
        
        .mobile-menu-button {
          display: none;
        }
        
        .mobile-nav-overlay {
          display: none;
        }

        /* Tablet and Mobile styles */
        @media (max-width: 1024px) {
          .desktop-nav {
            display: none !important;
          }
          
          .mobile-menu-button {
            display: flex !important;
          }
          
          .mobile-nav-overlay {
            display: block !important;
          }
        }

        /* Extra small screens */
        @media (max-width: 480px) {
          .mobile-nav-menu {
            width: 85vw !important;
            max-width: 85vw !important;
            padding: 0.75rem !important;
          }
        }

        /* Animation for mobile menu */
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        .mobile-nav-menu {
          animation: slideInRight 0.3s ease-out;
        }

        /* Smooth transitions */
        .mobile-nav-items a {
          transition: all 0.2s ease;
        }

        .mobile-nav-items a:hover {
          transform: translateX(4px);
        }

        /* Focus styles for accessibility */
        .mobile-menu-button:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }

        .mobile-nav-items a:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
          border-radius: 4px;
        }
      `}</style>
    </>
  );
};

export default NavLinks;
