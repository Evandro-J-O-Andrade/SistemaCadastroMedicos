// src/modules/intelligence/types.ts
// Contratos de indicadores da Inteligência Assistencial (P0).
// Fonte de verdade = banco (RLS/tenant/unidade). O frontend apenas renderiza;
// a autorização efetiva é do backend. Nunca inventa valores: sem fonte → available=false.

export type Periodo = '7d' | '30d' | '90d' | '12m';

export interface ContextoEscopo {
  /** null = contexto global (ROOT). */
  tenantId: string | null;
  /** Unidades autorizadas do contexto ativo. */
  unitIds: string[];
  isGlobal: boolean;
}

export interface FiltrosInteligencia {
  periodo: Periodo;
  /** unidade selecionada (opcional; deve pertencer ao escopo autorizado). */
  unitId?: string | null;
  medicoId?: string | null;
  especialidadeId?: string | null;
}

export interface Indicador<T> {
  /** false quando a fonte de dados não está conectada/disponível. */
  available: boolean;
  value: T | null;
  error?: string;
}

export interface KpisProducao {
  medicosAtivos: number;
  atendimentos: number;
  mediaPorMedico: number;
  plantoesRealizados: number;
  pendencias: number;
}

export interface PontoEvolucao {
  data: string; // ISO yyyy-mm-dd
  quantidade: number;
}

export interface ItemRanking {
  id: string;
  label: string;
  quantidade: number;
}

export interface QualidadeProducao {
  conciliados: number;
  pendentes: number;
  homologados: number;
}

export interface SnapshotInteligencia {
  kpis: KpisProducao;
  evolucao: PontoEvolucao[];
  porEspecialidade: ItemRanking[];
  porMedico: ItemRanking[];
  qualidade: QualidadeProducao;
}

/** Resultado consolidado do portal. */
export interface ResultadoInteligencia {
  available: boolean;
  snapshot: SnapshotInteligencia | null;
  error?: string;
}