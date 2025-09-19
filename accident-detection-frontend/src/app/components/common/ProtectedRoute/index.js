import { useAuth } from '../../../contexts/AuthContext';
import LoadingSpinner from '../../layout/LoadingSpinner';

const ProtectedRoute = ({ children, requireAuth = false }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (requireAuth && !isAuthenticated) {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth';
      return <LoadingSpinner />;
    }
  }

  return children;
};

export default ProtectedRoute;
