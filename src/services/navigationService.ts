// src/services/navigationService.ts
// Navegação Database-Driven — fonte oficial: tabela ui_navigation_items (RLS).
// Descoberta NÃO concede acesso: os itens só aparecem se o RBAC/RLS os liberarem para a sessão.
// Sem hardcode de catálogo como fonte de verdade; sem mock; sem storage.
import { supabase } from '../lib/supabase';

export interface NavItemRow {
  key: string;
  tenant_id: string | null;
  parent_key: string | null;
  ordem: number;
  label: string;
  icon: string | null;
  rota: string;
  cell_id: string | null;
  required_permissions: string[] | null;
  ativo: boolean;
}

/**
 * Lista itens de navegação ativos visíveis ao contexto:
 * globais (tenant_id NULL) + do tenant ativo. Ordenados por `ordem`.
 * A validade real é imposta por RLS; aqui apenas lemos o que o banco libera.
 */
export async function listarNavegacao(tenantId: string | null): Promise<NavItemRow[]> {
  let query = supabase
    .from('ui_navigation_items')
    .select('key, tenant_id, parent_key, ordem, label, icon, rota, cell_id, required_permissions, ativo')
    .eq('ativo', true)
    .order('ordem', { ascending: true });

  query = tenantId
    ? query.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
    : query.is('tenant_id', null);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as NavItemRow[];
}

/** Verifica permissão efetiva (recurso.acao), com suporte a coringas. Aceita array (text[]) ou string. */
export function hasPermission(permissions: string[], required?: string[] | string | null): boolean {
  const reqs = Array.isArray(required)
    ? required
    : typeof required === 'string'
      ? required.split(',')
      : [];
  const list = reqs.map((p) => p.trim()).filter(Boolean);
  if (list.length === 0) return true;
  return list.every((req) => {
    if (permissions.includes(req) || permissions.includes('*.*')) return true;
    const [rec] = req.split('.');
    return permissions.includes(`${rec}.*`);
  });
}