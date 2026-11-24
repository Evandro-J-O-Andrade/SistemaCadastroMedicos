// Serviço de gestão multi-tenant (Gate 3.2).
// Consome Supabase client (RLS aplicada no banco). Não expõe service_role.

import { supabase } from '../../lib/supabase';

export interface Tenant {
  id: string;
  nome: string;
  slug: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  tenant_id: string;
  nome: string;
  codigo: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantMembership {
  person_id: string;
  tenant_id: string;
  ativo: boolean;
  created_at: string;
}

export interface UnitMembership {
  person_id: string;
  unit_id: string;
  tenant_id: string;
  ativo: boolean;
  created_at: string;
}

export const tenantService = {
  async listarTenants(): Promise<Tenant[]> {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('nome');
    if (error) throw error;
    return data ?? [];
  },

  async criarTenant(payload: { nome: string; slug?: string }): Promise<Tenant> {
    const { data, error } = await supabase
      .from('tenants')
      .insert({ nome: payload.nome, slug: payload.slug ?? null, ativo: true })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async atualizarTenant(id: string, payload: Partial<Pick<Tenant, 'nome' | 'slug' | 'ativo'>>): Promise<Tenant> {
    const { data, error } = await supabase
      .from('tenants')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async desativarTenant(id: string): Promise<void> {
    const { error } = await supabase
      .from('tenants')
      .update({ ativo: false })
      .eq('id', id);
    if (error) throw error;
  },

  async listarUnidades(tenantId?: string): Promise<Unit[]> {
    let query = supabase.from('units').select('*').order('nome');
    if (tenantId) query = query.eq('tenant_id', tenantId);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async criarUnidade(payload: { tenant_id: string; nome: string; codigo?: string }): Promise<Unit> {
    const { data, error } = await supabase
      .from('units')
      .insert({ tenant_id: payload.tenant_id, nome: payload.nome, codigo: payload.codigo ?? null, ativo: true })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async atualizarUnidade(id: string, payload: Partial<Pick<Unit, 'nome' | 'codigo' | 'ativo'>>): Promise<Unit> {
    const { data, error } = await supabase
      .from('units')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async listarMembershipsTenant(tenantId: string): Promise<TenantMembership[]> {
    const { data, error } = await supabase
      .from('tenant_memberships')
      .select('*')
      .eq('tenant_id', tenantId);
    if (error) throw error;
    return data ?? [];
  },

  async associarPessoaTenant(personId: string, tenantId: string): Promise<void> {
    const { error } = await supabase
      .from('tenant_memberships')
      .insert({ person_id: personId, tenant_id: tenantId, ativo: true });
    if (error) throw error;
  },
};