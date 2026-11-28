// src/core/context/ContextProvider.tsx
// Mantém o contexto ativo (tenant/unidade) validado contra o bootstrap.
// A troca de contexto NUNCA concede permissão nova: apenas reescopa dados/navegação.
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
const STORAGE_KEY = 'gma.activeContext';

export function ContextProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [active, setActive] = useState<ResolvedContext | null>(null);

  const contexts = useMemo(() => resolveContexts(user), [user]);

  // Reconcilia o contexto ativo quando o usuário/contextos mudam.
  useEffect(() => {
    if (!user) {
      setActive(null);
      return;
    }
    let stored: ResolvedContext | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) stored = JSON.parse(raw) as ResolvedContext;
    } catch {
      stored = null;
    }

    if (stored && isContextAllowed(user, stored)) {
      setActive(stored);
      return;
    }
    // Contexto armazenado inválido → pré-seleção padrão (ou null se exigir escolha).
    setActive(defaultContext(user, contexts));
  }, [user, contexts]);

  const setContext = useCallback(
    (ctx: ResolvedContext): boolean => {
      if (!isContextAllowed(user, ctx)) return false; // falha nega acesso
      setActive(ctx);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
      } catch {
        /* persistência é best-effort */
      }
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