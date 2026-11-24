// Guarda de rota Enterprise (People-First).
// Protege rotas por autenticação, permissões bootstrap e gates de onboarding/primeiro acesso.
// Não concede acesso por default: hasPermission deve retornar true explicitamente.

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthEnterprise } from '../context/AuthContextProvider';

interface EnterpriseProtectedRouteProps {
  allowedRoles?: string[]; // papéis permitidos (ex: ['admin', 'suporte'])
  requiredPermission?: { recurso: string; acao: string };
  requireTenant?: boolean;
  requireOnboardingComplete?: boolean; // se true, bloqueia quando primeiro acesso pendente
  allowedOnboardingPaths?: string[]; // caminhos liberados mesmo com onboarding pendente
}

export function EnterpriseProtectedRoute({
  allowedRoles = [],
  requiredPermission,
  requireTenant = false,
  requireOnboardingComplete = false,
  allowedOnboardingPaths = ['/troca-senha', '/welcome'],
}: EnterpriseProtectedRouteProps) {
  const { user, authenticated, loading, error } = useAuthEnterprise();
  const location = useLocation();

  // Ainda carregando auth
  if (loading) {
    return null; // pode ser substituído por skeleton/loader
  }

  // Não autenticado → login
  if (!authenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Erro de autenticação (ex: identidade não vinculada) → login com mensagem
  if (error && !user) {
    return <Navigate to="/login" replace state={{ from: location, error: error.code }} />;
  }

  // Primeiro acesso / onboarding pendente
  const onboardingPending =
    user.must_change_password ||
    user.terms_pending ||
    user.responsibility_pending ||
    user.welcome_pending;

  const isOnboardingPath = allowedOnboardingPaths.includes(location.pathname);

  if (requireOnboardingComplete && onboardingPending && !isOnboardingPath) {
    // Redireciona para troca de senha se for o primeiro bloqueio, senão welcome
    const destination = user.must_change_password ? '/troca-senha' : '/welcome';
    return <Navigate to={destination} replace state={{ from: location }} />;
  }

  // Requer tenant ativo
  if (requireTenant && !user.tenant_id) {
    return <Navigate to="/admin/tenants" replace />;
  }

  // Sem restrição de role/permissão → qualquer autenticado entra
  if (allowedRoles.length === 0 && !requiredPermission) {
    return <Outlet />;
  }

  // ROOT entra em tudo
  if (user.roles.includes('root')) {
    return <Outlet />;
  }

  // Verificar roles permitidas
  if (allowedRoles.length > 0) {
    const temRole = allowedRoles.some((r) => user.roles.includes(r));
    if (!temRole) {
      return <Navigate to="/" replace />;
    }
  }

  // Verificar permissão específica (recurso.acao)
  if (requiredPermission) {
    const temPermissao = user.permissions.some(
      (p: string) => p === `${requiredPermission.recurso}.${requiredPermission.acao}` || p === `${requiredPermission.recurso}.*`,
    );
    if (!temPermissao) {
      return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
}

export default EnterpriseProtectedRoute;
