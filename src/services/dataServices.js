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

export async function getDadosConsolidados(filters = {}) {
  // filters: { dataInicio, dataFim, horaDe, horaAte, medico, especialidade, crm }
  try {
    const res = await fetch('/backend/api/relatorio.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filters),
    });
    const j = await res.json();
    if (!res.ok || !j.success) {
      console.error('Erro ao buscar relatorio:', j);
      return [];
    }
    // a procedure retorna rows: medico_nome, crm, especialidade_nome, data, hora, atendimentos
    // map para estrutura esperada pelo Filtros.jsx (cada item como agrupamento)
    return (j.data || []).map(r => ({
      medico: r.medico_nome || '—',
      crm: r.crm || '',
      especialidade: r.especialidade_nome || '—',
      data: r.data || null,
      hora: r.hora || null,
      atendimentos: Number(r.atendimentos) || 0,
      // items: pode-se manter se precisar agrupamento posterior
      items: [{ quantidade: Number(r.atendimentos) || 0, hora: r.hora, data: r.data, especialidade: r.especialidade_nome, crm: r.crm }]
    }));
  } catch (e) {
    console.error('getDadosConsolidados error', e);
    return [];
  }
}

export async function insertPlantao(payload = {}) {
  try {
    const res = await fetch('/backend/api/plantao_insert.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const j = await res.json();
    return j.success === true;
  } catch (e) {
    console.error('insertPlantao error', e);
    return false;
  }
}

// =========================================================
// 🔹 DEBUG DEV
// =========================================================

export const debugStorage = () => {
    storageManager.debug();
};