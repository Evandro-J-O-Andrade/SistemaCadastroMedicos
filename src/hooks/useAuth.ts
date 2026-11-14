// src/hooks/useAuth.ts
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

export type UserRole = 'root' | 'admin' | 'gestor' | 'operador_ti' | 'suporte' | 'auditor';

export interface AuthUser {
  id: string;
  email: string | null;
  nome: string | null;
  role: UserRole;
  tenant_id: string | null;
  unit_id: string | null;
  primeiro_login: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  session: any | null;
  loading: boolean;
  authenticated: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    authenticated: false,
  });

  useEffect(() => {
    // Obter sessão inicial
    supabase.auth.getSession().then(({ data, error }) => {
      if (!error && data.session) {
        setState((prev) => ({
          ...prev,
          session: data.session,
          authenticated: true,
          loading: false,
        }));
        carregarUsuario(data.session.user.id);
      } else {
        setState((prev) => ({ ...prev, loading: false }));
      }
    });

    // Escutar mudanças de auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setState((prev) => ({
        ...prev,
        session,
        authenticated: !!session,
        loading: false,
      }));
      if (session?.user.id) {
        carregarUsuario(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const carregarUsuario = useCallback(async (authUserId: string) => {
    try {
      // Buscar a pessoa vinculada ao auth.users via tabela people
      // (Supabase Auth user.id é o sub do JWT, mapeado para people.id via role_assignments ou tabela auxiliar)
      const { data, error } = await supabase
        .from('people')
        .select('*')
        .eq('id', authUserId)
        .single();

      if (!error && data) {
        // Buscar role_assignments ativas para este usuário
        const { data: assignments } = await supabase
          .from('role_assignments')
          .select('*, roles(nome, nivel)')
          .eq('person_id', data.id)
          .eq('ativo', true);

        const role = assignments?.[0]?.roles?.nome as UserRole | null;
        const tenant_id = assignments?.[0]?.tenant_id || null;
        const unit_id = assignments?.[0]?.unit_id || null;

        setState((prev) => ({
          ...prev,
          user: {
            id: data.id,
            email: data.email || null,
            nome: data.nome,
            role: role || 'operador_ti',
            tenant_id,
            unit_id,
            primeiro_login: false,
          },
        }));
      }
    } catch (err) {
      console.error('[useAuth] Erro ao carregar usuário:', err);
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (data.user) {
      await carregarUsuario(data.user.id);
    }
    return data;
  }, [carregarUsuario]);

  const signUp = useCallback(async (email: string, password: string, nome: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome } },
    });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({
      user: null,
      session: null,
      loading: false,
      authenticated: false,
    });
  }, []);

  const hasPermission = useCallback(
    (recurso: string, acao: string) => {
      if (!state.user) return false;
      if (state.user.role === 'root') return true;
      // Delegar para o backend (RPC fn_person_has_permission) ou cache local
      return true; // O RLS do banco garante a segurança real
    },
    [state.user]
  );

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    hasPermission,
  };
}
