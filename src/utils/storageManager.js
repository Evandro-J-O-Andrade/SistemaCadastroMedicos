// src/utils/storageManager.js
// =========================================================
// 🌐 GERENCIADOR CENTRALIZADO DE LOCALSTORAGE DO SISTEMA
// =========================================================

// CORRIGIDO: Adicionando 'export' para que dataServices.js consiga importar.
export const STORAGE_KEY = "plantaoData";
export const BACKUP_KEY = `${STORAGE_KEY}Backup`;

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
 * EXPORTADO para uso em dataServices.js.
 */
export const safeSave = (key, data) => { // <-- EXPORT CORRIGIDO
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`❌ Erro ao salvar em ${key}:`, err);
  }
};

/**
 * 🔧 Helper: lê a estrutura completa do storage
 * EXPORTADO para uso em dataServices.js.
 */
export const getAllData = () => { // <-- EXPORT CORRIGIDO
  return safeParse(localStorage.getItem(STORAGE_KEY), { ...baseData });
};


// ----------------------------------------------------
// storageManager API
// ----------------------------------------------------

export const storageManager = {
  // Acesso direto aos arrays internos
  getMedicos: () => getAllData().medicos,
  getPlantao: () => getAllData().plantao,
  getEspecialidades: () => getAllData().especialidades,
  getUsuario: () => getAllData().usuario,

  // Funções de escrita/atualização (usadas internamente ou por dataServices)
  setMedicos: (medicosList) => {
    const data = getAllData();
    data.medicos = medicosList;
    safeSave(STORAGE_KEY, data);
  },
  setPlantao: (plantaoList) => {
    const data = getAllData();
    data.plantao = plantaoList;
    safeSave(STORAGE_KEY, data);
  },
  // ... outras funções de set ...


  // ----------------------------------------------------
  // Migração de dados antigos (MUITO IMPORTANTE)
  // ----------------------------------------------------
  migrateOldData: () => {
    try {
      // Tenta ler chaves antigas
      const oldMedicos = safeParse(localStorage.getItem("medicos") || "[]", []);
      const oldPlantao = safeParse(localStorage.getItem("plantao") || "[]", []);
      const oldEspecialidades = safeParse(localStorage.getItem("especialidades") || "[]", []);
      const oldUsuario = safeParse(localStorage.getItem("usuario") || "null", null);

      const existeAntigo =
        (Array.isArray(oldMedicos) && oldMedicos.length > 0) ||
        (Array.isArray(oldPlantao) && oldPlantao.length > 0) ||
        (Array.isArray(oldEspecialidades) && oldEspecialidades.length > 0) ||
        oldUsuario;

      if (!existeAntigo) return;

      console.log("⚙️ Migrando dados antigos para formato unificado (plantaoData)...");

      const atual = getAllData();
      atual.medicos = oldMedicos.length ? oldMedicos : atual.medicos;
      atual.plantao = oldPlantao.length ? oldPlantao : atual.plantao;
      atual.especialidades = oldEspecialidades.length ? oldEspecialidades : atual.especialidades;
      atual.usuario = oldUsuario || atual.usuario;

      safeSave(STORAGE_KEY, atual);

      // Limpa chaves antigas (opcional — descomente se quiser limpar)
      // localStorage.removeItem("medicos");
      // localStorage.removeItem("plantao");
      // localStorage.removeItem("especialidades");
      // localStorage.removeItem("usuario");

      console.log("✅ Migração concluída com sucesso.");
    } catch (err) {
      console.error("❌ Erro ao migrar dados antigos:", err);
    }
  },

  // ======== OUTROS ========
  clear() {
    localStorage.removeItem(STORAGE_KEY);
    console.log("🧹 Storage limpo com sucesso.");
  },

  debug: () => {
    console.log('DEBUG STORAGE:', getAllData());
  }
};