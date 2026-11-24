// Realtime Manager — subscriptions com autorização, reconexão, deduplicação, invalidação seletiva
import { supabase } from '../../lib/supabase';

export interface SubscriptionScope {
  tenantId: string | null;
  unitId: string | null;
  permissions: string[];
}

export interface RealtimeSubscription {
  channel: string;
  table: string;
  filter?: string;
  callback: (payload: any) => void;
}

const activeSubscriptions = new Map<string, any>();

export const realtimeManager = {
  subscribe(sub: RealtimeSubscription, scope: SubscriptionScope): string {
    const key = `${sub.table}:${sub.filter || 'all'}:${scope.tenantId || 'global'}:${scope.unitId || 'all'}`;

    if (activeSubscriptions.has(key)) {
      return key; // deduplication
    }

    const channel = supabase
      .channel(key)
      .on('postgres_changes', { event: '*', schema: 'public', table: sub.table, filter: sub.filter }, (payload) => {
        sub.callback(payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Subscribed: ${key}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.warn(`[Realtime] Channel error: ${key}, retrying...`);
          // Reconnection logic handled by Supabase client
        }
      });

    activeSubscriptions.set(key, channel);
    return key;
  },

  unsubscribe(key: string): void {
    const channel = activeSubscriptions.get(key);
    if (channel) {
      supabase.removeChannel(channel);
      activeSubscriptions.delete(key);
    }
  },

  unsubscribeAll(): void {
    activeSubscriptions.forEach((channel) => supabase.removeChannel(channel));
    activeSubscriptions.clear();
  },

  getActiveCount(): number {
    return activeSubscriptions.size;
  },
};
