// src/services/dataService.js
// =========================================================
// 🔹 Camada de serviço principal — unifica acesso a dados
// =========================================================

import { storageManager, STORAGE_KEY } from "../utils/storageManager.js";
import {
  cleanPlantaoArray,
  buildOpcoesMedicosFromRaw,
  agruparPorMedicoDiaEsp,
  normalize,
  parsePlantaoDate,
  sanitizeData,
} from "../utils/dadosConsolidados.js";
import {
  especialidades as especialidadesStaticas,
  getEspecialidadeInfo,
  normalizar as normalizeEspecialidade,
} from "../api/especialidades.js";
import {
  filtrarPorMedico,
  filtrarPorEspecialidade,
  filtrarPorDataHora,
  agruparCards as agruparRelatorioCards,
} from "../utils/relatorioService.js";

import dayjs from "dayjs";
import "dayjs/locale/pt-br";
dayjs.locale("pt-br");

// =========================================================
// 🔹 Controle de cache (com debounce para saves rápidos)
// =========================================================
let cache = {
  medicos: { data: null, timestamp: 0 },
  plantao: { data: null, timestamp: 0 },
  especialidades: { data: null, timestamp: 0 },
};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

const isCacheValid = (cached) => cached.data && Date.now() - cached.timestamp < CACHE_TTL;

let debounceTimer = null;
export const invalidateCache = () => {
  // Debounce: Evita invalidações excessivas em cadastros em lote
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    cache = {
      medicos: { data: null, timestamp: 0 },
      plantao: { data: null, timestamp: 0 },
      especialidades: { data: null, timestamp: 0 },
    };
    console.log("🔄 Cache invalidado — dados serão recarregados no próximo fetch.");
  }, 200); // 200ms debounce
};

// Listener para mudanças em multi-abas (ex.: cadastro em outra aba atualiza aqui)
let changeListeners = [];
export const onDataChange = (callback) => {
  changeListeners.push(callback);
  // Registra listener global para storage changes
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.includes(STORAGE_KEY)) {
      invalidateCache();
      changeListeners.forEach(cb => cb(e)); // Chama callbacks (ex.: refresh tabela)
    }
  });
  console.log("👥 Listener de mudanças registrado — multi-abas ativado.");
};

// =========================================================
// 🔹 Backup automático (garantia de segurança)
// =========================================================
const ensureBackup = () => {
  if (!localStorage.getItem(`${STORAGE_KEY}Backup`)) {
    storageManager.createBackup();
    console.log("💾 Backup automático criado.");
  }
};

// =========================================================
// 🔹 FETCH MÉDICOS
// =========================================================
export const fetchMedicos = () => {
  if (isCacheValid(cache.medicos)) return cache.medicos.data;

  try {
    ensureBackup();
    const allData = storageManager.getAll();
    const rawMedicos = allData.medicos || [];
    const normalized = buildOpcoesMedicosFromRaw(rawMedicos);

    cache.medicos = {
      data: normalized.map((m) => ({
        ...m,
        especialidadeInfo: getEspecialidadeInfo(m.especialidade),
      })),
      timestamp: Date.now(),
    };
    return cache.medicos.data;
  } catch (error) {
    console.error("❌ Erro ao buscar médicos:", error);
    return [];
  }
};

// =========================================================
// 🔹 FETCH PLANTÃO ENRIQUECIDO
// =========================================================
export const fetchPlantaoEnriched = () => {
  if (isCacheValid(cache.plantao)) return cache.plantao.data;

  try {
    ensureBackup();
    const allData = storageManager.getAll();
    const rawPlantao = allData.plantao || [];
    const cleaned = cleanPlantaoArray(rawPlantao);

    const medicos = fetchMedicos();
    const medicosMap = new Map(medicos.map((m) => [normalize(m.crm || m.nome), m]));

    cache.plantao = {
      data: cleaned.map((p) => {
        const medicoMatch = medicosMap.get(normalize(p.crm || p.medico || p.nome));
        const espInfo = getEspecialidadeInfo(p.especialidade || p.esp);
        return {
          ...p,
          medico: medicoMatch || { nome: p.medico || p.nome || "N/D", crm: p.crm || "" },
          especialidade: { ...espInfo, nome: p.especialidade || p.esp || "GERAL" },
        };
      }),
      timestamp: Date.now(),
    };
    return cache.plantao.data;
  } catch (error) {
    console.error("❌ Erro ao buscar plantão:", error);
    return [];
  }
};

// =========================================================
// 🔹 FETCH DO DIA ATUAL
// =========================================================
export const fetchHojeEnriched = () => {
  const hoje = dayjs().format("YYYY-MM-DD");
  return fetchPlantaoEnriched().filter((p) => sanitizeData(p.data) === hoje);
};

