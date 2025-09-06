'use client';
import Link from 'next.js';
import { Shield, ArrowLeft } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
      color: 'white',
      padding: '1rem'
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '500px'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 2rem auto'
        }}>
          <Shield size={40} color="white" />
        </div>
        
        <h1 style={{
          fontSize: '3rem',
          fontWeight: 'bold',
          marginBottom: '1rem'
        }}>
          403
        </h1>
        
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '600',
          marginBottom: '1rem',
          opacity: 0.9
        }}>
          Access Denied
        </h2>
        
        <p style={{
          fontSize: '1.1rem',
          marginBottom: '2rem',
          opacity: 0.8,
          lineHeight: 1.6
        }}>
          You don&apos;t have the necessary permissions to access this resource. 
          Please contact your administrator if you believe this is an error.
        </p>
        
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <Link 
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            <ArrowLeft size={18} />
            Go Home
          </Link>
          
          <Link 
            href="/auth/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: 'white',
              color: '#dc3545',
              textDecoration: 'none',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#f8f9fa';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'white';
            }}
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}