// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail fast in dev; production must have these set
  console.warn('[Supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não definidos.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application-name': 'gestao-medica-alpha',
    },
  },
});

// Helper para definir o tenant_id no contexto da requisição (via JWT claims)
// Isso deve ser chamado após o login, passando o tenant_id do usuário
export function setTenantContext(tenantId: string | null) {
  if (tenantId) {
    supabase.rpc('set_config', { setting_name: 'request.jwt.claims', setting_value: JSON.stringify({ tenant_id: tenantId }), is_local: true }).catch(() => {});
  }
}

export default supabase;
