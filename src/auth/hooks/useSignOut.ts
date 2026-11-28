// src/auth/hooks/useSignOut.ts
// Logout real: encerra sessão no Supabase, limpa o contexto local da sessão
// (preserva preferências gerais como tema) e redireciona para /login.
// Trata falhas sem simular sucesso e impede operações duplicadas.
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const ACTIVE_CONTEXT_KEY = 'gma.activeContext';

export function useSignOut() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const doSignOut = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await signOut();
      try {
        localStorage.removeItem(ACTIVE_CONTEXT_KEY);
      } catch {
        /* limpeza best-effort */
      }
      navigate('/login', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao encerrar a sessão.');
      setBusy(false);
    }
  }, [busy, signOut, navigate]);

  return { doSignOut, busy, error };
}