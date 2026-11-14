// src/components/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  allowedRoles?: string[]; // papéis permitidos (ex: ['admin', 'suporte'])
  requireTenant?: boolean; // se exige tenant ativo
}

export function ProtectedRoute({ allowedRoles = [], requireTenant = false }: ProtectedRouteProps) {
  const { user, authenticated, loading } = useAuth();
  const location = useLocation();

  // Ainda carregando auth
  if (loading) {
    return null; // ou um skeleton/loader
  }

  // Não autenticado → login
  if (!authenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Primeiro login → troca de senha (exceto admin master/root)
  if (user.primeiro_login && user.role !== 'root' && location.pathname !== '/troca-senha') {
    return <Navigate to="/troca-senha" replace />;
  }

  // Requer tenant ativo
  if (requireTenant && !user.tenant_id) {
    return <Navigate to="/admin/tenants" replace />;
  }

  // Sem restrição de role → qualquer autenticado entra
  if (allowedRoles.length === 0) {
    return <Outlet />;
  }

  // Admin/root entra em tudo
  if (user.role === 'root' || user.role === 'admin') {
    return <Outlet />;
  }

  // Verificar role permitida
  const temPermissao = allowedRoles.some(
    (r) => r.toLowerCase().trim() === user.role?.toLowerCase().trim()
  );

  return temPermissao ? <Outlet /> : <Navigate to="/" replace />;
}

export default ProtectedRoute;
