// src/services/accessContextService.ts
// Fonte única de acesso/contexto — 100% dados reais (bootstrap + memberships).
// SEM localStorage/sessionStorage e SEM dados fictícios: os contextos vêm do CORE
// (fn_auth_bootstrap_v2 via AuthProvider). A validade é imposta por RLS no servidor.
import type { AuthUser } from '../auth/types';
import {
  resolveContexts,
  resolveEntryDecision,
  isContextAllowed,
  type ResolvedContext,
  type EntryDecision,
} from '../core/context/contextResolver';

/** Lista os contextos (tenants/unidades) autorizados do usuário — dados reais do bootstrap. */
export function listAccessContexts(user: AuthUser | null): ResolvedContext[] {
  return resolveContexts(user);
}

/** Decisão de entrada (auto / select-context / select-unit / none) a partir dos contextos reais. */
export function decideEntry(user: AuthUser | null, contexts?: ResolvedContext[]): EntryDecision {
  return resolveEntryDecision(user, contexts);
}

/** Valida se o contexto é autorizado (contra memberships/ROOT do bootstrap). */
export function isAccessAllowed(user: AuthUser | null, ctx: ResolvedContext | null): boolean {
  return isContextAllowed(user, ctx);
}

export type { ResolvedContext, EntryDecision };