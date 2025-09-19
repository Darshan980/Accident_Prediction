import { useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { getAuthRedirectPath, isPublicRoute } from '../../../utils/navigation';
import LoadingSpinner from '../../layout/LoadingSpinner';

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
      const isPublic = isPublicRoute(pathname);
      
      if (!isAuthenticated) {
        if (!isPublic && pathname !== '/auth') {
          console.log('Not authenticated, redirecting to auth from:', pathname);
          router.push('/auth');
          return;
        }
      } else {
        if (isPublic) {
          console.log('Authenticated user on auth page, redirecting to dashboard');
          const redirectPath = getAuthRedirectPath(user);
          router.push(redirectPath);
          return;
        }
        
        if (pathname === '/dashboard' && user?.role !== 'admin') {
          console.log('Non-admin user trying to access dashboard, redirecting to user dashboard');
          router.push('/userdashboard');
          return;
        }
      }
    }
  }, [isAuthenticated, isLoading, user, router, pathname]);

  if (isLoading) {
    console.log('Auth still loading, showing spinner');
    return <LoadingSpinner />;
  }

  console.log('Rendering children for:', pathname);
  return children;
};

export default RouteHandler;
