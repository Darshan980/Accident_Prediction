'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams, useRouter } from 'next/navigation';
import LoginForm from '../../components/LoginForm';
import RegisterForm from '../../components/RegisterForm';
import styles from './AuthPage.module.css';

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
    <div className={styles.authPage}>
      {/* Left Side - Branding/Info */}
      <div className={styles.authBranding}>
        <div className={styles.brandingContent}>
          <div className={styles.logoSection}>
            <div className={styles.logoIcon}>🚗</div>
            <h1 className={styles.brandTitle}>AccidentGuard</h1>
            <p className={styles.brandSubtitle}>AI-Powered Accident Prevention System</p>
          </div>
          
          <div className={styles.featuresList}>
            <div className={styles.featureItem}>
              <span className={styles.featureIcon}>⚡</span>
              <span>Real-time Detection</span>
            </div>
            <div className={styles.featureItem}>
              <span className={styles.featureIcon}>🛡️</span>
              <span>Advanced Safety Analytics</span>
            </div>
            <div className={styles.featureItem}>
              <span className={styles.featureIcon}>📊</span>
              <span>Comprehensive Reports</span>
            </div>
          </div>
          
          <div className={styles.testimonial}>
            <blockquote>
              "Reduced accidents by 65% in our fleet operations"
            </blockquote>
            <cite>- Transport Manager</cite>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Forms */}
      <div className={styles.authForms}>
        <div className={styles.formContainer}>
          {/* Header */}
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>
              {isAdmin ? 'Admin Access' : isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className={styles.formDescription}>
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
            <div className={styles.adminNotice}>
              <div className={styles.adminNoticeContent}>
                <span className={styles.adminIcon}>👨‍💼</span>
                <div>
                  <strong>Admin Login Mode</strong>
                  <p>Enhanced security access required</p>
                </div>
              </div>
              <a href="/auth" className={styles.backLink}>← Regular Login</a>
            </div>
          )}

          {/* Mode Toggle (only for non-admin) */}
          {!isAdmin && (
            <div className={styles.modeToggle}>
              <button
                onClick={switchToLogin}
                className={`${styles.toggleBtn} ${isLogin ? styles.active : ''}`}
              >
                Sign In
              </button>
              <button
                onClick={switchToRegister}
                className={`${styles.toggleBtn} ${!isLogin ? styles.active : ''}`}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Auth Forms */}
          <div className={styles.formWrapper}>
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
          <div className={styles.formFooter}>
            {!isAdmin && isLogin && (
              <a href="/auth?admin=true" className={styles.adminLink}>
                Admin Portal →
              </a>
            )}
            
            <div className={styles.helpLinks}>
              <a href="/forgot-password">Forgot Password?</a>
              <a href="/help">Need Help?</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
