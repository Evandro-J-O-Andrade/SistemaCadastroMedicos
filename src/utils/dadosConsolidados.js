// src/utils/dadosConsolidados.js
import dayjs from "dayjs";

/**
 * Utilitários robustos para sanitizar, normalizar e agrupar dados de plantão.
 */

/** Normaliza strings: minusculas, trim, remove acentos */
export const normalize = (str) => {
  if (str === null || str === undefined) return "";
  try {
    return String(str).toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  } catch (e) {
    return String(str).toLowerCase().trim();
  }
};

/** Formata data YYYY-MM-DD (retorna string) */
export const fmtDate = (d) => {
  if (!d) return "";
  const parsed = dayjs(d);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : "";
};

/** Converte datas variadas para dayjs */
export const parsePlantaoDate = (dataStr, horaStr = "00:00") => {
  if (!dataStr && !horaStr) return null;

  if (dataStr && dataStr.isValid && typeof dataStr.isValid === "function") {
    return dataStr;
  }

  if (typeof dataStr === "number") {
    const d = dayjs(dataStr);
    return d.isValid() ? d : null;
  }

  if (!dataStr || typeof dataStr !== "string") return null;

  const trimmed = dataStr.trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const maybe = horaStr && typeof horaStr === "string" ? `${trimmed} ${horaStr}` : trimmed;
    const d = dayjs(maybe);
    return d.isValid() ? d : dayjs(trimmed);
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed) || /^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}$/.test(trimmed)) {
    const parts = trimmed.split(" ");
    const datePart = parts[0];
    const timePart = parts[1] || horaStr || "00:00";
    const [dPart, mPart, yPart] = datePart.split("/");
    const iso = `${yPart.padStart(4, "0")}-${mPart.padStart(2, "0")}-${dPart.padStart(2, "0")} ${timePart}`;
    const d = dayjs(iso);
    return d.isValid() ? d : null;
  }

  const gen = dayjs(trimmed);
  return gen.isValid() ? gen : null;
};

/** Retorna data sempre no formato YYYY-MM-DD (ou "" se inválida) */
export const sanitizeData = (d, hora = "00:00") => {
  try {
    const parsed = parsePlantaoDate(d, hora);
    return parsed && parsed.isValid && parsed.isValid() ? parsed.format("YYYY-MM-DD") : "";
  } catch (e) {
    return "";
  }
};

/** Validação permissiva do plantão */
export const isPlantaoValido = (p) => {
  if (!p || typeof p !== "object") return false;

  let quantidade = p.quantidade;
  if (typeof quantidade === "string") {
    quantidade = quantidade.trim().toUpperCase().replace(/[^0-9\.\-]/g, "");
    quantidade = quantidade === "" ? NaN : Number(quantidade);
  } else quantidade = Number(quantidade);

  const nome = (p.nome || "").toString().trim();
  const espRaw = p.especialidade;
  const especialidade =
    (typeof espRaw === "object" && espRaw !== null && (espRaw.nome || espRaw.name)) ?
    (espRaw.nome || espRaw.name) : (espRaw || "");

  const dataSan = sanitizeData(p.data, p.hora);
  const quantidadeOk = !isNaN(quantidade) && quantidade >= 0;

  return !!(dataSan && nome && String(especialidade).trim() && quantidadeOk);
};

/** Computa período (Diurno / Noturno) */
export const computePeriodo = (hora) => {
  if (!hora || typeof hora !== "string") return "Indefinido";
  const cleaned = hora.trim();
  if (!cleaned.includes(":")) {
    if (/^\d{3,4}$/.test(cleaned)) {
      const pad = cleaned.padStart(4, "0");
      return computePeriodo(`${pad.slice(0, 2)}:${pad.slice(2)}`);
    }
    return "Indefinido";
  }
  const [hStr, mStr] = cleaned.split(":");
  const h = Number(hStr);
  const m = Number((mStr || "0").replace(/\D/g, ""));
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return "Indefinido";
  const minutos = h * 60 + m;
  return minutos >= 7 * 60 && minutos < 19 * 60 ? "Diurno" : "Noturno";
};

