'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { User, Menu, X } from 'lucide-react';

const AuthButtons = () => {
  const [isMobileAuthMenuOpen, setIsMobileAuthMenuOpen] = useState(false);

  const toggleMobileAuthMenu = () => {
    setIsMobileAuthMenuOpen(!isMobileAuthMenuOpen);
  };

  const closeMobileAuthMenu = () => {
    setIsMobileAuthMenuOpen(false);
  };

  return (
    <>
      {/* Desktop Auth Buttons */}
      <div className="auth-buttons-wrapper desktop-auth" style={{
        display: 'flex',
        gap: '1rem',
        alignItems: 'center'
      }}>
        <Link 
          href="/auth" 
          className="signin-link"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            color: '#374151',
            textDecoration: 'none',
            fontWeight: '500',
            borderRadius: '8px',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#f3f4f6';
            e.currentTarget.style.color = '#111827';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#374151';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <User size={18} />
          Sign In
        </Link>
        <Link 
          href="/auth?mode=register" 
          className="register-link"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: 'white',
            textDecoration: 'none',
            fontWeight: '500',
            borderRadius: '8px',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #059669, #047857)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.35)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #10b981, #059669)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.25)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          Register
        </Link>
      </div>

      {/* Mobile Auth Menu Button */}
      <button
        className="mobile-auth-button"
        onClick={toggleMobileAuthMenu}
        style={{
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          background: 'linear-gradient(135deg, #10b981, #059669)',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          color: 'white',
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, #059669, #047857)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.35)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, #10b981, #059669)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.25)';
        }}
      >
        <User size={18} />
      </button>

      {/* Mobile Auth Menu */}
      {isMobileAuthMenuOpen && (
        <div 
          className="mobile-auth-overlay"
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
          onClick={closeMobileAuthMenu}
        >
          <div 
            className="mobile-auth-menu"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '300px',
              maxWidth: '90vw',
              background: 'white',
              borderRadius: '16px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
              padding: '2rem',
              animation: 'slideInScale 0.3s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Auth Header */}
            <div style={{
              textAlign: 'center',
              marginBottom: '2rem'
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '64px',
                height: '64px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                borderRadius: '50%',
                marginBottom: '1rem'
              }}>
                <User size={28} color="white" />
              </div>
              <h3 style={{
                margin: '0 0 0.5rem 0',
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#111827'
              }}>
                Welcome!
              </h3>
              <p style={{
                margin: 0,
                fontSize: '0.9rem',
                color: '#6b7280'
              }}>
                Sign in to your account or create a new one
              </p>
            </div>

            {/* Mobile Auth Buttons */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <Link 
                href="/auth" 
                onClick={closeMobileAuthMenu}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '1rem 1.25rem',
                  color: '#374151',
                  textDecoration: 'none',
                  fontWeight: '500',
                  borderRadius: '12px',
                  transition: 'all 0.2s ease',
                  border: '2px solid #e5e7eb',
                  fontSize: '1rem'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#f3f4f6';
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.color = '#3b82f6';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.color = '#374151';
                }}
              >
                <User size={18} />
                Sign In
              </Link>
              
              <Link 
                href="/auth?mode=register" 
                onClick={closeMobileAuthMenu}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '1rem 1.25rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  textDecoration: 'none',
                  fontWeight: '500',
                  borderRadius: '12px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                  fontSize: '1rem'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #059669, #047857)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.35)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.25)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Register
              </Link>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        /* Desktop styles */
        .desktop-auth {
          display: flex;
        }
        
        .mobile-auth-button {
          display: none;
        }
        
        .mobile-auth-overlay {
          display: none;
        }

        /* Mobile styles */
        @media (max-width: 1024px) {
          .desktop-auth {
            display: none !important;
          }
          
          .mobile-auth-button {
            display: flex !important;
          }
          
          .mobile-auth-overlay {
            display: block !important;
          }
        }

        /* Animation for mobile auth menu */
        @keyframes slideInScale {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        /* Focus styles */
        .mobile-auth-button:focus {
          outline: 2px solid #10b981;
          outline-offset: 2px;
        }

        .mobile-auth-menu a:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }
      `}</style>
    </>
  );
};

export default AuthButtons;
