import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore, type UserRole } from '../../store/authStore';

interface ProtectedRouteProps {
  role: UserRole;
  redirectTo: string;
  children: ReactNode;
}

export function ProtectedRoute({ role, redirectTo, children }: ProtectedRouteProps) {
  const user = useAuthStore((s) => s.user);

  if (!user || user.role !== role) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
