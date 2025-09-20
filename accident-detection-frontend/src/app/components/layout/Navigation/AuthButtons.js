'use client';
import React from 'react';
import Link from 'next/link';
import { User } from 'lucide-react';

const AuthButtons = () => (
  <>
    <div className="auth-buttons-wrapper" style={{
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

    <style jsx>{`
      .auth-buttons-wrapper {
        display: flex;
        gap: 1rem;
        align-items: center;
      }

      /* Hide auth buttons on mobile devices */
      @media (max-width: 768px) {
        .auth-buttons-wrapper {
          display: none !important;
        }
      }

      /* Also hide on tablets if needed */
      @media (max-width: 1024px) and (orientation: portrait) {
        .auth-buttons-wrapper {
          display: none !important;
        }
      }

      /* Hide on very small screens */
      @media (max-width: 480px) {
        .auth-buttons-wrapper {
          display: none !important;
        }
      }
    `}</style>
  </>
);

export default AuthButtons;
