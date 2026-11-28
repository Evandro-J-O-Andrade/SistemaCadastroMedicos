// src/modules/intelligence/analyticsService.ts
// Consultas homologadas de inteligência assistencial (P0).
// Escopo SEMPRE por contexto autorizado (tenant/unidade). RLS é a fonte de verdade;
// este serviço não concede acesso — apenas consulta com os filtros do contexto.
// Se as tabelas médicas ainda não existirem (migrations não aplicadas), degrada
// graciosamente para available=false (portal exibe "—", nunca valores fictícios).
import { supabase } from '../../lib/supabase';
import type {
  ContextoEscopo,
  FiltrosInteligencia,
  Indicador,
  ItemRanking,
  KpisProducao,
  Periodo,
  PontoEvolucao,
  ResultadoInteligencia,
  SnapshotInteligencia,
} from './types';

const DIAS: Record<Periodo, number> = { '7d': 7, '30d': 30, '90d': 90, '12m': 365 };

function inicioPeriodo(periodo: Periodo): string {
  const d = new Date();
  d.setDate(d.getDate() - DIAS[periodo]);
  return d.toISOString().slice(0, 10);
}

/** Detecta ausência de tabela/coluna (migrations não aplicadas) sem tratar como erro real. */
function isMissingRelation(msg: string | undefined): boolean {
  if (!msg) return false;
  return /does not exist|schema cache|could not find the table|relation .* does not exist/i.test(msg);
}

/**
 * Busca o snapshot de inteligência para o contexto+filtros.
 * Retorna available=false quando a fonte não existe, para o portal mostrar "—".
 */
export async function fetchSnapshot(
  ctx: ContextoEscopo,
  filtros: FiltrosInteligencia,
): Promise<ResultadoInteligencia> {
  const desde = inicioPeriodo(filtros.periodo);
  const unitIds = filtros.unitId ? [filtros.unitId] : ctx.unitIds;

  // 1) Médicos ativos no escopo (via vínculo unidade).
  const medicos = await supabase
    .from('medical_professionals')
    .select('id, medical_professional_units!inner(unit_id, ativo)')
    .eq('ativo', true)
    .eq('medical_professional_units.ativo', true)
    .in('medical_professional_units.unit_id', unitIds.length ? unitIds : ['00000000-0000-0000-0000-000000000000']);

  if (medicos.error && isMissingRelation(medicos.error.message)) {
    return { available: false, snapshot: null };
  }
  if (medicos.error) {
    return { available: false, snapshot: null, error: medicos.error.message };
  }

  const medicosAtivos = new Set((medicos.data ?? []).map((m: any) => m.id as string)).size;

  // 2) Produção no período (agregada). Filtros de escopo por unidade.
  let prodQuery = supabase
    .from('production_entries')
    .select('id, quantidade, data, turno, medical_professional_id, specialty_id, status, unit_id')
    .gte('data', desde);

  if (unitIds.length) prodQuery = prodQuery.in('unit_id', unitIds);
  if (filtros.medicoId) prodQuery = prodQuery.eq('medical_professional_id', filtros.medicoId);
  if (filtros.especialidadeId) prodQuery = prodQuery.eq('specialty_id', filtros.especialidadeId);

  const prod = await prodQuery;
  if (prod.error && isMissingRelation(prod.error.message)) {
    return { available: false, snapshot: null };
  }
  if (prod.error) {
    return { available: false, snapshot: null, error: prod.error.message };
  }

  const rows = (prod.data ?? []) as any[];
  const atendimentos = rows.reduce((acc, r) => acc + (Number(r.quantidade) || 0), 0);
  const medicosComProducao = new Set(rows.map((r) => r.medical_professional_id).filter(Boolean)).size;
  const mediaPorMedico = medicosComProducao > 0 ? Math.round(atendimentos / medicosComProducao) : 0;

  // Evolução diária
  const porDia = new Map<string, number>();
  for (const r of rows) {
    const d = String(r.data).slice(0, 10);
    porDia.set(d, (porDia.get(d) ?? 0) + (Number(r.quantidade) || 0));
  }
  const evolucao: PontoEvolucao[] = [...porDia.entries()]
    .map(([data, quantidade]) => ({ data, quantidade }))
    .sort((a, b) => a.data.localeCompare(b.data));

  // Rankings (especialidade / médico) — rótulos resolvidos em lote quando possível.
  const espMap = new Map<string, number>();
  const medMap = new Map<string, number>();
  for (const r of rows) {
    if (r.specialty_id) espMap.set(r.specialty_id, (espMap.get(r.specialty_id) ?? 0) + (Number(r.quantidade) || 0));
    if (r.medical_professional_id) medMap.set(r.medical_professional_id, (medMap.get(r.medical_professional_id) ?? 0) + (Number(r.quantidade) || 0));
  }

  const porEspecialidade = await rotulos(espMap, 'specialties');
  const porMedico = await rotulos(medMap, 'medical_professionals');

  // Qualidade (status da produção)
  const qualidade = { conciliados: 0, pendentes: 0, homologados: 0 };
  for (const r of rows) {
    if (r.status === 'conferido' || r.status === 'importado') qualidade.conciliados++;
    else if (r.status === 'cancelado') qualidade.pendentes++;
    else qualidade.homologados++;
  }

  const kpis: KpisProducao = {
    medicosAtivos,
    atendimentos,
    mediaPorMedico,
    plantoesRealizados: 0, // depende do motor de plantões (P1) — não inferir de produção
    pendencias: qualidade.pendentes,
  };

  const snapshot: SnapshotInteligencia = {
    kpis,
    evolucao,
    porEspecialidade,
    porMedico,
    qualidade,
  };
  return { available: true, snapshot };
}

async function rotulos(
  map: Map<string, number>,
  tabela: 'specialties' | 'medical_professionals',
): Promise<ItemRanking[]> {
  const ids = [...map.keys()];
  if (ids.length === 0) return [];
  let labels = new Map<string, string>();
  if (tabela === 'specialties') {
    const { data } = await supabase.from('specialties').select('id, nome').in('id', ids);
    labels = new Map((data ?? []).map((s: any) => [s.id, s.nome]));
  } else {
    // médico: rótulo = id (nome vive em people; resolução pode ser enriquecida depois)
    labels = new Map(ids.map((id) => [id, id]));
  }
  return ids
    .map((id) => ({ id, label: labels.get(id) ?? id, quantidade: map.get(id) ?? 0 }))
    .sort((a, b) => b.quantidade - a.quantidade);
}

export type { Indicador };