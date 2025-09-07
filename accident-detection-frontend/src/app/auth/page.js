//src/app/auth/page.js
'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams, useRouter } from 'next/navigation';
import LoginForm from '../../components/LoginForm';
import RegisterForm from '../../components/RegisterForm';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const { isAuthenticated } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Check if user is already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // Check URL params for mode
  useEffect(() => {
    const mode = searchParams.get('mode');
    const adminMode = searchParams.get('admin');
    
    if (mode === 'register') {
      setIsLogin(false);
    }
    if (adminMode === 'true') {
      setIsAdmin(true);
    }
  }, [searchParams]);

  const switchToRegister = () => {
    setIsLogin(false);
    // Update URL without page reload
    const url = new URL(window.location);
    url.searchParams.set('mode', 'register');
    window.history.pushState({}, '', url);
  };

  const switchToLogin = () => {
    setIsLogin(true);
    // Update URL without page reload
    const url = new URL(window.location);
    url.searchParams.delete('mode');
    window.history.pushState({}, '', url);
  };

  return (
    <>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}>
        {/* Background Pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.1,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Ccircle cx='7' cy='7' r='7'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }} />

        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: '400px',
          zIndex: 1
        }}>
          {/* Mode Toggle Buttons */}
          {!isAdmin && (
            <div style={{
              display: 'flex',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '4px',
              marginBottom: '2rem',
              backdropFilter: 'blur(10px)'
            }}>
              <button
                onClick={switchToLogin}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  backgroundColor: isLogin ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
                  color: isLogin ? '#333' : 'rgba(255, 255, 255, 0.8)',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                Sign In
              </button>
              <button
                onClick={switchToRegister}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  backgroundColor: !isLogin ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
                  color: !isLogin ? '#333' : 'rgba(255, 255, 255, 0.8)',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Admin Mode Indicator */}
          {isAdmin && (
            <div style={{
              backgroundColor: 'rgba(220, 53, 69, 0.1)',
              border: '1px solid rgba(220, 53, 69, 0.3)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem',
              textAlign: 'center',
              color: 'white'
            }}>
              <strong>Admin Login Mode</strong>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', opacity: 0.9 }}>
                <a 
                  href="/auth" 
                  style={{ 
                    color: 'rgba(255, 255, 255, 0.8)', 
                    textDecoration: 'underline' 
                  }}
                >
                  ← Back to regular login
                </a>
              </p>
            </div>
          )}

          {/* Form Container */}
          <div style={{
            transform: 'translateY(0)',
            transition: 'transform 0.3s ease'
          }}>
            {isLogin ? (
              <LoginForm 
                isAdmin={isAdmin}
                onSwitchToRegister={!isAdmin ? switchToRegister : null}
              />
            ) : (
              <RegisterForm 
                onSwitchToLogin={switchToLogin}
              />
            )}
          </div>

          {/* Admin Login Link */}
          {!isAdmin && isLogin && (
            <div style={{
              textAlign: 'center',
              marginTop: '1rem'
            }}>
              <a
                href="/auth?admin=true"
                style={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.9rem',
                  textDecoration: 'underline',
                  transition: 'color 0.2s ease'
                }}
                onMouseOver={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.9)'}
                onMouseOut={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.7)'}
              >
                Admin Login
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Global Styles */}
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Ensure body doesn't have extra margin/padding that might interfere */
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
            'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
            sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        /* Input focus styles for better UX */
        input:focus {
          border-color: #007bff !important;
          box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1) !important;
        }
        
        /* Button hover effects */
        button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        /* Smooth transitions for all interactive elements */
        button, input, a {
          transition: all 0.2s ease;
        }
        
        /* Custom scrollbar for the page */
        ::-webkit-scrollbar {
          width: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
        }
        
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </>
  );
}