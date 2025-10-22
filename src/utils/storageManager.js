// src/utils/storageManager.js
// =========================================================
// 🌐 GERENCIADOR CENTRALIZADO DE LOCALSTORAGE DO SISTEMA
// =========================================================

const STORAGE_KEY = "plantaoData";
const BACKUP_KEY = `${STORAGE_KEY}Backup`;

/**
 * 🔧 Helper: leitura segura do localStorage
 */
const safeParse = (data, fallback = {}) => {
  try {
    return data ? JSON.parse(data) : fallback;
  } catch {
    console.warn("⚠️ Dados corrompidos no localStorage, restaurando padrão.");
    return fallback;
  }
};

/**
 * 🔧 Estrutura base do armazenamento
 */
const baseData = {
  medicos: [],
  especialidades: [],
  plantao: [],
  usuario: null,
};

/**
 * 🔧 Helper: salva no storage com stringify seguro
 */
const safeSave = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`❌ Erro ao salvar em ${key}:`, err);
  }
};

/**
 * 🔧 Helper: lê a estrutura completa do storage
 */
const getAllData = () => {
  return safeParse(localStorage.getItem(STORAGE_KEY), { ...baseData });
};

// =========================================================
// 🔹 API PRINCIPAL
// =========================================================
export const storageManager = {
  // ======== GETS ========
  getAll: () => getAllData(),

  getMedicos: () => getAllData().medicos || [],
  getEspecialidades: () => getAllData().especialidades || [],
  getPlantao: () => getAllData().plantao || [],
  getUsuario: () => getAllData().usuario || null,

  // ======== SETS ========
  setAll(data = {}) {
    const novo = { ...baseData, ...data };
    safeSave(STORAGE_KEY, novo);
  },

  setMedicos(medicos = []) {
    const data = getAllData();
    data.medicos = medicos;
    safeSave(STORAGE_KEY, data);
  },

  setEspecialidades(especialidades = []) {
    const data = getAllData();
    data.especialidades = especialidades;
    safeSave(STORAGE_KEY, data);
  },

  setPlantao(plantao = []) {
    const data = getAllData();
    data.plantao = plantao;
    safeSave(STORAGE_KEY, data);
  },

  setUsuario(usuario = null) {
    const data = getAllData();
    data.usuario = usuario;
    safeSave(STORAGE_KEY, data);
  },

  // ======== BACKUP & RESTAURAÇÃO ========
  createBackup() {
    const data = getAllData();
    safeSave(BACKUP_KEY, data);
    console.log("💾 Backup criado com sucesso.");
  },

  restoreBackup() {
    const backup = safeParse(localStorage.getItem(BACKUP_KEY), null);
    if (!backup) {
      console.warn("⚠️ Nenhum backup encontrado.");
      return false;
    }
    safeSave(STORAGE_KEY, backup);
    console.log("🔄 Backup restaurado com sucesso.");
    return true;
  },

  // ======== OUTROS ========
  clear() {
    localStorage.removeItem(STORAGE_KEY);
    console.log("🧹 Storage limpo com sucesso.");
  },

  debug() {
    console.table(getAllData());
  },
};
