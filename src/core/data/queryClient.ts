// src/core/data/queryClient.ts
// F5 — Camada de dados: cache em memória (sem storage), invalidação por prefixo e
// refetch controlado. Dados vêm do Supabase (RLS/tenant). Sem mock; sem localStorage.
import { useCallback, useEffect, useRef, useState } from 'react';

interface CacheEntry {
  data: unknown;
  ts: number;
}

const cache = new Map<string, CacheEntry>();
const listeners = new Map<string, Set<() => void>>();

function notify(key: string) {
  listeners.get(key)?.forEach((fn) => fn());
}

/** Remove do cache as entradas cujo prefixo casa e avisa os hooks montados para refazer. */
export function invalidateQueries(prefix: string): void {
  for (const key of Array.from(cache.keys())) {
    if (key === prefix || key.startsWith(`${prefix}:`) || key.startsWith(prefix)) {
      cache.delete(key);
      notify(key);
    }
  }
}

/** Limpa todo o cache (ex.: troca de contexto/tenant). */
export function clearCache(): void {
  const keys = Array.from(cache.keys());
  cache.clear();
  keys.forEach(notify);
}

export interface UseQueryOptions {
  /** TTL do cache em ms (default 30s). */
  ttl?: number;
  /** Quando false, não busca (ex.: depende de contexto ainda não selecionado). */
  enabled?: boolean;
}

export interface UseQueryResult<T> {
  data: T | undefined;
  loading: boolean;
  error: string;
  refetch: () => void;
}

function messageOf(cause: unknown): string {
  if (cause instanceof Error && cause.message) return cause.message;
  if (typeof cause === 'string' && cause) return cause;
  return 'Falha ao carregar os dados.';
}

/**
 * Hook de leitura com cache em memória e invalidação reativa.
 * `key` deve ser estável e incluir o escopo (tenant/unidade) — o isolamento é responsabilidade
 * do fetcher (que roda sob RLS). Invalide com invalidateQueries(`prefixo`).
 */
export function useQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseQueryOptions = {},
): UseQueryResult<T> {
  const { ttl = 30_000, enabled = true } = options;

  const cached = cache.get(key);
  const [data, setData] = useState<T | undefined>(cached?.data as T | undefined);
  const [loading, setLoading] = useState<boolean>(enabled && !cached);
  const [error, setError] = useState('');
  const [nonce, setNonce] = useState(0);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // Inscreve este hook às invalidações da sua chave.
  useEffect(() => {
    let set = listeners.get(key);
    if (!set) {
      set = new Set();
      listeners.set(key, set);
    }
    const fn = () => setNonce((n) => n + 1);
    set.add(fn);
    return () => {
      set?.delete(fn);
      if (set && set.size === 0) listeners.delete(key);
    };
  }, [key]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const entry = cache.get(key);
    const fresh = entry && Date.now() - entry.ts < ttl;
    if (fresh) {
      setData(entry.data as T);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');
    fetcherRef
      .current()
      .then((result) => {
        if (cancelled) return;
        cache.set(key, { data: result, ts: Date.now() });
        setData(result);
      })
      .catch((cause) => {
        if (!cancelled) setError(messageOf(cause));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, ttl, nonce]);

  const refetch = useCallback(() => {
    cache.delete(key);
    setNonce((n) => n + 1);
  }, [key]);

  return { data, loading, error, refetch };
}