// src/core/context/useContextEntry.ts
// Conclui a jornada de entrada: finaliza boas-vindas (1º acesso), reaplica bootstrap,
// aplica o contexto autorizado e marca a seleção de contexto da sessão como concluída.
// Não concede acesso: apenas orquestra UX; a validade é imposta por RLS no servidor.
import { useCallback, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useActiveContext } from './ContextProvider';
import { isContextAllowed, type ResolvedContext } from './contextResolver';
import { authUserFromBootstrap, bootstrapFromResponse } from '../../auth/services/authService';

export interface UseContextEntryResult {
  /** Aplica o contexto e conclui a entrada. Retorna true em sucesso; lança Error em falha. */
  enter: (ctx: ResolvedContext) => Promise<void>;
  busy: boolean;
  error: string;
  clearError: () => void;
}

export function useContextEntry(): UseContextEntryResult {
  const { user, refresh, completeContextSelection } = useAuth();
  const { setContext } = useActiveContext();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const clearError = useCallback(() => setError(''), []);

  const enter = useCallback(
    async (ctx: ResolvedContext) => {
      if (busy) return;
      setBusy(true);
      setError('');
      try {
        if (!isContextAllowed(user, ctx)) {
          throw new Error('Contexto não autorizado para o seu perfil.');
        }

        // 1º acesso: conclui a etapa de boas-vindas no servidor (senha + termos/responsabilidade).
        const { data, error: welcomeError } = await supabase.rpc('fn_complete_welcome');
        if (welcomeError) throw welcomeError;
        if (data !== true) {
          throw new Error(
            'Não foi possível concluir as boas-vindas. Confirme que senha e documentos estão regularizados.',
          );
        }

        // Estado autoritativo pós-boas-vindas (não força flags).
        const { data: bootstrapData, error: bootstrapError } = await supabase.rpc('fn_auth_bootstrap_v2');
        if (bootstrapError) throw bootstrapError;
        const bootstrap = bootstrapFromResponse(bootstrapData);
        if (!bootstrap || !user?.auth_user_id) {
          throw new Error('Não foi possível confirmar a identidade após as boas-vindas.');
        }
        const updated = authUserFromBootstrap(user.auth_user_id, bootstrap);
        if (
          updated.must_change_password ||
          updated.terms_pending ||
          updated.responsibility_pending ||
          updated.welcome_pending
        ) {
          throw new Error('Ainda existe uma etapa obrigatória pendente. Acesso não liberado.');
        }

        if (!setContext(ctx)) {
          throw new Error('Contexto não autorizado para o seu perfil.');
        }
        completeContextSelection();
        await refresh();
      } finally {
        setBusy(false);
      }
    },
    [busy, user, setContext, completeContextSelection, refresh],
  );

  return { enter, busy, error, clearError };
}