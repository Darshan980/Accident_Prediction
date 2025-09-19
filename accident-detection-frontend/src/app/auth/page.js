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
    const url = new URL(window.location);
    url.searchParams.set('mode', 'register');
    window.history.pushState({}, '', url);
  };

  const switchToLogin = () => {
    setIsLogin(true);
    const url = new URL(window.location);
    url.searchParams.delete('mode');
    window.history.pushState({}, '', url);
  };

  return (
    <div className="auth-page">
      {/* Left Side - Branding/Info */}
      <div className="auth-branding">
        <div className="branding-content">
          <div className="logo-section">
            <div className="logo-icon">🚗</div>
            <h1 className="brand-title">AccidentGuard</h1>
            <p className="brand-subtitle">AI-Powered Accident Prevention System</p>
          </div>
          
          <div className="features-list">
            <div className="feature-item">
              <span className="feature-icon">⚡</span>
              <span>Real-time Detection</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🛡️</span>
              <span>Advanced Safety Analytics</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📊</span>
              <span>Comprehensive Reports</span>
            </div>
          </div>
          
          <div className="testimonial">
            <blockquote>
              "Reduced accidents by 65% in our fleet operations"
            </blockquote>
            <cite>- Transport Manager</cite>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Forms */}
      <div className="auth-forms">
        <div className="form-container">
          {/* Header */}
          <div className="form-header">
            <h2 className="form-title">
              {isAdmin ? 'Admin Access' : isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="form-description">
              {isAdmin 
                ? 'Administrative portal access'
                : isLogin 
                ? 'Sign in to your account to continue' 
                : 'Join us to get started with accident prevention'
              }
            </p>
          </div>

          {/* Admin Mode Indicator */}
          {isAdmin && (
            <div className="admin-notice">
              <div className="admin-notice-content">
                <span className="admin-icon">👨‍💼</span>
                <div>
                  <strong>Admin Login Mode</strong>
                  <p>Enhanced security access required</p>
                </div>
              </div>
              <a href="/auth" className="back-link">← Regular Login</a>
            </div>
          )}

          {/* Mode Toggle (only for non-admin) */}
          {!isAdmin && (
            <div className="mode-toggle">
              <button
                onClick={switchToLogin}
                className={`toggle-btn ${isLogin ? 'active' : ''}`}
              >
                Sign In
              </button>
              <button
                onClick={switchToRegister}
                className={`toggle-btn ${!isLogin ? 'active' : ''}`}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Auth Forms */}
          <div className="form-wrapper">
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

          {/* Footer Links */}
          <div className="form-footer">
            {!isAdmin && isLogin && (
              <a href="/auth?admin=true" className="admin-link">
                Admin Portal →
              </a>
            )}
            
            <div className="help-links">
              <a href="/forgot-password">Forgot Password?</a>
              <a href="/help">Need Help?</a>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .auth-page {
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .auth-branding {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          color: white;
          position: relative;
          overflow: hidden;
        }

        .auth-branding::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='7' cy='7' r='7'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") repeat;
          background-size: 60px 60px;
        }

        .branding-content {
          position: relative;
          z-index: 1;
          text-align: center;
          max-width: 400px;
        }

        .logo-section {
          margin-bottom: 3rem;
        }

        .logo-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          display: block;
        }

        .brand-title {
          font-size: 2.5rem;
          font-weight: 700;
          margin: 0 0 0.5rem 0;
          background: linear-gradient(45deg, #fff, #e2e8f0);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .brand-subtitle {
          font-size: 1.1rem;
          opacity: 0.9;
          margin: 0 0 2rem 0;
        }

        .features-list {
          margin-bottom: 3rem;
        }

        .feature-item {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
          font-size: 1.1rem;
        }

        .feature-icon {
          margin-right: 0.75rem;
          font-size: 1.5rem;
        }

        .testimonial {
          background: rgba(255, 255, 255, 0.1);
          padding: 1.5rem;
          border-radius: 12px;
          backdrop-filter: blur(10px);
        }

        .testimonial blockquote {
          font-style: italic;
          margin: 0 0 0.5rem 0;
          font-size: 1.1rem;
        }

        .testimonial cite {
          font-size: 0.9rem;
          opacity: 0.8;
        }

        .auth-forms {
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .form-container {
          width: 100%;
          max-width: 420px;
        }

        .form-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .form-title {
          font-size: 2rem;
          font-weight: 700;
          color: #1a202c;
          margin: 0 0 0.5rem 0;
        }

        .form-description {
          color: #718096;
          font-size: 1rem;
          margin: 0;
        }

        .admin-notice {
          background: linear-gradient(135deg, #fee2e2, #fef2f2);
          border: 1px solid #fca5a5;
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .admin-notice-content {
          display: flex;
          align-items: center;
        }

        .admin-icon {
          font-size: 1.5rem;
          margin-right: 0.75rem;
        }

        .admin-notice strong {
          display: block;
          color: #dc2626;
          font-weight: 600;
        }

        .admin-notice p {
          margin: 0;
          color: #7f1d1d;
          font-size: 0.9rem;
        }

        .back-link {
          color: #dc2626;
          text-decoration: none;
          font-weight: 500;
          font-size: 0.9rem;
        }

        .back-link:hover {
          text-decoration: underline;
        }

        .mode-toggle {
          display: flex;
          background: #f7fafc;
          padding: 4px;
          border-radius: 12px;
          margin-bottom: 2rem;
        }

        .toggle-btn {
          flex: 1;
          padding: 0.75rem 1rem;
          border: none;
          background: transparent;
          color: #718096;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .toggle-btn.active {
          background: white;
          color: #1a202c;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .toggle-btn:hover:not(.active) {
          color: #4a5568;
        }

        .form-wrapper {
          margin-bottom: 2rem;
        }

        .form-footer {
          text-align: center;
        }

        .admin-link {
          display: inline-block;
          color: #667eea;
          text-decoration: none;
          font-weight: 600;
          margin-bottom: 1rem;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .admin-link:hover {
          background: #edf2f7;
          transform: translateY(-1px);
        }

        .help-links {
          display: flex;
          justify-content: center;
          gap: 2rem;
        }

        .help-links a {
          color: #a0aec0;
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.2s ease;
        }

        .help-links a:hover {
          color: #4a5568;
          text-decoration: underline;
        }

        /* Animation for smooth transitions */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .form-wrapper {
          animation: fadeIn 0.4s ease-out;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .auth-page {
            grid-template-columns: 1fr;
            grid-template-rows: auto 1fr;
          }

          .auth-branding {
            padding: 2rem 1rem;
            min-height: auto;
          }

          .branding-content {
            max-width: none;
          }

          .logo-icon {
            font-size: 3rem;
          }

          .brand-title {
            font-size: 2rem;
          }

          .features-list,
          .testimonial {
            display: none;
          }

          .auth-forms {
            padding: 1rem;
          }

          .help-links {
            flex-direction: column;
            gap: 0.5rem;
          }
        }

        @media (max-width: 480px) {
          .form-header {
            margin-bottom: 1.5rem;
          }

          .form-title {
            font-size: 1.75rem;
          }

          .mode-toggle {
            margin-bottom: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
