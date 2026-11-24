// CMS Service — operações reais com Supabase para páginas, versões, blocos
import { supabase } from '../../../lib/supabase';

export interface CmsPage {
  id: string;
  key: string;
  tenant_id: string | null;
  nome: string;
  rota: string;
  ativo: boolean;
}

export interface CmsPageVersion {
  id: string;
  page_id: string;
  versao: string;
  layout_id: string | null;
  status: 'draft' | 'published' | 'archived';
  published_at: string | null;
}

export interface CmsPageBlock {
  id: string;
  page_version_id: string;
  component_key: string;
  ordem: number;
  config: Record<string, any>;
  data_source: string | null;
  ativo: boolean;
}

export const cmsService = {
  async listPages(tenantId?: string | null): Promise<CmsPage[]> {
    let query = supabase.from('ui_page_definitions').select('*').eq('ativo', true);
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }
    const { data, error } = await query.order('nome');
    if (error) throw error;
    return data || [];
  },

  async getPageByKey(key: string, tenantId?: string | null): Promise<CmsPage | null> {
    let query = supabase.from('ui_page_definitions').select('*').eq('key', key).eq('ativo', true);
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }
    const { data, error } = await query.limit(1).maybeSingle();
    if (error) throw error;
    return data;
  },

  async createPage(page: Omit<CmsPage, 'id'>): Promise<CmsPage> {
    const { data, error } = await supabase.from('ui_page_definitions').insert(page).select().single();
    if (error) throw error;
    return data;
  },

  async updatePage(id: string, updates: Partial<CmsPage>): Promise<CmsPage> {
    const { data, error } = await supabase.from('ui_page_definitions').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deletePage(id: string): Promise<void> {
    const { error } = await supabase.from('ui_page_definitions').update({ ativo: false }).eq('id', id);
    if (error) throw error;
  },

  async createVersion(version: Omit<CmsPageVersion, 'id'>): Promise<CmsPageVersion> {
    const { data, error } = await supabase.from('ui_page_versions').insert(version).select().single();
    if (error) throw error;
    return data;
  },

  async listVersions(pageId: string): Promise<CmsPageVersion[]> {
    const { data, error } = await supabase.from('ui_page_versions').select('*').eq('page_id', pageId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async publishVersion(versionId: string): Promise<void> {
    // Archive current published
    const { data: current } = await supabase.from('ui_page_versions').select('id, page_id').eq('status', 'published').single();
    if (current) {
      await supabase.from('ui_page_versions').update({ status: 'archived' }).eq('id', current.id);
    }
    // Publish new
    const { error } = await supabase.from('ui_page_versions').update({ status: 'published', published_at: new Date().toISOString() }).eq('id', versionId);
    if (error) throw error;
  },

  async rollbackVersion(versionId: string): Promise<void> {
    await supabase.from('ui_page_versions').update({ status: 'archived' }).eq('id', versionId);
  },

  async listBlocks(versionId: string): Promise<CmsPageBlock[]> {
    const { data, error } = await supabase.from('ui_page_blocks').select('*').eq('page_version_id', versionId).eq('ativo', true).order('ordem');
    if (error) throw error;
    return data || [];
  },

  async createBlock(block: Omit<CmsPageBlock, 'id'>): Promise<CmsPageBlock> {
    const { data, error } = await supabase.from('ui_page_blocks').insert(block).select().single();
    if (error) throw error;
    return data;
  },

  async updateBlock(id: string, updates: Partial<CmsPageBlock>): Promise<CmsPageBlock> {
    const { data, error } = await supabase.from('ui_page_blocks').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteBlock(id: string): Promise<void> {
    const { error } = await supabase.from('ui_page_blocks').update({ ativo: false }).eq('id', id);
    if (error) throw error;
  },

  async getPublishedPage(key: string, tenantId?: string | null): Promise<{ page: CmsPage; version: CmsPageVersion; blocks: CmsPageBlock[] } | null> {
    const page = await this.getPageByKey(key, tenantId);
    if (!page) return null;

    const { data: version } = await supabase.from('ui_page_versions').select('*').eq('page_id', page.id).eq('status', 'published').limit(1).maybeSingle();
    if (!version) return null;

    const blocks = await this.listBlocks(version.id);
    return { page, version, blocks };
  },
};
