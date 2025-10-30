// src/services/dataService.js
// =========================================================
// 🔹 Camada de serviço principal — unifica acesso a dados
// =========================================================

// ✅ CORRIGIDO: Importando getAllData e safeSave que são usados pela saveMedicos
import { storageManager, STORAGE_KEY, getAllData, safeSave } from "../utils/storageManager.js"; 
import {
  cleanPlantaoArray,
  buildOpcoesMedicosFromRaw,
  agruparPorMedicoDiaEsp,
  normalize,
  parsePlantaoDate,
  sanitizeData,
  normalizarEMapearPlantaoData
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

const CACHE_LIFETIME = 5000; // 5 segundos

// ----------------------------------------------------
// 🔹 LEITURA
// ----------------------------------------------------

export const fetchMedicos = () => {
  if (cache.medicos.data && Date.now() - cache.medicos.timestamp < CACHE_LIFETIME) {
    // Retorna dados brutos (deve ser ajustado se buildOpcoesMedicosFromRaw for necessário)
    return cache.medicos.data; 
  }
  const medicos = storageManager.getMedicos(); // Usa o método do manager
  cache.medicos = { data: medicos, timestamp: Date.now() };
  return medicos;
};

// ... (fetchPlantao, fetchEspecialidades, etc. - Funções de leitura)

// ----------------------------------------------------
// 🔹 ESCRITA (ADICIONAR)
// ----------------------------------------------------

/**
 * Salva a lista de médicos no formato centralizado do storageManager.
 * @param {Array<Object>} medicosList
 * @returns {boolean} Sucesso ou falha.
 */
export const saveMedicos = (medicosList) => { // <-- EXPORT CONSTATE saveMedicos
  try {
    // 1. Obtém a estrutura de dados completa atual (do storageManager)
    const currentData = getAllData();
    
    // 2. Atualiza apenas o array 'medicos'
    currentData.medicos = medicosList;
    
    // 3. Salva a estrutura completa de volta (no storageManager)
    safeSave(STORAGE_KEY, currentData);

    // Opcional: Invalidar cache local
    cache.medicos.data = medicosList;
    cache.medicos.timestamp = Date.now();
    
    // Dispara evento para notificar toda a aplicação (útil para Medicos.jsx)
    window.dispatchEvent(new Event("dadosAtualizados")); 
    
    return true;
  } catch (error) {
    console.error("❌ Erro ao salvar médicos via dataServices:", error);
    return false;
  }
};


// ----------------------------------------------------
// 🔹 FUNÇÕES DE DADOS CONSOLIDADOS (Filtros/Relatórios)
// ----------------------------------------------------

export const getDadosConsolidados = (filtros = {}) => {
  try {
    const rawPlantaoData = storageManager.getPlantao(); // Lê o array 'plantao' da estrutura central

    // 1. Normalização e Mapeamento inicial
    let filtered = normalizarEMapearPlantaoData(rawPlantaoData);

    // 2. Aplicação de filtros
    if (filtros.medico) {
      filtered = filtrarPorMedico(filtered, filtros.medico);
    }
    if (filtros.especialidade) {
      filtered = filtrarPorEspecialidade(filtered, filtros.especialidade);
    }
    if (filtros.dataInicio || filtros.dataFim) {
      const inicio = parsePlantaoDate(filtros.dataInicio, filtros.horaDe || "07:00");
      const fim = parsePlantaoDate(filtros.dataFim, filtros.horaAte || "19:00");
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
      resumo: { totalDias, mediaAtendimentos }, 
    }));
  } catch (error) {
    console.error("❌ Erro ao gerar dados consolidados:", error);
    return [];
  }
};

// =========================================================
// 🔹 DEBUG DEV
// =========================================================

export const debugStorage = () => {
    storageManager.debug();
};