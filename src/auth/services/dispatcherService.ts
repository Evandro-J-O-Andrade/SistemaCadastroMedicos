// Dispatcher Master — resolvedor de destinos pós-autenticação.
// Consome a identidade bootstrapeada (papéis, permissões, memberships, onboarding).
// Não concede privilégios: apenas seleciona destinos já autorizados pelo backend.
// Default-deny: se não houver destino autorizado, retorna null.

import type { AuthUser, BootstrapResponse, Membership } from '../services/authService';
import { AUTH_ROUTES } from '../../lib/authConfig';

export type DispatcherDestination = {
  path: string;
  label: string;
  modulo: string;
  disponivel: boolean; // rota realmente implementada
  motivoIndisponivel?: string;
};

export type DispatcherResult = {
  destino: DispatcherDestination | null;
  onboardingPendente: boolean;
  caminhoOnboarding: string | null;
  motivoBloqueio: string | null;
};

// Verifica se há onboarding pendente (qualquer etapa)
function temOnboardingPendente(user: AuthUser): boolean {
  return !!(
    user.must_change_password ||
    user.terms_pending ||
    user.responsibility_pending ||
    user.welcome_pending
  );
}

// Caminho de onboarding prioritário
function caminhoOnboarding(user: AuthUser): string | null {
  if (user.must_change_password) return AUTH_ROUTES.TROCA_SENHA;
  if (user.terms_pending || user.responsibility_pending) return '/onboarding/legal';
  if (user.welcome_pending) return AUTH_ROUTES.WELCOME;
  return null;
}

// Verifica se o ROOT é global (sem tenant) ou tenant-scoped
function isRootGlobal(user: AuthUser): boolean {
  return user.roles.includes('root') && !user.tenant_id;
}

// Verifica se o ROOT é tenant-scoped (com tenant)
function isRootTenantScoped(user: AuthUser): boolean {
  return user.roles.includes('root') && !!user.tenant_id;
}

// Retorna o tenant primário do usuário (primeira membership)
function tenantPrimario(user: AuthUser): Membership | null {
  if (!user.memberships || user.memberships.length === 0) return null;
  return user.memberships[0];
}

// Mapeia papel para destino lógico
function destinoPorPapel(
  user: AuthUser,
): { path: string; label: string; modulo: string; disponivel: boolean; motivoIndisponivel?: string } | null {
  const roles = user.roles;

  // ROOT global → Central Admin Master (implementada no Gate 2.3 Chunk 2)
  if (isRootGlobal(user)) {
    return {
      path: AUTH_ROUTES.DASHBOARD_ADMIN_MASTER,
      label: 'Central Admin Master',
      modulo: 'administracao',
      disponivel: true,
    };
  }

  // ROOT tenant-scoped → dashboard administrativo do tenant
  if (isRootTenantScoped(user)) {
    return {
      path: '/',
      label: 'Dashboard do Tenant',
      modulo: 'administracao',
      disponivel: true,
    };
  }

  // Admin Gestão → dashboard de gestão
  if (roles.includes('admin')) {
    return {
      path: '/',
      label: 'Dashboard de Gestão',
      modulo: 'gestao',
      disponivel: true,
    };
  }

  // Gestor → dashboard operacional da unidade
  if (roles.includes('gestor')) {
    return {
      path: '/',
      label: 'Dashboard da Unidade',
      modulo: 'operacao',
      disponivel: true,
    };
  }

  // Operacional → plantões e produção médica
  if (roles.includes('operador_ti') || roles.includes('operacional')) {
    return {
      path: '/plantao',
      label: 'Plantões e Produção',
      modulo: 'plantao',
      disponivel: true,
    };
  }

  // Suporte → central de suporte
  if (roles.includes('suporte')) {
    return {
      path: '/',
      label: 'Central de Suporte',
      modulo: 'suporte',
      disponivel: true,
    };
  }

  // Auditor → relatórios
  if (roles.includes('auditor')) {
    return {
      path: '/relatorios',
      label: 'Relatórios de Auditoria',
      modulo: 'auditoria',
      disponivel: true,
    };
  }

  return null;
}

