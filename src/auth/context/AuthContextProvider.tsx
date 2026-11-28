// Contexto de autenticação Enterprise People-First.
// Fonte única de verdade: sessão Supabase Auth + bootstrap via fn_auth_bootstrap_v2()
// (auth.users → auth_identity_links → people, RBAC, onboarding).
// Todas as chamadas de bootstrap, login, logout e troca de senha passam por este contexto.

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import { authService, type AuthState } from '../services/authService';
import { AUTH_ERRORS, AUTH_ERROR_MESSAGES } from '../../lib/authConfig';

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  refresh: () => Promise<void>;
  hasPermission: (recurso: string, acao: string) => boolean;
  enterpriseEnabled: boolean;
  contextSelectionPending: boolean;
  completeContextSelection: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    bootstrap: null,
    loading: true,
    authenticated: false,
    error: null,
    contextSelectionPending: false,
  });

  const completeContextSelection = useCallback(() => {
    setState((prev) => ({ ...prev, contextSelectionPending: false }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev: AuthState) => ({ ...prev, error: null }));
  }, []);

  const loadFromSession = useCallback(async () => {
    clearError();
    setState((prev: AuthState) => ({ ...prev, loading: true }));
    try {
      const { user, bootstrap } = await authService.bootstrap();
      const { data: sessionData } = await supabase.auth.getSession();
      setState((prev) => ({
        ...prev,
        user,
        session: sessionData.session ?? null,
        bootstrap,
        loading: false,
        authenticated: true,
        error: null,
      }));
    } catch (err: unknown) {
      const mapped =
        err && typeof err === 'object' && 'code' in err && 'message' in err
          ? (err as { code: string; message: string })
          : { code: AUTH_ERRORS.SERVICE_ERROR, message: AUTH_ERROR_MESSAGES[AUTH_ERRORS.SERVICE_ERROR] };
      setState((prev) => ({
        ...prev,
        user: null,
        session: null,
        bootstrap: null,
        loading: false,
        authenticated: false,
        error: { code: mapped.code as typeof AUTH_ERRORS[keyof typeof AUTH_ERRORS], message: mapped.message },
      }));
    }
  }, [clearError]);

  useEffect(() => {
    let mounted = true;
    loadFromSession();

    // Supabase Auth callbacks execute while the auth client holds its internal lock.
    // Never await getSession()/RPCs inside this callback: defer the bootstrap.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      // Login novo (SIGNED_IN) marca seleção de contexto pendente para ESTA sessão.
      // INITIAL_SESSION (refresh) e TOKEN_REFRESHED não reabrem o Welcome.
      if (event === 'SIGNED_IN') {
        setState((prev) => ({ ...prev, contextSelectionPending: true }));
      }
      if (session?.user) {
        setTimeout(() => {
          if (mounted) void loadFromSession();
        }, 0);
        return;
      }
      setState((prev) => ({
        ...prev,
        user: null,
        session: null,
        bootstrap: null,
        loading: false,
        authenticated: false,
        error: null,
        contextSelectionPending: false,
      }));
    });

    return () => {
      mounted = false;
      data?.subscription?.unsubscribe();
    };
  }, [loadFromSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    clearError();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const mapped =
        error && typeof error === 'object' && 'code' in error && 'message' in error
          ? (error as { code: string; message: string })
          : { code: AUTH_ERRORS.SERVICE_ERROR, message: AUTH_ERROR_MESSAGES[AUTH_ERRORS.SERVICE_ERROR] };
      setState({
        user: null,
        session: null,
        bootstrap: null,
        loading: false,
        authenticated: false,
        error: { code: mapped.code as typeof AUTH_ERRORS[keyof typeof AUTH_ERRORS], message: mapped.message },
        contextSelectionPending: false,
      });
      throw new Error(mapped.message);
    }
    await loadFromSession();
  }, [loadFromSession, clearError]);

  const signOut = useCallback(async () => {
    clearError();
    await supabase.auth.signOut();
    setState({
      user: null,
      session: null,
      bootstrap: null,
      loading: false,
      authenticated: false,
      error: null,
      contextSelectionPending: false,
    });
  }, [clearError]);

  const resetPassword = useCallback(async (email: string) => {
    clearError();
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      const mapped =
        error && typeof error === 'object' && 'code' in error && 'message' in error
          ? (error as { code: string; message: string })
          : { code: AUTH_ERRORS.SERVICE_ERROR, message: AUTH_ERROR_MESSAGES[AUTH_ERRORS.SERVICE_ERROR] };
      setState({
        user: null,
        session: null,
        bootstrap: null,
        loading: false,
        authenticated: false,
        error: { code: mapped.code as typeof AUTH_ERRORS[keyof typeof AUTH_ERRORS], message: mapped.message },
        contextSelectionPending: false,
      });
      throw new Error(mapped.message);
    }
  }, [clearError]);

  const updatePassword = useCallback(async (password: string) => {
    clearError();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      const mapped =
        error && typeof error === 'object' && 'code' in error && 'message' in error
          ? (error as { code: string; message: string })
          : { code: AUTH_ERRORS.SERVICE_ERROR, message: AUTH_ERROR_MESSAGES[AUTH_ERRORS.SERVICE_ERROR] };
      setState({
        user: null,
        session: null,
        bootstrap: null,
        loading: false,
        authenticated: false,
        error: { code: mapped.code as typeof AUTH_ERRORS[keyof typeof AUTH_ERRORS], message: mapped.message },
        contextSelectionPending: false,
      });
      throw new Error(mapped.message);
    }
    // The caller verifies onboarding through fn_auth_bootstrap_v2() after Auth
    // confirms the password update. Avoid racing a second bootstrap here.
  }, [clearError]);

  const refresh = useCallback(async () => {
    await loadFromSession();
  }, [loadFromSession]);

  const hasPermission = useCallback(
    (recurso: string, acao: string) => {
      if (!state.user) return false;
      return authService.hasPermission(state.user.permissions, recurso, acao);
    },
    [state.user],
  );

  const value: AuthContextValue = {
    ...state,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    refresh,
    hasPermission,
    enterpriseEnabled: true,
    completeContextSelection,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthEnterprise(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthEnterprise deve ser usado dentro de AuthProvider');
  return context;
}

// Alias para uso geral (mesmo contexto único)
export const useAuth = useAuthEnterprise;
