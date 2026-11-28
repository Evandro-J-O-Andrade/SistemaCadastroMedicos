// src/auth/hooks/useSignOut.ts
// Logout real: encerra sessão no Supabase e redireciona para /login.
// O contexto ativo vive em memória (ContextProvider) e é re-derivado do bootstrap,
// portanto não há storage de sessão a limpar aqui. Trata falhas sem simular sucesso
// e impede operações duplicadas.
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

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
      navigate('/login', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao encerrar a sessão.');
      setBusy(false);
    }
  }, [busy, signOut, navigate]);

  return { doSignOut, busy, error };
}