// src/components/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  allowedRoles?: string[];
  requireTenant?: boolean;
  requiredPermission?: { recurso: string; acao: string };
  requireOnboardingComplete?: boolean;
  allowedOnboardingPaths?: string[];
}

export function ProtectedRoute({
  allowedRoles = [],
  requireTenant = false,
  requiredPermission,
  requireOnboardingComplete = false,
  allowedOnboardingPaths = ['/troca-senha', '/welcome'],
}: ProtectedRouteProps) {
  const { user, authenticated, loading, error } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!authenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (error && !user) {
    return <Navigate to="/login" replace state={{ from: location, error: error.code }} />;
  }

  const onboardingPending =
    user.must_change_password ||
    user.terms_pending ||
    user.responsibility_pending ||
    user.welcome_pending;

  const isOnboardingPath = allowedOnboardingPaths.includes(location.pathname);

  if (requireOnboardingComplete && onboardingPending && !isOnboardingPath) {
    const destination = user.must_change_password ? '/troca-senha' : '/welcome';
    return <Navigate to={destination} replace state={{ from: location }} />;
  }

  if (requireTenant && !user.tenant_id) {
    return <Navigate to="/admin/tenants" replace />;
  }

  if (allowedRoles.length === 0 && !requiredPermission) {
    return <Outlet />;
  }

  const roles = user.roles;
  if (roles.includes('root')) {
    return <Outlet />;
  }

  if (allowedRoles.length > 0) {
    const temRole = allowedRoles.some((r) => roles.includes(r));
    if (!temRole) {
      return <Navigate to="/" replace />;
    }
  }

  if (requiredPermission) {
    const token = `${requiredPermission.recurso}.${requiredPermission.acao}`;
    const temPermissao =
      user.permissions.includes(token) ||
      user.permissions.includes(`${requiredPermission.recurso}.*`) ||
      user.permissions.includes('*.*');
    if (!temPermissao) {
      return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
}

export default ProtectedRoute;
