
import { Home, Upload, Video, BarChart3 } from 'lucide-react';

export const getNavItems = (user) => {
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

export const getAuthRedirectPath = (user) => {
  return user?.role === 'admin' ? '/dashboard' : '/userdashboard';
};

export const isPublicRoute = (pathname) => {
  const publicRoutes = ['/auth', '/auth/register'];
  return publicRoutes.some(route => pathname.startsWith(route));
};