// =========================================================
// 🔹 UNION DE ESPECIALIDADES (estáticas + dinâmicas)
// =========================================================
export const fetchEspecialidadesUnion = () => {
  if (isCacheValid(cache.especialidades)) return cache.especialidades.data;

  try {
    const staticas = [...especialidadesStaticas];
    const medicos = fetchMedicos();
    const plantao = fetchPlantaoEnriched();

    const fromMedicos = medicos
      .map((m) => ({
        ...getEspecialidadeInfo(m.especialidade),
        nome: m.especialidade,
        cadastros:
          (staticas.find(
            (s) => normalizeEspecialidade(s.nome) === normalizeEspecialidade(m.especialidade)
          )?.cadastros || 0) + 1,
        source: "medico",
      }))
      .filter(
        (e) =>
          !staticas.some(
            (s) => normalizeEspecialidade(s.nome) === normalizeEspecialidade(e.nome)
          )
      );

    const fromPlantao = plantao
      .map((p) => ({
        ...p.especialidade,
        cadastros:
          (staticas.find(
            (s) => normalizeEspecialidade(s.nome) === normalizeEspecialidade(p.especialidade.nome)
          )?.cadastros || 0) + (p.atendimentos || 0),
        source: "plantao",
      }))
      .filter(
        (e) =>
          !staticas.some(
            (s) => normalizeEspecialidade(s.nome) === normalizeEspecialidade(e.nome)
          ) &&
          !fromMedicos.some(
            (m) => normalizeEspecialidade(m.nome) === normalizeEspecialidade(e.nome)
          )
      );

    const union = [...staticas, ...fromMedicos, ...fromPlantao].sort(
      (a, b) => b.cadastros - a.cadastros || a.nome.localeCompare(b.nome, "pt-BR")
    );

    cache.especialidades = { data: union, timestamp: Date.now() };
    return union;
  } catch (error) {
    console.error("❌ Erro ao buscar especialidades:", error);
    return especialidadesStaticas;
  }
};

// =========================================================
// 🔹 CONSOLIDADO PARA RELATÓRIOS (com métricas diárias e validação de filtros)
// =========================================================
export const generateConsolidatedData = (filtros = {}) => {
  try {
    const plantao = fetchPlantaoEnriched();
    if (!plantao.length) return [];

    let filtered = plantao;
    if (filtros.medico || filtros.crm) filtered = filtrarPorMedico(filtered, filtros.medico, filtros.crm);
    if (filtros.especialidade) filtered = filtrarPorEspecialidade(filtered, filtros.especialidade);
    if (filtros.dataInicio || filtros.dataFim) {
      const inicio = parsePlantaoDate(filtros.dataInicio);
      const fim = parsePlantaoDate(filtros.dataFim, "23:59");
      // Validação: Se datas inválidas, mantém full plantao
      if (!inicio || !fim) {
        console.warn("⚠️ Datas inválidas nos filtros — mantendo dados completos.");
      } else {
        filtered = filtrarPorDataHora(filtered, inicio, fim, filtros.horaDe || "07:00", filtros.horaAte || "19:00");
      }
    }

    const grouped = agruparPorMedicoDiaEsp(filtered, fetchMedicos());

    // Métricas diárias para resumo (útil em cards/tabelas da intranet)
    const totalDias = new Set(grouped.map(g => g.data)).size;
    const totalAtendimentos = grouped.reduce((sum, g) => sum + g.atendimentos, 0);
    const mediaAtendimentos = grouped.length > 0 ? totalAtendimentos / grouped.length : 0;

    return grouped.map((g) => ({
      ...g,
      totalOverall: filtered.reduce((sum, p) => sum + (p.quantidade || p.atendimentos || 0), 0),
      relatorioCards: agruparRelatorioCards(
        filtered.filter((p) => normalize(p.medico.nome) === normalize(g.medico))
      ),
      resumo: { totalDias, mediaAtendimentos }, // Nova: Para totais diários (ex.: média de atendimentos hoje)
    }));
  } catch (error) {
    console.error("❌ Erro ao gerar dados consolidados:", error);
    return [];
  }
};

// =========================================================
// 🔹 DEBUG DEV (com teste de join)
// =========================================================
export const debugDataService = () => {
  console.table({
    cacheMedicos: cache.medicos?.data?.length || 0,
    cachePlantao: cache.plantao?.data?.length || 0,
    cacheEspecialidades: cache.especialidades?.data?.length || 0,
  });
  storageManager.debug();
  
  // Teste rápido de join (para validar enriquecimento em cadastros diários)
  const enriched = fetchPlantaoEnriched();
  console.log("🧪 Teste Join (exemplo):", enriched[0]?.medico?.nome || "Sem dados para hoje");
};