// Tipos do fluxo Enterprise People-First (consome fn_auth_bootstrap_v2 / RPC do banco)

import { AuthErrorCode } from '../lib/authConfig';

export type UserRole = 'root' | 'admin' | 'gestor' | 'operador_ti' | 'suporte' | 'auditor';

export interface Membership {
  tenant_id: string;
  tenant_nome: string;
  unit_ids: string[];
}

export interface OnboardingState {
  must_change_password: boolean;
  terms_pending: boolean;
  responsibility_pending: boolean;
  welcome_pending: boolean;
}

export interface BootstrapResponse {
  person_id: string;
  full_name: string | null;
  email: string | null;
  roles: string[];
  permissions: string[];
  memberships: Membership[];
  tenant_id: string | null;
  unit_id: string | null;
  must_change_password: boolean;
  terms_pending: boolean;
  responsibility_pending: boolean;
  welcome_pending: boolean;
}

export interface AuthUser {
  id: string; // person_id
  auth_user_id: string; // auth.users id (sub do JWT)
  email: string | null;
  nome: string | null;
  full_name: string | null;
  roles: string[];
  permissions: string[];
  memberships: Membership[];
  tenant_id: string | null; // tenant primário/selecionado
  unit_id: string | null; // unidade primária/selecionada
  must_change_password: boolean;
  terms_pending: boolean;
  responsibility_pending: boolean;
  welcome_pending: boolean;
  primeiro_login: boolean; // derivado dos flags de onboarding
}

export interface AuthState {
  user: AuthUser | null;
  session: any | null;
  bootstrap: BootstrapResponse | null;
  loading: boolean;
  authenticated: boolean;
  error: { code: AuthErrorCode; message: string } | null;
}

export interface HasPermissionOptions {
  recurso: string;
  acao: string;
  tenant_id?: string | null;
  unit_id?: string | null;
}
