// components/auth/ProtectedRoute.js
'use client';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const ProtectedRoute = ({ children, requireAdmin = false, requiredPermission = null }) => {
  const { user, admin, loading, isAuthenticated, isAdminAuthenticated, hasPermission } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (requireAdmin) {
        if (!isAdminAuthenticated()) {
          router.push('/auth/admin-login');
          return;
        }
        
        if (requiredPermission && !hasPermission(requiredPermission)) {
          router.push('/auth/unauthorized');
          return;
        }
      } else {
        if (!isAuthenticated()) {
          router.push('/auth/login');
          return;
        }
      }
    }
  }, [user, admin, loading, requireAdmin, requiredPermission, router, isAuthenticated, isAdminAuthenticated, hasPermission]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (requireAdmin) {
    if (!isAdminAuthenticated()) {
      return null;
    }
    
    if (requiredPermission && !hasPermission(requiredPermission)) {
      return null;
    }
  } else {
    if (!isAuthenticated()) {
      return null;
    }
  }

  return children;
};

// Higher-order component for page-level protection
export const withAuth = (WrappedComponent, options = {}) => {
  const { requireAdmin = false, requiredPermission = null } = options;
  
  return function AuthenticatedComponent(props) {
    return (
      <ProtectedRoute requireAdmin={requireAdmin} requiredPermission={requiredPermission}>
        <WrappedComponent {...props} />
      </ProtectedRoute>
    );
  };
};

// Admin-only route component
export const AdminRoute = ({ children, requiredPermission = null }) => {
  return (
    <ProtectedRoute requireAdmin={true} requiredPermission={requiredPermission}>
      {children}
    </ProtectedRoute>
  );
};

// User route component (non-admin)
export const UserRoute = ({ children }) => {
  return (
    <ProtectedRoute requireAdmin={false}>
      {children}
    </ProtectedRoute>
  );
};

export default ProtectedRoute;