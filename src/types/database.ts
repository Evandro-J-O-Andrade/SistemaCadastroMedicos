// src/types/database.ts
// Tipos do banco de dados Supabase/PostgreSQL
// Gerado a partir das migrations em supabase/migrations/

export type Database = {
  public: {
    Tables: {
      people: {
        Row: {
          id: string;
          nome: string;
          nome_norm: string;
          email: string | null;
          telefone: string | null;
          documento: string | null;
          data_nascimento: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          nome_norm?: string;
          email?: string | null;
          telefone?: string | null;
          documento?: string | null;
          data_nascimento?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          nome_norm?: string;
          email?: string | null;
          telefone?: string | null;
          documento?: string | null;
          data_nascimento?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tenants: {
        Row: {
          id: string;
          nome: string;
          slug: string;
          cnpj: string | null;
          email: string | null;
          telefone: string | null;
          endereco: string | null;
          plano: string;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          slug: string;
          cnpj?: string | null;
          email?: string | null;
          telefone?: string | null;
          endereco?: string | null;
          plano?: string;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          slug?: string;
          cnpj?: string | null;
          email?: string | null;
          telefone?: string | null;
          endereco?: string | null;
          plano?: string;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      tenant_settings: {
        Row: {
          id: string;
          tenant_id: string;
          chave: string;
          valor: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          chave: string;
          valor?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          chave?: string;
          valor?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      tenant_memberships: {
        Row: {
          id: string;
          person_id: string;
          tenant_id: string;
          papel_inicial: string | null;
          ativo: boolean;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          person_id: string;
          tenant_id: string;
          papel_inicial?: string | null;
          ativo?: boolean;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          person_id?: string;
          tenant_id?: string;
          papel_inicial?: string | null;
          ativo?: boolean;
          criado_em?: string;
          atualizado_em?: string;
        };
      };
      units: {
        Row: {
          id: string;
          tenant_id: string;
          nome: string;
          codigo: string | null;
          tipo: string | null;
          endereco: string | null;
          cidade: string | null;
          uf: string | null;
          telefone: string | null;
          email: string | null;
          fuso_horario: string;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          nome: string;
          codigo?: string | null;
          tipo?: string | null;
          endereco?: string | null;
          cidade?: string | null;
          uf?: string | null;
          telefone?: string | null;
          email?: string | null;
          fuso_horario?: string;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          nome?: string;
          codigo?: string | null;
          tipo?: string | null;
          endereco?: string | null;
          cidade?: string | null;
          uf?: string | null;
          telefone?: string | null;
          email?: string | null;
          fuso_horario?: string;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      unit_memberships: {
        Row: {
          id: string;
          person_id: string;
          unit_id: string;
          ativo: boolean;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          person_id: string;
          unit_id: string;
          ativo?: boolean;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          person_id?: string;
          unit_id?: string;
          ativo?: boolean;
          criado_em?: string;
          atualizado_em?: string;
        };
      };
      roles: {
        Row: {
          id: string;
          nome: string;
          descricao: string | null;
          nivel: number;
          sistema: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          descricao?: string | null;
          nivel?: number;
          sistema?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          descricao?: string | null;
          nivel?: number;
          sistema?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      permissions: {
        Row: {
          id: string;
          nome: string;
          recurso: string;
          acao: string;
          descricao: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          recurso: string;
          acao: string;
          descricao?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          recurso?: string;
          acao?: string;
          descricao?: string | null;
          created_at?: string;
        };
      };
      role_permissions: {
        Row: {
          id: string;
          role_id: string;
          permission_id: string;
        };
        Insert: {
          id?: string;
          role_id: string;
          permission_id: string;
        };
        Update: {
          id?: string;
          role_id?: string;
          permission_id?: string;
        };
      };
      role_assignments: {
        Row: {
          id: string;
          person_id: string;
          role_id: string;
          tenant_id: string | null;
          unit_id: string | null;
          ativo: boolean;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          person_id: string;
          role_id: string;
          tenant_id?: string | null;
          unit_id?: string | null;
          ativo?: boolean;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          person_id?: string;
          role_id?: string;
          tenant_id?: string | null;
          unit_id?: string | null;
          ativo?: boolean;
          criado_em?: string;
          atualizado_em?: string;
        };
      };
      specialties: {
        Row: {
          id: string;
          tenant_id: string | null;
          nome: string;
          nome_norm: string;
          codigo_cbo: string | null;
          codigo_sigtap: string | null;
          cor: string;
          icone: string;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string | null;
          nome: string;
          nome_norm?: string;
          codigo_cbo?: string | null;
          codigo_sigtap?: string | null;
          cor?: string;
          icone?: string;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string | null;
          nome?: string;
          nome_norm?: string;
          codigo_cbo?: string | null;
          codigo_sigtap?: string | null;
          cor?: string;
          icone?: string;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      medical_professionals: {
        Row: {
          id: string;
          person_id: string;
          crm: string | null;
          crm_uf: string | null;
          nome_social: string | null;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          person_id: string;
          crm?: string | null;
          crm_uf?: string | null;
          nome_social?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          person_id?: string;
          crm?: string | null;
          crm_uf?: string | null;
          nome_social?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      medical_professional_specialties: {
        Row: {
          id: string;
          medical_professional_id: string;
          specialty_id: string;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          medical_professional_id: string;
          specialty_id: string;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          medical_professional_id?: string;
          specialty_id?: string;
          is_primary?: boolean;
          created_at?: string;
        };
      };
      medical_professional_units: {
        Row: {
          id: string;
          medical_professional_id: string;
          unit_id: string;
          ativo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          medical_professional_id: string;
          unit_id: string;
          ativo?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          medical_professional_id?: string;
          unit_id?: string;
          ativo?: boolean;
          created_at?: string;
        };
      };
      collection_shifts: {
        Row: {
          id: string;
          tenant_id: string;
          unit_id: string;
          person_id: string;
          turno: 'diurno' | 'noturno';
          data_referencia: string;
          inicio_em: string;
          fim_em: string | null;
          status: 'aberto' | 'encerrado' | 'renovado';
          observacao: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          unit_id: string;
          person_id: string;
          turno: 'diurno' | 'noturno';
          data_referencia: string;
          inicio_em: string;
          fim_em?: string | null;
          status?: 'aberto' | 'encerrado' | 'renovado';
          observacao?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          unit_id?: string;
          person_id?: string;
          turno?: 'diurno' | 'noturno';
          data_referencia?: string;
          inicio_em?: string;
          fim_em?: string | null;
          status?: 'aberto' | 'encerrado' | 'renovado';
          observacao?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
      };
      collection_batches: {
        Row: {
          id: string;
          collection_shift_id: string;
          status: 'aberto' | 'conferindo' | 'encerrado' | 'cancelado';
          total_medicos: number;
          total_atendimentos: number;
          fechado_em: string | null;
          fechado_por: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          collection_shift_id: string;
          status?: 'aberto' | 'conferindo' | 'encerrado' | 'cancelado';
          total_medicos?: number;
          total_atendimentos?: number;
          fechado_em?: string | null;
          fechado_por?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          collection_shift_id?: string;
          status?: 'aberto' | 'conferindo' | 'encerrado' | 'cancelado';
          total_medicos?: number;
          total_atendimentos?: number;
          fechado_em?: string | null;
          fechado_por?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
      };
      production_entries: {
        Row: {
          id: string;
          collection_batch_id: string;
          medical_professional_id: string;
          specialty_id: string | null;
          periodo_medico: 'diurno' | 'noturno';
          data_referencia: string;
          quantidade: number;
          observacao: string | null;
          origem: 'manual' | 'importacao' | 'integracao';
          origem_referencia: string | null;
          criado_por: string;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          collection_batch_id: string;
          medical_professional_id: string;
          specialty_id?: string | null;
          periodo_medico: 'diurno' | 'noturno';
          data_referencia: string;
          quantidade: number;
          observacao?: string | null;
          origem?: 'manual' | 'importacao' | 'integracao';
          origem_referencia?: string | null;
          criado_por: string;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          collection_batch_id?: string;
          medical_professional_id?: string;
          specialty_id?: string | null;
          periodo_medico?: 'diurno' | 'noturno';
          data_referencia?: string;
          quantidade?: number;
          observacao?: string | null;
          origem?: 'manual' | 'importacao' | 'integracao';
          origem_referencia?: string | null;
          criado_por?: string;
          criado_em?: string;
          atualizado_em?: string;
        };
      };
      data_sources: {
        Row: {
          id: string;
          tenant_id: string;
          nome: string;
          tipo: 'manual' | 'arquivo' | 'api' | 'integracao';
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          nome: string;
          tipo: 'manual' | 'arquivo' | 'api' | 'integracao';
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          nome?: string;
          tipo?: 'manual' | 'arquivo' | 'api' | 'integracao';
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      source_references: {
        Row: {
          id: string;
          production_entry_id: string;
          data_source_id: string;
          valor_referencia: string | null;
          coletado_em: string;
          observacao: string | null;
        };
        Insert: {
          id?: string;
          production_entry_id: string;
          data_source_id: string;
          valor_referencia?: string | null;
          coletado_em?: string;
          observacao?: string | null;
        };
        Update: {
          id?: string;
          production_entry_id?: string;
          data_source_id?: string;
          valor_referencia?: string | null;
          coletado_em?: string;
          observacao?: string | null;
        };
      };
      import_batches: {
        Row: {
          id: string;
          tenant_id: string;
          arquivo_nome: string | null;
          status: 'processando' | 'concluido' | 'com_erros' | 'cancelado';
          total_linhas: number;
          linhas_sucesso: number;
          linhas_erro: number;
          relatorio_erros: Json;
          importado_por: string | null;
          importado_em: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          arquivo_nome?: string | null;
          status?: 'processando' | 'concluido' | 'com_erros' | 'cancelado';
          total_linhas?: number;
          linhas_sucesso?: number;
          linhas_erro?: number;
          relatorio_erros?: Json;
          importado_por?: string | null;
          importado_em?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          arquivo_nome?: string | null;
          status?: 'processando' | 'concluido' | 'com_erros' | 'cancelado';
          total_linhas?: number;
          linhas_sucesso?: number;
          linhas_erro?: number;
          relatorio_erros?: Json;
          importado_por?: string | null;
          importado_em?: string | null;
          created_at?: string;
        };
      };
      audit_events: {
        Row: {
          id: string;
          tenant_id: string;
          person_id: string | null;
          unidade_id: string | null;
          evento: string;
          entidade: string;
          entidade_id: string;
          dados_anteriores: Json;
          dados_novos: Json;
          justificativa: string | null;
          ip: string | null;
          user_agent: string | null;
          criado_em: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          person_id?: string | null;
          unidade_id?: string | null;
          evento: string;
          entidade: string;
          entidade_id: string;
          dados_anteriores?: Json;
          dados_novos?: Json;
          justificativa?: string | null;
          ip?: string | null;
          user_agent?: string | null;
          criado_em?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          person_id?: string | null;
          unidade_id?: string | null;
          evento?: string;
          entidade?: string;
          entidade_id?: string;
          dados_anteriores?: Json;
          dados_novos?: Json;
          justificativa?: string | null;
          ip?: string | null;
          user_agent?: string | null;
          criado_em?: string;
        };
      };
      production_revisions: {
        Row: {
          id: string;
          production_entry_id: string;
          quantidade_anterior: number | null;
          quantidade_nova: number | null;
          motivo: string | null;
          revisado_por: string;
          revisado_em: string;
        };
        Insert: {
          id?: string;
          production_entry_id: string;
          quantidade_anterior?: number | null;
          quantidade_nova?: number | null;
          motivo?: string | null;
          revisado_por: string;
          revisado_em?: string;
        };
        Update: {
          id?: string;
          production_entry_id?: string;
          quantidade_anterior?: number | null;
          quantidade_nova?: number | null;
          motivo?: string | null;
          revisado_por?: string;
          revisado_em?: string;
        };
      };
      ui_modules: {
        Row: {
          id: string;
          tenant_id: string;
          codigo: string;
          nome: string;
          descricao: string | null;
          ativo: boolean;
          ordem: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          codigo: string;
          nome: string;
          descricao?: string | null;
          ativo?: boolean;
          ordem?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          codigo?: string;
          nome?: string;
          descricao?: string | null;
          ativo?: boolean;
          ordem?: number;
          created_at?: string;
        };
      };
      ui_pages: {
        Row: {
          id: string;
          module_id: string;
          codigo: string;
          nome: string;
          rota: string;
          icone: string | null;
          ativo: boolean;
          ordem: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          module_id: string;
          codigo: string;
          nome: string;
          rota: string;
          icone?: string | null;
          ativo?: boolean;
          ordem?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          module_id?: string;
          codigo?: string;
          nome?: string;
          rota?: string;
          icone?: string | null;
          ativo?: boolean;
          ordem?: number;
          created_at?: string;
        };
      };
      ui_forms: {
        Row: {
          id: string;
          page_id: string;
          codigo: string;
          configuracao: Json;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          page_id: string;
          codigo: string;
          configuracao?: Json;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          page_id?: string;
          codigo?: string;
          configuracao?: Json;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      ui_themes: {
        Row: {
          id: string;
          tenant_id: string;
          nome: string;
          modo: 'light' | 'dark';
          cores: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          nome?: string;
          modo?: 'light' | 'dark';
          cores?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          nome?: string;
          modo?: 'light' | 'dark';
          cores?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      dashboard_widgets: {
        Row: {
          id: string;
          tenant_id: string;
          codigo: string;
          nome: string;
          tipo: string;
          consulta_sql: string | null;
          configuracao: Json;
          ativo: boolean;
          ordem: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          codigo: string;
          nome: string;
          tipo: string;
          consulta_sql?: string | null;
          configuracao?: Json;
          ativo?: boolean;
          ordem?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          codigo?: string;
          nome?: string;
          tipo?: string;
          consulta_sql?: string | null;
          configuracao?: Json;
          ativo?: boolean;
          ordem?: number;
          created_at?: string;
        };
      };
    };
    Views: {
      vw_producao_consolidada: {
        Row: {
          medical_professional_id: string;
          medico_nome: string;
          crm: string | null;
          crm_uf: string | null;
          specialty_id: string | null;
          especialidade_nome: string | null;
          periodo_medico: string;
          data_referencia: string;
          total_atendimentos: number;
          total_lancamentos: number;
          ultimo_lancamento: string | null;
        };
      };
      vw_levantamentos_ativos: {
        Row: {
          shift_id: string;
          turno: string;
          data_referencia: string;
          inicio_em: string;
          fim_em: string | null;
          shift_status: string;
          person_id: string;
          operador_nome: string;
          unit_id: string;
          unidade_nome: string;
          batch_id: string | null;
          batch_status: string | null;
          total_medicos: number;
          total_atendimentos: number;
          fechado_em: string | null;
        };
      };
      vw_relatorio_producao: {
        Row: {
          data_referencia: string;
          periodo_medico: string;
          medical_professional_id: string;
          medico_nome: string;
          crm: string | null;
          specialty_id: string | null;
          especialidade_nome: string | null;
          unit_id: string;
          unidade_nome: string;
          tenant_id: string;
          quantidade: number;
          origem: string;
          criado_em: string;
          criado_por_nome: string;
        };
      };
    };
    Functions: {
      fn_producao_por_turno: {
        Args: {
          p_data_referencia: string;
          p_periodo_medico: string;
          p_unit_id?: string;
        };
        Returns: {
          medico_nome: string;
          crm: string | null;
          especialidade_nome: string | null;
          quantidade: number;
          data_referencia: string;
        }[];
      };
      fn_shift_aberto_para_unidade: {
        Args: {
          p_unit_id: string;
          p_turno: string;
          p_data_referencia: string;
        };
        Returns: {
          shift_id: string;
          status: string;
          inicio_em: string;
          fim_em: string | null;
          operador_nome: string;
          batch_id: string | null;
          batch_status: string | null;
        }[];
      };
      fn_encerrar_batch: {
        Args: {
          p_batch_id: string;
          p_fechado_por: string;
        };
        Returns: void;
      };
      fn_person_has_permission: {
        Args: {
          p_person_id: string;
          p_recurso: string;
          p_acao: string;
          p_tenant_id?: string;
          p_unit_id?: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      _: never;
    };
    CompositeTypes: {
      _: never;
    };
  };
};

// Helper type for JSONB columns
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T];
export type TableRow<T extends keyof Database['public']['Tables']> = Tables<T>['Row'];
export type TableInsert<T extends keyof Database['public']['Tables']> = Tables<T>['Insert'];
export type TableUpdate<T extends keyof Database['public']['Tables']> = Tables<T>['Update'];