/** Sanitiza um item bruto de plantão */
export const cleanPlantaoItem = (p, options = { logInvalid: false, idx: null }) => {
  try {
    if (!p || typeof p !== "object") {
      if (options.logInvalid) console.warn("cleanPlantaoItem: item não é objeto", options.idx, p);
      return null;
    }

    const rawData = p.data ?? p.date ?? "";
    const rawHora = p.hora ?? p.horario ?? p.time ?? "";

    const dataSan = sanitizeData(rawData, rawHora);
    if (!dataSan) {
      if (options.logInvalid) console.warn("cleanPlantaoItem: data inválida", options.idx, rawData, rawHora);
      return null;
    }

    let q = p.quantidade ?? p.qtd ?? p.quantity ?? 0;
    if (typeof q === "string") q = q.trim().toUpperCase().replace(/[^0-9\.\-]/g, "") || 0;
    else q = Number(q);
    if (isNaN(q) || q < 0) {
      if (options.logInvalid) console.warn("cleanPlantaoItem: quantidade inválida", options.idx, p.quantidade);
      return null;
    }

    const nomeRaw = (p.nome ?? p.medico ?? "").toString().trim();
    if (!nomeRaw) {
      if (options.logInvalid) console.warn("cleanPlantaoItem: nome vazio", options.idx, p);
      return null;
    }
    const nome = nomeRaw;

    const crmRaw = (p.crm ?? "").toString().trim();
    const crm = crmRaw ? crmRaw.toUpperCase() : "";

    const espRaw = p.especialidade ?? p.esp ?? p.specialty ?? "";
    let espNome = "";
    if (espRaw && typeof espRaw === "object") espNome = (espRaw.nome || espRaw.name || "").toString().trim();
    else espNome = (espRaw || "").toString().trim();
    if (!espNome) {
      if (options.logInvalid) console.warn("cleanPlantaoItem: especialidade vazia", options.idx, p);
      return null;
    }

    const periodo = computePeriodo(rawHora);

    return {
      original: p,
      data: dataSan,
      hora: rawHora ? rawHora.trim() : "",
      quantidade: q,
      nome,
      crm,
      especialidade: espNome,
      periodo,
    };
  } catch (err) {
    if (options.logInvalid) console.warn("cleanPlantaoItem: erro ao limpar item", options.idx, err);
    return null;
  }
};

/** Limpa array de plantões */
export const cleanPlantaoArray = (plantaoArray, options = { logInvalid: false }) => {
  if (!Array.isArray(plantaoArray)) return [];
  const out = [];
  for (let i = 0; i < plantaoArray.length; i++) {
    const cleaned = cleanPlantaoItem(plantaoArray[i], { logInvalid: options.logInvalid, idx: i });
    if (cleaned) out.push(cleaned);
  }
  return out;
};

/** Constrói lista de médicos para filtros */
export const buildOpcoesMedicosFromRaw = (medicosData) => {
  if (!Array.isArray(medicosData)) return [];
  return medicosData.map((m) => {
    try {
      const nome = (m.nome || m.name || "").toString().trim();
      const crm = (m.crm || "").toString().trim().toUpperCase();
      const espRaw = m.especialidade || m.specialty || "";
      const especialidade = (typeof espRaw === "object" ? (espRaw.nome || espRaw.name || "") : espRaw) || "";
      return { ...m, nome, crm, especialidade };
    } catch {
      return { ...m, nome: "", crm: "", especialidade: "" };
    }
  });
};

