import { Navigate, useLocation } from 'react-router';
import { useAuth } from '@/app/store/AuthContext';

interface Props {
  children: React.ReactNode;
  requireRole?: 'student' | 'instructor';
}

export function ProtectedRoute({ children, requireRole }: Props) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireRole && user?.role !== requireRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
