import * as DC from "./dadosConsolidados.js";
import * as SP from "./storagePlantao.js";
import { especialidades as especialidadesListRaw, getEspecialidadeInfo as getEspInfo } from "../api/especialidades.js";

const tryParse = (v) => {
  try { return JSON.parse(v); } catch { return null; }
};

export const normalize = DC.normalize;
export const fmtDate = (d) => {
  // Mantém compatibilidade: retorna "DD/MM/YYYY" quando possível
  if (!d) return "";
  const parsed = DC.parsePlantaoDate(d) || null;
  if (!parsed) return "";
  // dayjs já é usado dentro de dadosConsolidados; format aqui
  try {
    const dayjs = require("dayjs");
    dayjs.locale("pt-br");
    const dt = dayjs(parsed);
    return dt.isValid() ? dt.format("DD/MM/YYYY") : "";
  } catch (e) {
    return parsed;
  }
};

export const parsePlantaoDate = DC.parsePlantaoDate;
export const sanitizeData = DC.sanitizeData || DC.parsePlantaoDate;
export const cleanPlantaoArray = DC.cleanPlantaoArray;
export const buildOpcoesMedicosFromRaw = DC.buildOpcoesMedicosFromRaw;
export const agruparPorMedicoDiaEsp = DC.agruparPorMedicoDiaEsp;
export const computePeriodo = DC.computePeriodo;
export const normalizePlantao = DC.normalizePlantao;
export const normalizarEMapearPlantaoData = DC.normalizarEMapearPlantaoData;

// Especialidades
export const especialidades = Array.isArray(especialidadesListRaw) ? especialidadesListRaw : [];
export const getEspecialidadeInfo = typeof getEspInfo === "function" ? getEspInfo : (n) => (especialidades.find(e => (e.nome||"").toLowerCase() === (n||"").toLowerCase()) || { cor: undefined, nome: n });

// Storage helpers (tenta várias chaves)
export const getPlantaoFromStorage = (keys = ["plantaoData","plantao","plantaoList","plantaoArray","plantoes","plantao"]) => {
  for (const k of keys) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = tryParse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) { /* ignore */ }
  }
  // fallback para storagePlantao.js
  if (SP && typeof SP.getPlantaoFromStorage === "function") {
    try { const r = SP.getPlantaoFromStorage(); if (Array.isArray(r)) return r; } catch {}
  }
  return [];
};

export const getMedicosFromStorage = (keys = ["medicos","medicosList","listaMedicos"]) => {
  for (const k of keys) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = tryParse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) { /* ignore */ }
  }
  return [];
};

export default {
  ...DC,
  normalize,
  fmtDate,
  parsePlantaoDate,
  sanitizeData,
  cleanPlantaoArray,
  buildOpcoesMedicosFromRaw,
  agruparPorMedicoDiaEsp,
  getPlantaoFromStorage,
  getMedicosFromStorage,
  especialidades,
  getEspecialidadeInfo,
};