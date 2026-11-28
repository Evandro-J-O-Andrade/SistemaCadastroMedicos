// src/core/context/contextResolver.ts
// Resolve os contextos autorizados do usuário a partir do bootstrap (memberships/roles).
// NÃO concede permissão nova: apenas representa contextos já autorizados pelo backend.
// A validade real é imposta por RLS no servidor; aqui há apenas coerência de UX.

import type { AuthUser } from '../../auth/services/authService';

export interface ResolvedContext {
  /** 'global' para ROOT global; caso contrário o tenant_id. */
  key: string;
  label: string;
  /** null = contexto global (sem tenant). */
  tenantId: string | null;
  unitIds: string[];
  isGlobal: boolean;
}

/** ROOT global: papel root sem tenant vinculado. */
export function isRootGlobal(user: AuthUser | null): boolean {
  return !!user && user.roles.includes('root') && !user.tenant_id;
}

/**
 * Lista os contextos que o usuário pode selecionar.
 * - ROOT global recebe o contexto global (Central Admin Master) e, se houver, tenants.
 * - Demais usuários recebem um contexto por membership ativa.
 * Não escolhe automaticamente: a seleção é responsabilidade da Central de Contextos.
 */
export function resolveContexts(user: AuthUser | null): ResolvedContext[] {
  if (!user) return [];
  const contexts: ResolvedContext[] = [];

  if (isRootGlobal(user)) {
    contexts.push({ key: 'global', label: 'Central Admin Master (Global)', tenantId: null, unitIds: [], isGlobal: true });
  }

  for (const m of user.memberships ?? []) {
    contexts.push({
      key: m.tenant_id,
      label: m.tenant_nome || m.tenant_id,
      tenantId: m.tenant_id,
      unitIds: m.unit_ids ?? [],
      isGlobal: false,
    });
  }

  // Fallback: usuário com tenant mas sem membership detalhada.
  if (contexts.length === 0 && user.tenant_id) {
    contexts.push({ key: user.tenant_id, label: 'Organização', tenantId: user.tenant_id, unitIds: [], isGlobal: false });
  }

  return contexts;
}

/** Valida se o contexto é autorizado para o usuário (contra memberships/ROOT global). */
export function isContextAllowed(user: AuthUser | null, ctx: ResolvedContext | null): boolean {
  if (!user || !ctx) return false;
  if (ctx.isGlobal) return isRootGlobal(user);
  return (user.memberships ?? []).some((m) => m.tenant_id === ctx.tenantId);
}

/**
 * Contexto padrão (pré-seleção) sem violar a regra de seleção explícita:
 * - ROOT global → contexto global.
 * - Usuário com exatamente um contexto → esse contexto.
 * - Múltiplos contextos → null (exige seleção na Central de Contextos).
 */
export function defaultContext(user: AuthUser | null, contexts?: ResolvedContext[]): ResolvedContext | null {
  const list = contexts ?? resolveContexts(user);
  if (isRootGlobal(user)) return list.find((c) => c.isGlobal) ?? list[0] ?? null;
  if (list.length === 1) return list[0];
  return null;
}

/** Rótulo do contexto ativo para o header/sidebar. */
export function contextLabel(ctx: ResolvedContext | null): string {
  return ctx?.label ?? 'Selecionar contexto';
}