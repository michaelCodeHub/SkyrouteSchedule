import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, userProfile } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && userProfile?.role !== requiredRole) {
    return <Navigate to={userProfile?.role === 'admin' ? '/admin' : '/employee'} replace />;
  }
  return children;
}
