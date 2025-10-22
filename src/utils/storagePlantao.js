/**
 * storagePlantao.js
 * --------------------------------------------------------
 * Responsável por ler, salvar e limpar dados de plantão e médicos no localStorage.
 * - Aplica normalização básica e remoção de duplicados.
 * - Usa utilitários de dadosConsolidados (normalize, sanitizeData).
 * - Não faz agrupamento nem cálculos — apenas persistência local.
 * --------------------------------------------------------
 * Fluxo:
 *   UI  <->  storagePlantao  <->  dadosConsolidados  <->  especialidades
 */

// src/utils/storagePlantao.js
import dayjs from "dayjs";
dayjs.locale("pt-br");
import { normalize as normalizeDC, sanitizeData } from "./dadosConsolidados";

// 🔧 Helper — Remove valores inválidos, nulos ou duplicados
const cleanArray = (arr) => {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  return arr
    .map((i) => (typeof i === "string" ? i.trim() : i))
    .filter((i) => i && (typeof i !== "object" || Object.keys(i).length > 0))
    .filter((item) => {
      const key = JSON.stringify(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

// 🔧 Helper — Normaliza texto (sem acento, lowercase)
export const normalize = (text = "") => normalizeDC(text);

// =======================================================
// 🔹 MÉDICOS STORAGE
// =======================================================
export const getMedicosFromStorage = () => {
  try {
    let medicos = JSON.parse(localStorage.getItem("medicos")) || [];
    medicos = cleanArray(medicos).map((m) => {
      const nome = (m?.nome || m?.medico || "").toString().trim();
      const crm = (m?.crm || "")
        .toString()
        .toUpperCase()
        .replace(/\s+/g, "")
        .replace(/[^A-Z0-9]/g, "");
      const especialidade = (m?.especialidade || m?.esp || "GERAL").toString().trim();

      return {
        id: m?.id || `${normalize(nome)}_${crm || "semcrm"}`,
        nome: nome.toUpperCase(),
        crm,
        especialidade: especialidade.toUpperCase(),
        _normNome: normalize(nome),
        _normEspecialidade: normalize(especialidade),
      };
    });
    return medicos;
  } catch (err) {
    console.warn("⚠️ Erro ao ler médicos do storage:", err);
    return [];
  }
};

export const saveMedicosToStorage = (medicos = []) => {
  try {
    const limpo = cleanArray(medicos).map((m) => ({
      ...m,
      nome: m.nome?.toUpperCase() || "N/D",
      especialidade: m.especialidade?.toUpperCase() || "GERAL",
      crm: m.crm?.toUpperCase() || "",
    }));
    localStorage.setItem("medicos", JSON.stringify(limpo));
    return true;
  } catch (err) {
    console.error("❌ Erro ao salvar médicos:", err);
    return false;
  }
};

// =======================================================
// 🔹 PLANTÃO STORAGE
// =======================================================
export const getPlantaoFromStorage = () => {
  try {
    let dados = JSON.parse(localStorage.getItem("plantaoData")) || [];
    dados = cleanArray(dados).map((item) => {
      const dataISO = sanitizeData(item?.data || item?.dia);
      const periodo = (item?.periodo || item?.turno || "DIA").toString().toUpperCase();
      const medico = (item?.medico || item?.nomeMedico || "N/D").toString().trim().toUpperCase();
      const especialidade = (item?.especialidade || item?.esp || "GERAL").toString().trim().toUpperCase();
      const atendimentos = Number(item?.atendimentos || item?.total || 0);
      const crm = (item?.crm || "").toString().toUpperCase().trim();

      return {
        data: dataISO,
        periodo,
        medico,
        especialidade,
        crm,
        atendimentos,
        _normMedico: normalize(medico),
        _normEspecialidade: normalize(especialidade),
      };
    });
    return cleanArray(dados);
  } catch (err) {
    console.warn("⚠️ Erro ao ler plantões do storage:", err);
    return [];
  }
};

export const savePlantaoToStorage = (dados = []) => {
  try {
    const limpo = cleanArray(dados).map((item) => ({
      ...item,
      medico: item.medico?.toUpperCase() || "N/D",
      especialidade: item.especialidade?.toUpperCase() || "GERAL",
      crm: item.crm?.toUpperCase() || "",
      data: sanitizeData(item.data) || "",
    }));
    localStorage.setItem("plantaoData", JSON.stringify(limpo));
    return true;
  } catch (err) {
    console.error("❌ Erro ao salvar plantão:", err);
    return false;
  }
};

// =======================================================
// 🔹 BACKUP / LIMPEZA / DEBUG
// =======================================================
export const clearPlantaoStorage = ({ backup = true } = {}) => {
  const keys = ["medicos", "plantaoData"];
  if (backup) {
    const backupData = {};
    keys.forEach((k) => {
      const item = localStorage.getItem(k);
      if (item) backupData[k] = JSON.parse(item);
    });
    localStorage.setItem("plantaoBackup", JSON.stringify(backupData));
    console.log("💾 Backup do storage criado em 'plantaoBackup'");
  }
  keys.forEach((k) => localStorage.removeItem(k));
  console.log("🧹 Storage limpo com sucesso.");
};

export const restorePlantaoStorage = () => {
  const backup = JSON.parse(localStorage.getItem("plantaoBackup"));
  if (!backup) {
    console.warn("⚠️ Nenhum backup encontrado para restaurar.");
    return;
  }
  Object.entries(backup).forEach(([k, v]) => {
    localStorage.setItem(k, JSON.stringify(v));
  });
  console.log("🔄 Dados restaurados com sucesso.");
};

export const debugStorage = () => {
  console.table({
    medicos: JSON.parse(localStorage.getItem("medicos")),
    plantaoData: JSON.parse(localStorage.getItem("plantaoData")),
    backup: JSON.parse(localStorage.getItem("plantaoBackup")),
  });
};
