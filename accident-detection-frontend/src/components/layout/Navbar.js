'use client';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { User, LogOut, Settings, ChevronDown, Home, Upload, Video, BarChart3, Shield, Menu, X } from 'lucide-react';

const Navigation = ({ user, isAuthenticated, logout, isLoading }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && 
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target) &&
          !event.target.closest('.mobile-menu-button')) {
        setShowMobileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu when window is resized to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setShowMobileMenu(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    setShowMobileMenu(false);
  };

  const handleMobileLinkClick = () => {
    setShowMobileMenu(false);
  };

  // Dynamic navigation items based on user role
  const getNavItems = () => {
    const baseItems = [
      { 
        href: user?.role === 'admin' ? '/dashboard' : '/userdashboard',
        icon: Home, 
        label: 'Dashboard' 
      },
      { 
        href: user?.role === 'admin' ? '/admin/upload' : '/upload',
        icon: Upload, 
        label: 'Upload' 
      },
      { 
        href: '/live', 
        icon: Video, 
        label: 'Live Feed' 
      },
      { 
        href: user?.role === 'admin' ? '/admin/results' : '/results',
        icon: BarChart3, 
        label: 'Results' 
      }
    ];

    if (user?.role === 'admin') {
      baseItems.push(
        { href: '/admin/users', icon: User, label: 'User Management' },
        { href: '/admin/settings', icon: Settings, label: 'System Settings' }
      );
    }

    return baseItems;
  };

  const navItems = getNavItems();

  if (isLoading) {
    return (
      <nav className="nav-loading">
        <div className="nav-container">
          <div className="nav-logo">
            <span className="logo-icon">🚨</span>
            <span className="logo-text">Accident Detection</span>
          </div>
          <div className="loading-spinner"></div>
        </div>
      </nav>
    );
  }

  return (
    <>
      <nav className="navigation">
        <div className="nav-container">
          {/* Logo */}
          <div className="nav-logo">
            <Link 
              href={isAuthenticated ? (user?.role === 'admin' ? '/dashboard' : '/userdashboard') : '/'}
              className="logo-link"
            >
              <span className="logo-icon">🚨</span>
              <span className="logo-text">Accident Detection</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="nav-content desktop-nav">
            {isAuthenticated ? (
              <>
                {/* Navigation Links */}
                <div className="nav-links">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="nav-link"
                    >
                      <item.icon size={18} />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>

                {/* User Menu */}
                <div className="user-menu-container">
                  <button
                    ref={buttonRef}
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className={`user-menu-button ${showUserMenu ? 'active' : ''}`}
                  >
                    <div className="user-avatar">
                      <User size={18} />
                    </div>
                    <div className="user-info">
                      <span className="user-name">{user?.username || 'User'}</span>
                      {user?.email && (
                        <span className="user-email">{user.email}</span>
                      )}
                    </div>
                    <ChevronDown 
                      size={16} 
                      className={`chevron ${showUserMenu ? 'rotated' : ''}`}
                    />
                  </button>

                  {/* Desktop Dropdown Menu */}
                  {showUserMenu && (
                    <div ref={menuRef} className="dropdown-menu">
                      <div className="dropdown-header">
                        <div className="dropdown-user-avatar">
                          <User size={20} />
                        </div>
                        <div className="dropdown-user-info">
                          <p className="dropdown-user-name">{user?.username}</p>
                          {user?.email && (
                            <p className="dropdown-user-email">{user.email}</p>
                          )}
                          {user?.role && (
                            <span className={`user-badge ${user.role === 'admin' ? 'admin' : 'user'}`}>
                              {user.role === 'admin' && <Shield size={12} />}
                              {user.role || 'User'}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="dropdown-items">
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            window.location.href = '/profile';
                          }}
                          className="dropdown-item"
                        >
                          <Settings size={16} />
                          Profile Settings
                        </button>
                        
                        <div className="dropdown-divider"></div>
                        
                        <button
                          onClick={handleLogout}
                          className="dropdown-item logout"
                        >
                          <LogOut size={16} />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="auth-links">
                <Link href="/auth" className="auth-link">
                  <User size={18} />
                  Sign In
                </Link>
                <Link href="/auth?mode=register" className="auth-link register">
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Navigation */}
          <div className="mobile-nav">
            {isAuthenticated ? (
              <>
                {/* Mobile Hamburger Button */}
                <button
                  className="mobile-menu-button"
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  aria-label="Toggle mobile menu"
                >
                  {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
                </button>

                {/* Mobile User Avatar */}
                <div className="mobile-user-avatar">
                  <User size={20} />
                </div>
              </>
            ) : (
              <Link href="/auth" className="mobile-auth-button">
                <User size={20} />
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {showMobileMenu && (
          <div className="mobile-menu-overlay">
            <div ref={mobileMenuRef} className="mobile-menu">
              {/* Mobile User Info */}
              <div className="mobile-user-section">
                <div className="mobile-user-header">
                  <div className="mobile-user-avatar-large">
                    <User size={24} />
                  </div>
                  <div className="mobile-user-details">
                    <h3 className="mobile-user-name">{user?.username || 'User'}</h3>
                    {user?.email && (
                      <p className="mobile-user-email">{user.email}</p>
                    )}
                    {user?.role && (
                      <span className={`user-badge ${user.role === 'admin' ? 'admin' : 'user'}`}>
                        {user.role === 'admin' && <Shield size={12} />}
                        {user.role || 'User'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Mobile Navigation Links */}
              <div className="mobile-nav-links">
                <h4 className="mobile-nav-section-title">Navigation</h4>
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="mobile-nav-link"
                    onClick={handleMobileLinkClick}
                  >
                    <item.icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>

              {/* Mobile Menu Actions */}
              <div className="mobile-menu-actions">
                <h4 className="mobile-nav-section-title">Account</h4>
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    window.location.href = '/profile';
                  }}
                  className="mobile-nav-link"
                >
                  <Settings size={20} />
                  Profile Settings
                </button>
                
                <button
                  onClick={handleLogout}
                  className="mobile-nav-link logout"
                >
                  <LogOut size={20} />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      <style jsx>{`
        .navigation {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
          box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
          position: sticky;
          top: 0;
          z-index: 1000;
          transition: all 0.3s ease;
        }

        .nav-loading {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
          position: sticky;
          top: 0;
          z-index: 1000;
          padding: 1rem 0;
        }

        .nav-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 2rem;
          max-width: 1400px;
          margin: 0 auto;
          height: 70px;
        }

        .nav-logo {
          display: flex;
          align-items: center;
        }

        .logo-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          text-decoration: none;
          transition: transform 0.2s ease;
        }

        .logo-link:hover {
          transform: scale(1.02);
        }

        .logo-icon {
          font-size: 1.75rem;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
        }

        .logo-text {
          font-size: 1.5rem;
          font-weight: 700;
          background: linear-gradient(135deg, #3b82f6, #1e40af);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .nav-content {
          display: flex;
          align-items: center;
          gap: 2rem;
        }

        .mobile-nav {
          display: none;
          align-items: center;
          gap: 0.75rem;
        }

        .nav-links {
          display: flex;
          gap: 0.5rem;
        }

        /* Mobile Responsive Breakpoints */
        @media screen and (max-width: 768px) {
          .nav-content.desktop-nav {
            display: none !important;
          }

          .mobile-nav {
            display: flex !important;
            align-items: center !important;
            gap: 0.75rem !important;
          }

          .nav-links {
            display: none !important;
          }

          .auth-links {
            display: none !important;
          }

          .user-menu-container {
            display: none !important;
          }

          .nav-container {
            padding: 0 1rem;
            height: 60px;
          }

          .logo-icon {
            font-size: 1.5rem;
          }

          .logo-text {
            font-size: 1.25rem;
          }

          .mobile-menu-overlay {
            top: 60px;
          }

          .mobile-menu-button {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: linear-gradient(135deg, #3b82f6, #2563eb) !important;
            color: white !important;
            border: 2px solid #3b82f6 !important;
            width: 44px !important;
            height: 44px !important;
          }

          .mobile-user-avatar {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 40px !important;
            height: 40px !important;
            background: linear-gradient(135deg, #3b82f6, #2563eb) !important;
            color: white !important;
            border-radius: 50% !important;
          }
        }

        .nav-links {
          display: flex;
          gap: 0.5rem;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          color: #374151;
          text-decoration: none;
          font-weight: 500;
          border-radius: 8px;
          transition: all 0.2s ease;
          position: relative;
        }

        .nav-link:hover {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          transform: translateY(-1px);
        }

        .user-menu-container {
          position: relative;
        }

        .user-menu-button {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 500;
          color: #334155;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .user-menu-button:hover,
        .user-menu-button.active {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border-color: #3b82f6;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
          transform: translateY(-1px);
        }

        .user-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: rgba(59, 130, 246, 0.1);
          border-radius: 50%;
          transition: all 0.3s ease;
        }

        .user-menu-button:hover .user-avatar,
        .user-menu-button.active .user-avatar {
          background: rgba(255, 255, 255, 0.2);
        }

        .user-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .user-name {
          font-size: 0.9rem;
          font-weight: 600;
          line-height: 1.2;
        }

        .user-email {
          font-size: 0.75rem;
          opacity: 0.7;
          line-height: 1.2;
        }

        .chevron {
          transition: transform 0.3s ease;
        }

        .chevron.rotated {
          transform: rotate(180deg);
        }

        .dropdown-menu {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 0.5rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
          min-width: 280px;
          z-index: 1000;
          overflow: hidden;
          animation: dropdownSlide 0.2s ease-out;
        }

        @keyframes dropdownSlide {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .dropdown-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border-bottom: 1px solid #e5e7eb;
        }

        .dropdown-user-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border-radius: 50%;
        }

        .dropdown-user-info {
          flex: 1;
        }

        .dropdown-user-name {
          margin: 0 0 0.25rem 0;
          font-weight: 600;
          color: #111827;
          font-size: 0.95rem;
        }

        .dropdown-user-email {
          margin: 0 0 0.5rem 0;
          font-size: 0.8rem;
          color: #6b7280;
        }

        .user-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          font-weight: 500;
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          text-transform: uppercase;
        }

        .user-badge.admin {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          color: white;
        }

        .user-badge.user {
          background: #e5e7eb;
          color: #374151;
        }

        .dropdown-items {
          padding: 0.5rem;
        }

        .dropdown-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          background: transparent;
          border: none;
          cursor: pointer;
          color: #374151;
          border-radius: 8px;
          transition: all 0.2s ease;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .dropdown-item:hover {
          background: #f3f4f6;
          color: #111827;
          transform: translateX(4px);
        }

        .dropdown-item.logout {
          color: #dc2626;
        }

        .dropdown-item.logout:hover {
          background: #fef2f2;
          color: #b91c1c;
        }

        .dropdown-divider {
          height: 1px;
          background: #e5e7eb;
          margin: 0.5rem 0;
        }

        .auth-links {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .auth-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          color: #374151;
          text-decoration: none;
          font-weight: 500;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .auth-link:hover {
          background: #f3f4f6;
          color: #111827;
          transform: translateY(-1px);
        }

        .auth-link.register {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);
        }

        .auth-link.register:hover {
          background: linear-gradient(135deg, #059669, #047857);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
        }

        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid #f3f4f6;
          border-top: 2px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Mobile Styles */
        .mobile-menu-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          cursor: pointer;
          color: #374151;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .mobile-menu-button:hover {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border-color: #3b82f6;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
          transform: translateY(-1px);
        }

        .mobile-user-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border-radius: 50%;
          margin-left: 0.75rem;
        }

        .mobile-auth-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border-radius: 12px;
          text-decoration: none;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);
        }

        .mobile-auth-button:hover {
          background: linear-gradient(135deg, #059669, #047857);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
          transform: translateY(-1px);
        }

        .mobile-menu-overlay {
          position: fixed;
          top: 70px;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 999;
          animation: fadeIn 0.3s ease;
        }

        .mobile-menu {
          background: white;
          height: 100%;
          width: 100%;
          max-width: 400px;
          margin-left: auto;
          box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
          overflow-y: auto;
          animation: slideInRight 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        .mobile-user-section {
          padding: 2rem;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border-bottom: 1px solid #e5e7eb;
        }

        .mobile-user-header {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .mobile-user-avatar-large {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border-radius: 50%;
        }

        .mobile-user-details {
          flex: 1;
        }

        .mobile-user-name {
          margin: 0 0 0.5rem 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
        }

        .mobile-user-email {
          margin: 0 0 0.75rem 0;
          font-size: 0.9rem;
          color: #6b7280;
        }

        .mobile-nav-links,
        .mobile-menu-actions {
          padding: 1.5rem;
        }

        .mobile-nav-section-title {
          margin: 0 0 1rem 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .mobile-nav-link {
          display: flex;
          align-items: center;
          gap: 1rem;
          width: 100%;
          padding: 1rem;
          margin-bottom: 0.5rem;
          background: transparent;
          border: none;
          color: #374151;
          text-decoration: none;
          font-size: 1rem;
          font-weight: 500;
          border-radius: 12px;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .mobile-nav-link:hover {
          background: #f3f4f6;
          color: #111827;
          transform: translateX(8px);
        }

        .mobile-nav-link.logout {
          color: #dc2626;
          margin-top: 0.5rem;
        }

        .mobile-nav-link.logout:hover {
          background: #fef2f2;
          color: #b91c1c;
        }

        /* Mobile Responsive Breakpoints */
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }

          .mobile-nav {
            display: flex !important;
            align-items: center;
          }

          .nav-container {
            padding: 0 1rem;
            height: 60px;
          }

          .logo-icon {
            font-size: 1.5rem;
          }

          .logo-text {
            font-size: 1.25rem;
          }

          .mobile-menu-overlay {
            top: 60px;
          }
        }

        @media (max-width: 480px) {
          .nav-container {
            padding: 0 0.75rem;
            height: 55px;
          }

          .logo-icon {
            font-size: 1.25rem;
          }

          .logo-text {
            font-size: 1.125rem;
          }

          .mobile-menu-button,
          .mobile-auth-button {
            width: 40px;
            height: 40px;
          }

          .mobile-user-avatar {
            width: 36px;
            height: 36px;
          }

          .mobile-menu-overlay {
            top: 55px;
          }

          .mobile-user-section {
            padding: 1.5rem;
          }

          .mobile-user-avatar-large {
            width: 50px;
            height: 50px;
          }

          .mobile-user-name {
            font-size: 1.125rem;
          }

          .mobile-nav-links,
          .mobile-menu-actions {
            padding: 1rem;
          }
        }

        @media (max-width: 360px) {
          .logo-text {
            display: none;
          }

          .nav-container {
            padding: 0 0.5rem;
          }

          .mobile-menu {
            max-width: 100%;
          }

          .mobile-user-section {
            padding: 1rem;
          }

          .mobile-user-avatar-large {
            width: 45px;
            height: 45px;
          }

          .mobile-user-name {
            font-size: 1rem;
          }

          .mobile-user-email {
            font-size: 0.8rem;
          }
        }

        /* Force mobile nav visibility */
        @media screen and (max-width: 768px) {
          .mobile-nav {
            display: flex !important;
            align-items: center !important;
            gap: 0.75rem;
          }

          .desktop-nav {
            display: none !important;
          }

          .mobile-menu-button {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
        }
      `}</style>
    </>
  );
};

export default Navigation;
