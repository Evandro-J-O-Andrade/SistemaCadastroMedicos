// Serviço de gestão de documentos legais (Gate 3.3).
// Consome Supabase client (RLS aplicada no banco). Não expõe service_role.

import { supabase } from '../../lib/supabase';

export interface LegalDocument {
  id: string;
  tipo: string;
  versao: string;
  titulo: string;
  conteudo: string | null;
  conteudo_hash: string | null;
  url_referencia: string | null;
  obrigatorio: boolean;
  escopo_roles: string[];
  ativo: boolean;
  publicado_em: string;
  created_at: string;
  updated_at: string;
}

export interface LegalAcceptance {
  id: string;
  person_id: string;
  legal_document_id: string;
  accepted_at: string;
  auth_user_id: string | null;
  ip: string | null;
  user_agent: string | null;
  evidencia: Record<string, unknown>;
  created_at: string;
}

export const legalDocumentService = {
  async listarDocumentos(apenasAtivos = true): Promise<LegalDocument[]> {
    let query = supabase.from('legal_documents').select('*').order('publicado_em', { ascending: false });
    if (apenasAtivos) query = query.eq('ativo', true);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async criarDocumento(payload: {
    tipo: string;
    versao: string;
    titulo: string;
    conteudo?: string;
    conteudo_hash?: string;
    url_referencia?: string;
    obrigatorio?: boolean;
    escopo_roles?: string[];
  }): Promise<LegalDocument> {
    const { data, error } = await supabase
      .from('legal_documents')
      .insert({
        tipo: payload.tipo,
        versao: payload.versao,
        titulo: payload.titulo,
        conteudo: payload.conteudo ?? null,
        conteudo_hash: payload.conteudo_hash ?? null,
        url_referencia: payload.url_referencia ?? null,
        obrigatorio: payload.obrigatorio ?? true,
        escopo_roles: payload.escopo_roles ?? ['root', 'admin', 'gestor', 'operador_ti', 'suporte', 'auditor'],
        ativo: true,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async atualizarDocumento(id: string, payload: Partial<Pick<LegalDocument, 'titulo' | 'conteudo' | 'conteudo_hash' | 'url_referencia' | 'obrigatorio' | 'escopo_roles' | 'ativo'>>): Promise<LegalDocument> {
    const { data, error } = await supabase
      .from('legal_documents')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async desativarDocumento(id: string): Promise<void> {
    const { error } = await supabase
      .from('legal_documents')
      .update({ ativo: false })
      .eq('id', id);
    if (error) throw error;
  },

  async listarAceites(personId: string): Promise<LegalAcceptance[]> {
    const { data, error } = await supabase
      .from('legal_acceptances')
      .select('*')
      .eq('person_id', personId);
    if (error) throw error;
    return data ?? [];
  },

  async aceitarDocumento(documentId: string): Promise<string> {
    const { data, error } = await supabase.rpc('fn_accept_legal_document', {
      p_document_id: documentId,
    });
    if (error) throw error;
    return data as string;
  },

  async onboardingStatus(personId?: string): Promise<Record<string, unknown>> {
    const { data, error } = await supabase.rpc('fn_onboarding_status', {
      p_person_id: personId ?? null,
    });
    if (error) throw error;
    return data as Record<string, unknown>;
  },
};