/** Agrupa plantões por médico + dia + especialidade */
export const agruparPorMedicoDiaEsp = (plantaoData, medicosData = []) => {
  if (!Array.isArray(plantaoData)) return [];

  const medicosMap = new Map();
  (medicosData || []).forEach((m) => {
    if (!m) return;
    try {
      const crmKey = (m.crm || "").toString().toUpperCase();
      if (crmKey) medicosMap.set(crmKey, m);
      const nomeKey = normalize(m.nome || m.name || "");
      if (nomeKey) medicosMap.set(nomeKey, m);
    } catch {}
  });

  const map = Object.create(null);

  plantaoData.forEach((raw) => {
    const p = raw.data && raw.nome ? raw : cleanPlantaoItem(raw, { logInvalid: false });
    if (!p) return;

    const med = medicosMap.get((p.crm || "").toUpperCase()) || medicosMap.get(normalize(p.nome));
    const medicoNome = med?.nome || p.nome || "";
    const espNome = med?.especialidade?.nome || med?.especialidade || p.especialidade || "";
    const dia = sanitizeData(p.data, p.hora) || p.data || "";
    if (!dia) return;

    const key = `${normalize(medicoNome)}‖${normalize(espNome)}‖${dia}`;
    if (!map[key]) {
      map[key] = {
        medico: medicoNome.toUpperCase(),
        crm: (med?.crm || p.crm || "").toUpperCase(),
        especialidade: espNome.toUpperCase(),
        data: dia,
        periodo: p.periodo || computePeriodo(p.hora || ""),
        atendimentos: 0,
        items: [],
      };
    }

    const qtd = Number(p.quantidade ?? 0);
    map[key].atendimentos += qtd;
    map[key].items.push(p.original || p);
  });

  return Object.values(map);
};

/** Normaliza e mapeia plantões para filtros/gráficos */
export const normalizarEMapearPlantaoData = (plantaoData) => {
  if (!Array.isArray(plantaoData)) return [];
  const cleaned = cleanPlantaoArray(plantaoData, { logInvalid: false });

  return cleaned.map((p) => ({
    data: sanitizeData(p.data, p.hora) || p.data,
    periodo: computePeriodo(p.hora),
    especialidade: (p.especialidade || "").toUpperCase(),
    medico: (p.nome || "").toUpperCase(),
    crm: p.crm ? p.crm.toUpperCase() : "",
    atendimentos: Number(p.quantidade || 0),
    items: [p.original || p],
  }));
};

/** Recupera plantões do localStorage */
export function getPlantaoFromStorage(candidateKeys = ['plantaoData','plantao','plantaoList','plantaoArray']) {
  for (const k of candidateKeys) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
}

/* Compat layer / aliases */

export const computePeriodoFromHora = computePeriodo;

export const fmtHora = (hora) => {
  if (!hora && hora !== 0) return "";
  try {
    const s = String(hora).trim();
    if (/^\d{3,4}$/.test(s)) {
      const pad = s.padStart(4, "0");
      return `${pad.slice(0, 2)}:${pad.slice(2)}`;
    }
    if (/^\d{1,2}:\d{2}$/.test(s)) return s;
    return s;
  } catch {
    return String(hora);
  }
};

export function periodoFromDate(data) {
  try {
    if (!data) return "Indefinido";
    const d = typeof data === "string" || typeof data === "number" ? parsePlantaoDate(data) : dayjs(data);
    if (!d || !(typeof d.isValid === "function") || !d.isValid()) return "Indefinido";
    const hora = d.format("HH:mm");
    return computePeriodo(hora);
  } catch {
    return "Indefinido";
  }
}

// Implementação segura para evitar referência indefinida
export const normalizePlantaoForRelatorios = (plantaoData) => {
  // Por enquanto, mapeia para a estrutura usada em relatórios
  return normalizarEMapearPlantaoData(plantaoData);
};

// Export final
export default {
  normalize,
  sanitizeData,
  parsePlantaoDate,
  fmtDate,
  fmtHora,
  computePeriodo,
  computePeriodoFromHora,
  periodoFromDate,
  cleanPlantaoItem,
  cleanPlantaoArray,
  isPlantaoValido,
  agruparPorMedicoDiaEsp,
  buildOpcoesMedicosFromRaw,
  normalizarEMapearPlantaoData,
  normalizePlantaoForRelatorios,
  getPlantaoFromStorage,
};
