// src/core/context/ContextProvider.tsx
// Mantém o contexto ativo (tenant/unidade) validado contra o bootstrap.
// A troca de contexto NUNCA concede permissão nova: apenas reescopa dados/navegação.
// SEM localStorage/sessionStorage: o contexto vive em memória e é re-derivado do bootstrap
// (fonte real). Em login novo, a jornada de entrada (BemVindo/EscolhaConta) redefine o contexto.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  resolveContexts,
  isContextAllowed,
  defaultContext,
  type ResolvedContext,
} from './contextResolver';

interface ContextValue {
  contexts: ResolvedContext[];
  active: ResolvedContext | null;
  needsSelection: boolean;
  setContext: (ctx: ResolvedContext) => boolean;
}

const ContextContext = createContext<ContextValue | undefined>(undefined);

export function ContextProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [active, setActive] = useState<ResolvedContext | null>(null);

  const contexts = useMemo(() => resolveContexts(user), [user]);

  // Reconcilia o contexto ativo quando o usuário/contextos mudam (sem persistência em storage).
  useEffect(() => {
    if (!user) {
      setActive(null);
      return;
    }
    setActive((prev) => {
      if (prev && isContextAllowed(user, prev)) return prev; // mantém o selecionado nesta sessão
      return defaultContext(user, contexts); // auto quando único; null quando exige escolha
    });
  }, [user, contexts]);

  const setContext = useCallback(
    (ctx: ResolvedContext): boolean => {
      if (!isContextAllowed(user, ctx)) return false; // falha nega acesso
      setActive(ctx);
      return true;
    },
    [user],
  );

  const needsSelection = !!user && contexts.length > 1 && !active;

  const value = useMemo<ContextValue>(
    () => ({ contexts, active, needsSelection, setContext }),
    [contexts, active, needsSelection, setContext],
  );

  return <ContextContext.Provider value={value}>{children}</ContextContext.Provider>;
}

export function useActiveContext(): ContextValue {
  const ctx = useContext(ContextContext);
  if (!ctx) throw new Error('useActiveContext deve ser usado dentro de ContextProvider');
  return ctx;
}