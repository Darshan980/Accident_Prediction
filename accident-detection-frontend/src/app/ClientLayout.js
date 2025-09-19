//src/app/ClientLayout.js
'use client';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from './contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { User, LogOut, Settings, ChevronDown, Home, Upload, Video, BarChart3, Shield } from 'lucide-react';

// Enhanced Navigation Component
const Navigation = () => {
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && 
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  // Dynamic navigation items based on user role
  const getNavItems = () => {
    const isAdmin = user?.role === 'admin';
    
    return [
      { 
        href: isAdmin ? '/dashboard' : '/userdashboard', 
        icon: Home, 
        label: 'Dashboard' 
      },
      { 
        href: isAdmin ? '/admin/upload' : '/upload', 
        icon: Upload, 
        label: 'Upload' 
      },
      { 
        href: '/live', 
        icon: Video, 
        label: 'Live Feed' 
      },
      { 
        href: isAdmin ? '/admin/results' : '/results', 
        icon: BarChart3, 
        label: 'Results' 
      }
    ];
  };

  const navItems = getNavItems();

  if (isLoading) {
    return (
      <>
        <nav style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          padding: '1rem 0'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 2rem',
            maxWidth: '1400px',
            margin: '0 auto',
            height: '70px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.75rem', filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))' }}>🚨</span>
              <span style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                background: 'linear-gradient(135deg, #3b82f6, #1e40af)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                Accident Detection
              </span>
            </div>
            <div style={{
              width: '24px',
              height: '24px',
              border: '2px solid #f3f4f6',
              borderTop: '2px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          </div>
        </nav>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </>
    );
  }

  return (
    <>
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
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 2rem',
          maxWidth: '1400px',
          margin: '0 auto',
          height: '70px'
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Link 
              href={isAuthenticated ? (user?.role === 'admin' ? '/dashboard' : '/userdashboard') : '/auth'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                textDecoration: 'none',
                transition: 'transform 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <span style={{
                fontSize: '1.75rem',
                filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
              }}>
                🚨
              </span>
              <span style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                background: 'linear-gradient(135deg, #3b82f6, #1e40af)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                Accident Detection
              </span>
            </Link>
          </div>

          {/* Navigation Links and User Menu */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2rem'
          }}>
            {isAuthenticated ? (
              <>
                {/* Navigation Links */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
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

                {/* User Menu */}
                <div style={{ position: 'relative' }}>
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
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start'
                    }}>
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

                  {/* Dropdown Menu */}
                  {showUserMenu && (
                    <div 
                      ref={menuRef} 
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
                        overflow: 'hidden',
                        animation: 'dropdownSlide 0.2s ease-out'
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
              </>
            ) : (
              <div style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'center'
              }}>
                <Link 
                  href="/auth" 
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
            )}
          </div>
        </div>
      </nav>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
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

        @media (max-width: 768px) {
          nav > div {
            padding: 0 1rem !important;
          }

          nav > div > div:first-child a span:last-child {
            display: none;
          }

          nav > div > div:last-child > div:first-child {
            display: none;
          }

          nav > div > div:last-child button div:nth-child(2) {
            display: none;
          }

          nav > div > div:last-child > div > div {
            min-width: 240px !important;
          }
        }
      `}</style>
    </>
  );
};

// Loading Component
const LoadingSpinner = () => (
  <div style={{
    minHeight: '50vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}>
    <div style={{
      width: '40px',
      height: '40px',
      border: '3px solid #f3f4f6',
      borderTop: '3px solid #3b82f6',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }} />
  </div>
);

// Protected Route Wrapper
const ProtectedRoute = ({ children, requireAuth = false }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (requireAuth && !isAuthenticated) {
    // Redirect to auth page
    if (typeof window !== 'undefined') {
      window.location.href = '/auth';
      return <LoadingSpinner />;
    }
  }

  return children;
};

// FIXED: Route Handler Component - Removed infinite loop
const RouteHandler = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    console.log('RouteHandler effect triggered:', {
      isLoading,
      isAuthenticated,
      userRole: user?.role,
      pathname,
      timestamp: new Date().toISOString()
    });

    if (!isLoading) {
      // Public routes that don't require authentication
      const publicRoutes = ['/auth', '/auth/register'];
      
      // Check if current route is public
      const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
      
      if (!isAuthenticated) {
        // If not authenticated and not on a public route, redirect to auth
        if (!isPublicRoute && pathname !== '/') {
          console.log('Not authenticated, redirecting to auth from:', pathname);
          router.push('/auth');
          return;
        }
      
        
        if (isPublicRoute) {
          // If authenticated and trying to access auth pages, redirect to appropriate dashboard
          console.log('Authenticated user on auth page, redirecting to dashboard');
          if (user?.role === 'admin') {
            router.push('/dashboard');
          } else {
            router.push('/userdashboard'); // Fixed: Changed from '/' to '/userdashboard'
          }
          return;
        }
        
     
        // Optional: Add role-based access control for specific routes
        if (pathname === '/dashboard' && user?.role !== 'admin') {
          console.log('Non-admin user trying to access dashboard, redirecting to user dashboard');
          router.push('/userdashboard'); // Fixed: Changed from '/' to '/userdashboard'
          return;
        }
      }
    }
  }, [isAuthenticated, isLoading, user, router, pathname]);

  // Show loading while auth is still loading
  if (isLoading) {
    console.log('Auth still loading, showing spinner');
    return <LoadingSpinner />;
  }

  // Show loading while redirecting
  const publicRoutes = ['/auth', '/auth/register'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  
  

  console.log('Rendering children for:', pathname);
  return children;
};

// Client Layout Content Component
export default function ClientLayout({ children }) {
  return (
    <>
      <Navigation />
      
      {/* Main content area with route handling */}
      <main style={{ minHeight: 'calc(100vh - 80px)' }}>
        <RouteHandler>
          {children}
        </RouteHandler>
      </main>
      
      {/* Footer */}
      <footer style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '2rem 0',
        textAlign: 'center',
        borderTop: '1px solid #e5e7eb',
        color: '#6c757d'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
          <p style={{ margin: 0 }}>© 2025 Accident Detection App. Built with Next.js and FastAPI</p>
        </div>
      </footer>
    </>
  );
}

// Export the ProtectedRoute component for use in other files
export { ProtectedRoute };
