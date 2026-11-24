// Serviço de autenticação Enterprise.
// Consome Supabase Auth (sessão) + fn_auth_bootstrap_v2() (identidade People-First, RBAC, onboarding).
// Não expõe SUPABASE_SECRET_KEY. Toda chamada sensível de servidor (ex: confirmação de senha via service_role)
// deve ser feita por backend/Edge Function autorizado, nunca pelo frontend direto.

import { supabase } from '../../lib/supabase';
import type { BootstrapResponse, AuthUser } from '../types';
import { AUTH_ERRORS, AUTH_ERROR_MESSAGES } from '../../lib/authConfig';

export type { AuthUser, AuthState, BootstrapResponse } from '../types';

type SupabaseError = { code?: string | null; status?: number | null; message?: string } | null;

function mapSupabaseError(error: SupabaseError): { code: typeof AUTH_ERRORS[keyof typeof AUTH_ERRORS]; message: string } {
  const code = error?.code ?? '';
  const status = error?.status ?? null;
  const message = error?.message ?? AUTH_ERROR_MESSAGES[AUTH_ERRORS.SERVICE_ERROR];

  if (code === 'invalid_credentials') {
    return { code: AUTH_ERRORS.INVALID_CREDENTIALS, message: AUTH_ERROR_MESSAGES[AUTH_ERRORS.INVALID_CREDENTIALS] };
  }
  if (code === 'email_not_confirmed' || status === 400 && /email_not_confirmed/i.test(message ?? '')) {
    return { code: AUTH_ERRORS.EMAIL_NOT_CONFIRMED, message: AUTH_ERROR_MESSAGES[AUTH_ERRORS.EMAIL_NOT_CONFIRMED] };
  }
  if (code === 'identity_not_linked') {
    return { code: AUTH_ERRORS.IDENTITY_NOT_LINKED, message: AUTH_ERROR_MESSAGES[AUTH_ERRORS.IDENTITY_NOT_LINKED] };
  }
  if (code === 'no_active_role') {
    return { code: AUTH_ERRORS.NO_ACTIVE_ROLE, message: AUTH_ERROR_MESSAGES[AUTH_ERRORS.NO_ACTIVE_ROLE] };
  }
  if (code === 'not_authenticated') {
    return { code: AUTH_ERRORS.NOT_AUTHENTICATED, message: AUTH_ERROR_MESSAGES[AUTH_ERRORS.NOT_AUTHENTICATED] };
  }
  return { code: AUTH_ERRORS.SERVICE_ERROR, message };
}

export function bootstrapFromResponse(data: unknown): BootstrapResponse | null {
  if (!data || typeof data !== 'object') return null;
  const b = data as Record<string, unknown>;
  const roles: string[] = Array.isArray(b.roles) ? b.roles : [];
  const permissions: string[] = Array.isArray(b.permissions) ? b.permissions : [];
  const memberships: Membership[] = Array.isArray(b.memberships) ? b.memberships : [];
  const must_change_password = b.must_change_password === true;
  const terms_pending = b.terms_pending === true;
  const responsibility_pending = b.responsibility_pending === true;
  const welcome_pending = b.welcome_pending === true;

  const tenant_id = memberships.length > 0 ? memberships[0].tenant_id : null;
  const unit_id = memberships.length > 0 && memberships[0].unit_ids.length > 0 ? memberships[0].unit_ids[0] : null;

  return {
    person_id: (b.person_id as string) || '',
    full_name: (b.full_name as string) ?? null,
    email: (b.email as string) ?? null,
    roles,
    permissions,
    memberships,
    must_change_password,
    terms_pending,
    responsibility_pending,
    welcome_pending,
    tenant_id,
    unit_id,
  };
}

interface Membership {
  tenant_id: string;
  tenant_nome: string;
  unit_ids: string[];
}

export type { Membership };

export function authUserFromBootstrap(auth_user_id: string, b: BootstrapResponse): AuthUser {
  const primeiro_login =
    b.must_change_password || b.terms_pending || b.responsibility_pending || b.welcome_pending;
  return {
    id: b.person_id,
    auth_user_id,
    email: b.email,
    nome: b.full_name,
    full_name: b.full_name,
    roles: b.roles,
    permissions: b.permissions,
    memberships: b.memberships,
    tenant_id: b.tenant_id ?? null,
    unit_id: b.unit_id ?? null,
    must_change_password: b.must_change_password,
    terms_pending: b.terms_pending,
    responsibility_pending: b.responsibility_pending,
    welcome_pending: b.welcome_pending,
    primeiro_login,
  };
}

export const authService = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw mapSupabaseError(error);
    if (!data.user) throw mapSupabaseError({ code: AUTH_ERRORS.SERVICE_ERROR, message: AUTH_ERROR_MESSAGES[AUTH_ERRORS.SERVICE_ERROR] });
    return data;
  },

  async signOut() {
    await supabase.auth.signOut();
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw mapSupabaseError(error);
  },

  async updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw mapSupabaseError(error);
  },

  async getSession() {
    return supabase.auth.getSession();
  },

  async getUser() {
    return supabase.auth.getUser();
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    const { data } = supabase.auth.onAuthStateChange(callback);
    return data;
  },

  /** Chama o RPC fn_auth_bootstrap_v2() para obter identidade People-First. Requer sessão válida. */
  async bootstrap(): Promise<{ user: AuthUser; bootstrap: BootstrapResponse }> {
    const { data: sessionData } = await supabase.auth.getSession();
    const auth_user_id = sessionData.session?.user?.id;
    if (!auth_user_id) {
      throw mapSupabaseError({ code: AUTH_ERRORS.NOT_AUTHENTICATED, message: AUTH_ERROR_MESSAGES[AUTH_ERRORS.NOT_AUTHENTICATED] });
    }

    const { data, error } = await supabase.rpc('fn_auth_bootstrap_v2');
    if (error) {
      throw mapSupabaseError(error as SupabaseError);
    }
    const b = bootstrapFromResponse(data);
    if (!b) {
      throw mapSupabaseError({ code: AUTH_ERRORS.IDENTITY_NOT_LINKED, message: AUTH_ERROR_MESSAGES[AUTH_ERRORS.IDENTITY_NOT_LINKED] });
    }
    const user = authUserFromBootstrap(auth_user_id, b);
    return { user, bootstrap: b };
  },

  /** Verifica permissão no cliente usando as permissões consolidadas do bootstrap.
   *  A segurança real no banco é imposta por RLS; este check é para UX/guard de rota. */
  hasPermission(permissions: string[], recurso: string, acao: string): boolean {
    const token = `${recurso}.${acao}`;
    return permissions.includes(token) || permissions.includes(`${recurso}.*`);
  },
};
