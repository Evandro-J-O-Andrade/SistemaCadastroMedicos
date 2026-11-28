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
  /** Unidade escolhida dentro do contexto (quando há várias). Persistida com o contexto. */
  selectedUnitId?: string | null;
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

  // Sem fallback fictício: sem membership detalhada e sem ROOT global, não há contexto
  // autorizado a exibir. A decisão de entrada retorna 'none' (honesto), nunca um tenant
  // fabricado a partir de tenant_id. A validade é imposta por RLS no servidor.
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

/** Unidade padrão dentro de um contexto (respeita selectedUnitId; senão a primeira) ou null. */
export function defaultUnit(ctx: ResolvedContext | null): string | null {
  if (!ctx || ctx.isGlobal) return null;
  if (ctx.selectedUnitId && ctx.unitIds.includes(ctx.selectedUnitId)) return ctx.selectedUnitId;
  return ctx.unitIds[0] ?? null;
}

export type EntryDecision =
  | { mode: 'auto'; context: ResolvedContext; unitId: string | null }
  | { mode: 'select-context' }
  | { mode: 'select-unit'; context: ResolvedContext }
  | { mode: 'none' };

/**
 * Decisão de entrada conforme a tabela de regra de negócio:
 * - ROOT global                         → auto (contexto global);
 * - 1 tenant, 1 unidade                 → auto (tenant + unidade);
 * - 1 tenant, várias unidades          → select-unit (escolhe a unidade);
 * - vários tenants                      → select-context (tenant e depois unidade);
 * - usuário sem contexto autorizado     → none.
 * Não concede acesso: apenas decide a UX. A validade é imposta por RLS no servidor.
 */
export function resolveEntryDecision(user: AuthUser | null, contexts?: ResolvedContext[]): EntryDecision {
  const list = contexts ?? resolveContexts(user);
  if (list.length === 0) return { mode: 'none' };

  const global = list.find((c) => c.isGlobal);
  if (global) return { mode: 'auto', context: global, unitId: null };

  if (list.length > 1) return { mode: 'select-context' };

  const only = list[0];
  if (only.unitIds.length === 1) return { mode: 'auto', context: only, unitId: only.unitIds[0] };
  if (only.unitIds.length > 1) return { mode: 'select-unit', context: only };
  // 1 tenant sem unidades detalhadas: segue com o tenant (RLS restringe no servidor).
  return { mode: 'auto', context: only, unitId: null };
}