import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import * as DC from "./dadosConsolidados.js";
import * as SP from "./storagePlantao.js";
import { 
  especialidades as especialidadesListRaw, 
  getEspecialidadeInfo as getEspInfo 
} from "../api/especialidades.js";

// -----------------------------
// 🌎 Configuração Global
// -----------------------------
dayjs.locale("pt-br");

// -----------------------------
// 🔸 Constantes de Storage
// -----------------------------
const PLANTAO_KEYS = ["plantaoData", "plantao", "plantaoList", "plantaoArray", "plantoes"];
const MEDICO_KEYS = ["medicos", "medicosList", "listaMedicos"];

// -----------------------------
// 🔸 Cache Interno (em memória)
// -----------------------------
let _cache = {
  // Cada item tem seu próprio timestamp
  plantao: { data: null, timestamp: 0 },
  medicos: { data: null, timestamp: 0 },
};

const CACHE_TTL_MS = 60 * 1000; // 1 minuto (ajustável)

// -----------------------------
// 🔸 Utilitários Internos
// -----------------------------
const tryParse = (v) => {
  try { return JSON.parse(v); } catch { return null; }
};

/**
 * [Função Genérica]
 * Lê múltiplas chaves no localStorage e retorna o primeiro array válido encontrado.
 */
const getArrayFromStorage = (keys) => {
  if (typeof window === "undefined" || typeof localStorage === "undefined") 
    return [];

  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = tryParse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (err) {
      console.warn(`⚠️ Erro ao ler storage key: ${key}`, err);
    }
  }
  return [];
};

// -----------------------------
// 🔸 Datas
// -----------------------------
export const fmtDate = (d) => {
  if (!d) return "";
  const base = dayjs.isDayjs(d) ? d : dayjs(DC.parsePlantaoDate(d));
  return base.isValid() ? base.format("DD/MM/YYYY") : "";
};

// -----------------------------
// 🔸 Sanitização / Normalização
// -----------------------------
export const sanitizeData = DC.sanitizeData ?? DC.parsePlantaoDate;

// -----------------------------
// 🔸 Especialidades
// -----------------------------
export const especialidades = Array.isArray(especialidadesListRaw)
  ? especialidadesListRaw
  : [];

export const getEspecialidadeInfo =
  typeof getEspInfo === "function"
    ? getEspInfo
    : (nome = "") => {
        const found = especialidades.find(
          (e) => e?.nome?.toLowerCase() === nome.toLowerCase()
        );
        return found ?? { cor: undefined, nome };
      };

// -----------------------------
// 🔸 Cache Helpers
// -----------------------------
const isItemValid = (item) =>
  item?.data && Date.now() - item.timestamp < CACHE_TTL_MS;

export const clearCache = () => {
  _cache = { 
    plantao: { data: null, timestamp: 0 }, 
    medicos: { data: null, timestamp: 0 } 
  };
};

// -----------------------------
// 🔸 Storage (com cache individual)
// -----------------------------
export const getPlantaoFromStorage = (forceReload = false) => {
  // 1. Checa cache apenas para plantão
  if (!forceReload && isItemValid(_cache.plantao)) {
    return _cache.plantao.data;
  }

  // 2. Lê localStorage
  let data = getArrayFromStorage(PLANTAO_KEYS);
  if (!data.length) {
    try {
      const fallback = SP.getPlantaoFromStorage?.();
      if (Array.isArray(fallback)) data = fallback;
    } catch (err) {
      console.warn("⚠️ Erro no fallback de storagePlantao.js", err);
    }
  }

  // 3. Atualiza cache
  _cache.plantao = { data, timestamp: Date.now() };
  return data;
};

export const getMedicosFromStorage = (forceReload = false) => {
  // 1. Checa cache apenas para médicos
  if (!forceReload && isItemValid(_cache.medicos)) {
    return _cache.medicos.data;
  }

  // 2. Lê localStorage
  const data = getArrayFromStorage(MEDICO_KEYS);

  // 3. Atualiza cache
  _cache.medicos = { data, timestamp: Date.now() };
  return data;
};

// -----------------------------
// 🔸 Exportação principal (Barrel File)
// -----------------------------
export * from "./dadosConsolidados.js";

export default {
  ...DC,
  fmtDate,
  sanitizeData,
  getPlantaoFromStorage,
  getMedicosFromStorage,
  clearCache,
  especialidades,
  getEspecialidadeInfo,
  getEspecialidadesList: () => especialidades,
  getEspecialidadeInfoByName: getEspecialidadeInfo,
  getEspecialidadeIconeByName: (name) => getEspecialidadeInfo(name)?.icone ?? null,
  getPlantaoRecords: DC.getPlantaoRecords,
  parsePlantaoDate: DC.parsePlantaoDate,
  normalize: DC.normalize,
};