export function resolverDestino(user: AuthUser): DispatcherResult {
  // 1. Onboarding obrigatório (mesmo para ROOT)
  if (temOnboardingPendente(user)) {
    return {
      destino: null,
      onboardingPendente: true,
      caminhoOnboarding: caminhoOnboarding(user),
      motivoBloqueio: 'Etapas de primeiro acesso pendentes',
    };
  }

  // 2. Sem papel ativo
  if (!user.roles || user.roles.length === 0) {
    return {
      destino: null,
      onboardingPendente: false,
      caminhoOnboarding: null,
      motivoBloqueio: 'Nenhum papel ativo encontrado para o usuário',
    };
  }

  // 3. Resolver destino por papel
  const tenant = tenantPrimario(user);
  const destinoLogico = destinoPorPapel(user);

  if (!destinoLogico) {
    return {
      destino: null,
      onboardingPendente: false,
      caminhoOnboarding: null,
      motivoBloqueio: 'Nenhum destino autorizado para os papéis do usuário',
    };
  }

  // 4. Verificar se o usuário tem tenant quando necessário (admin, gestor, root scoped)
  const precisaTenant = !isRootGlobal(user) && ['admin', 'gestor', 'root'].some((r) => user.roles.includes(r));
  if (precisaTenant && !tenant) {
    return {
      destino: null,
      onboardingPendente: false,
      caminhoOnboarding: null,
      motivoBloqueio: 'Usuário sem tenant associado. Procure o administrador.',
    };
  }

  return {
    destino: {
      path: destinoLogico.path,
      label: destinoLogico.label,
      modulo: destinoLogico.modulo,
      disponivel: destinoLogico.disponivel,
      motivoIndisponivel: destinoLogico.motivoIndisponivel,
    },
    onboardingPendente: false,
    caminhoOnboarding: null,
    motivoBloqueio: null,
  };
}

/** Resolve o destino a partir do BootstrapResponse completo. */
export function resolverDestinoPorBootstrap(
  bootstrap: BootstrapResponse | null,
): DispatcherResult {
  if (!bootstrap) {
    return {
      destino: null,
      onboardingPendente: false,
      caminhoOnboarding: null,
      motivoBloqueio: 'Identidade não disponível',
    };
  }

  // Construir AuthUser simplificado a partir do bootstrap
  const user: AuthUser = {
    id: bootstrap.person_id,
    auth_user_id: '',
    email: bootstrap.email ?? null,
    nome: bootstrap.full_name ?? null,
    full_name: bootstrap.full_name ?? null,
    roles: bootstrap.roles,
    permissions: bootstrap.permissions,
    memberships: bootstrap.memberships,
    tenant_id: bootstrap.tenant_id ?? null,
    unit_id: bootstrap.unit_id ?? null,
    must_change_password: bootstrap.must_change_password,
    terms_pending: bootstrap.terms_pending,
    responsibility_pending: bootstrap.responsibility_pending,
    welcome_pending: bootstrap.welcome_pending,
    primeiro_login: !!(
      bootstrap.must_change_password ||
      bootstrap.terms_pending ||
      bootstrap.responsibility_pending ||
      bootstrap.welcome_pending
    ),
  };

  return resolverDestino(user);
}

/**
 * Variante ciente do contexto ativo: usa o tenant/unidade do contexto selecionado
 * em vez da primeira membership. Não concede privilégio — apenas corrige o escopo de UX.
 * Reaproveita toda a lógica de onboarding/papel de resolverDestino.
 */
export function resolverDestinoComContexto(
  user: AuthUser,
  ctx: { tenantId: string | null; unitId?: string | null; isGlobal?: boolean } | null,
): DispatcherResult {
  // Sem contexto selecionado ainda: delega ao resolvedor padrão (pode indicar bloqueio).
  if (!ctx) return resolverDestino(user);

  // ROOT global mantém o destino global independentemente de tenant.
  if (ctx.isGlobal || isRootGlobal(user)) return resolverDestino(user);

  // Reescopa o usuário para o tenant do contexto ativo (UX), preservando papéis/permissões.
  const scoped: AuthUser = {
    ...user,
    tenant_id: ctx.tenantId ?? user.tenant_id,
    unit_id: ctx.unitId ?? user.unit_id,
    memberships: user.memberships?.length
      ? user.memberships
      : ctx.tenantId
        ? [{ tenant_id: ctx.tenantId, tenant_nome: ctx.tenantId, unit_ids: ctx.unitId ? [ctx.unitId] : [] }]
        : [],
  };
  return resolverDestino(scoped);
}
