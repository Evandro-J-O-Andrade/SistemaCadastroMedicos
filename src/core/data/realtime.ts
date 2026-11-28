// src/core/data/realtime.ts
// F5 — Realtime controlado (Supabase). Assina postgres_changes de uma tabela e invalida o
// cache (prefixo) para refetch consistente. RLS/tenant continuam aplicados no servidor.
// Uso operacional: só assine o que for necessário; o refetch é controlado por invalidateQueries.
import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { invalidateQueries } from './queryClient';

export interface RealtimeOptions {
  /** Filtro opcional de linha (ex.: `tenant_id=eq.<id>`). */
  filter?: string;
  /** Habilita/desabilita a assinatura (ex.: só quando há contexto ativo). */
  enabled?: boolean;
}

/**
 * Assina mudanças de `table` e invalida `invalidatePrefix` a cada evento.
 * Não concede acesso: a validade é imposta por RLS; aqui só orquestra atualização de UI.
 */
export function useRealtimeInvalidate(
  table: string,
  invalidatePrefix: string,
  options: RealtimeOptions = {},
): void {
  const { filter, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel(`rt:${table}:${invalidatePrefix}:${filter ?? '*'}`
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) },
        () => invalidateQueries(invalidatePrefix),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table, invalidatePrefix, filter, enabled]);
}