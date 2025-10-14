// src/utils/dadosConsolidados.js
import dayjs from "dayjs";

/**
 * Utilitários robustos para sanitizar, normalizar e agrupar dados de plantão.
 * Objetivo: receber dados "crus" do localStorage (ou API) e devolver
 * estruturas seguras e consistentes para componentes (Filtros, Relatorios, Home).
 */

/** Normaliza strings: minusculas, trim, remove acentos */
export const normalize = (str) => {
  if (str === null || str === undefined) return "";
  try {
    return String(str).toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  } catch (e) {
    // fallback simples
    return String(str).toLowerCase().trim();
  }
};

/** Formata data YYYY-MM-DD (retorna string) */
export const fmtDate = (d) => {
  if (!d) return "";
  const parsed = dayjs(d);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : "";
};

/** Converte datas variadas para dayjs
 * Aceita:
 *  - "YYYY-MM-DD" ou "YYYY-MM-DD HH:mm"
 *  - "DD/MM/YYYY" ou "DD/MM/YYYY HH:mm"
 *  - timestamps (número)
 */
export const parsePlantaoDate = (dataStr, horaStr = "00:00") => {
  if (!dataStr && !horaStr) return null;

  // se já é um Dayjs
  if (dataStr && dataStr.isValid && typeof dataStr.isValid === "function") {
    return dataStr;
  }

  // timestamps numéricos
  if (typeof dataStr === "number") {
    const d = dayjs(dataStr);
    return d.isValid() ? d : null;
  }

  // string vazia
  if (!dataStr || typeof dataStr !== "string") return null;

  const trimmed = dataStr.trim();

  // Formato ISO (YYYY-MM-DD or YYYY-MM-DDTHH:mm or including time)
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    // anexa hora se existir
    const maybe = horaStr && typeof horaStr === "string" ? `${trimmed} ${horaStr}` : trimmed;
    const d = dayjs(maybe);
    return d.isValid() ? d : dayjs(trimmed);
  }

  // Formato dd/mm/yyyy (com barras)
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed) || /^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}$/.test(trimmed)) {
    const parts = trimmed.split(" ");
    const datePart = parts[0];
    const timePart = parts[1] || horaStr || "00:00";
    const [dPart, mPart, yPart] = datePart.split("/");
    const iso = `${yPart.padStart(4, "0")}-${mPart.padStart(2, "0")}-${dPart.padStart(2, "0")} ${timePart}`;
    const d = dayjs(iso);
    return d.isValid() ? d : null;
  }

  // Tenta parse genérico
  const gen = dayjs(trimmed);
  return gen.isValid() ? gen : null;
};

/** Retorna data sempre no formato YYYY-MM-DD (ou "" se inválida) */
export const sanitizeData = (d, hora = "00:00") => {
  try {
    const parsed = parsePlantaoDate(d, hora);
    return parsed && parsed.isValid() ? parsed.format("YYYY-MM-DD") : "";
  } catch (e) {
    return "";
  }
};

/** Validação permissiva do plantão (usada tanto no front quanto ao limpar) */
export const isPlantaoValido = (p) => {
  if (!p || typeof p !== "object") return false;

  // quantidade pode vir em formatos estranhos, tenta extrair número
  let quantidade = p.quantidade;
  if (typeof quantidade === "string") {
    quantidade = quantidade.trim().toUpperCase();
    // substituir "," por "." se for decimal, remover letras exceto - .
    quantidade = quantidade.replace(/[^0-9\.\-]/g, "");
    quantidade = quantidade === "" ? NaN : Number(quantidade);
  } else {
    quantidade = Number(quantidade);
  }

  // nome e especialidade são obrigatórios (aceita se for objeto com nome)
  const nome = (p.nome || "").toString().trim();
  const espRaw = p.especialidade;
  const especialidade =
    (typeof espRaw === "object" && espRaw !== null && (espRaw.nome || espRaw.name)) ?
      (espRaw.nome || espRaw.name) : (espRaw || "");

  // data deve ser parseável
  const dataSan = sanitizeData(p.data, p.hora);
  const quantidadeOk = !isNaN(quantidade) && quantidade >= 0;

  return !!(dataSan && nome && String(especialidade).toString().trim() && quantidadeOk);
};

/** Computa período (Diurno / Noturno) a partir da hora string hh:mm
 * Retorna "Diurno" | "Noturno" | "Indefinido"
 */
export const computePeriodo = (hora) => {
  if (!hora || typeof hora !== "string") return "Indefinido";
  const cleaned = hora.trim();
  if (!cleaned.includes(":")) {
    // aceita "0800" -> "08:00"
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

/** Sanitiza um item bruto de plantão e retorna objeto limpo ou null se inválido.
 * Resultado padrão:
 * {
 *   original: <object original>,
 *   data: "YYYY-MM-DD",
 *   hora: "HH:mm" | "",
 *   quantidade: number,
 *   nome: "NOME",
 *   crm: "CRMUPPER",
 *   especialidade: "ESPECIALIDADE",
 *   periodo: "Diurno" | "Noturno" | "Indefinido"
 * }
 */
export const cleanPlantaoItem = (p, options = { logInvalid: false, idx: null }) => {
  try {
    if (!p || typeof p !== "object") {
      if (options.logInvalid) console.warn("cleanPlantaoItem: item não é objeto", options.idx, p);
      return null;
    }

    // data + hora
    const rawData = p.data ?? p.date ?? "";
    const rawHora = p.hora ?? p.horario ?? p.time ?? "";

    const dataSan = sanitizeData(rawData, rawHora);
    if (!dataSan) {
      if (options.logInvalid) console.warn("cleanPlantaoItem: data inválida", options.idx, rawData, rawHora);
      return null;
    }

    // quantidade - extrai número
    let q = p.quantidade ?? p.qtd ?? p.quantity ?? 0;
    if (typeof q === "string") {
      q = q.trim().toUpperCase().replace(/[^0-9\.\-]/g, "");
      q = q === "" ? 0 : Number(q);
    } else {
      q = Number(q);
    }
    if (isNaN(q) || q < 0) {
      if (options.logInvalid) console.warn("cleanPlantaoItem: quantidade inválida", options.idx, p.quantidade);
      return null;
    }

    // nome
    const nomeRaw = (p.nome ?? p.medico ?? "").toString().trim();
    if (!nomeRaw) {
      if (options.logInvalid) console.warn("cleanPlantaoItem: nome vazio", options.idx, p);
      return null;
    }
    const nome = nomeRaw;

    // crm
    const crmRaw = (p.crm ?? "").toString().trim();
    const crm = crmRaw ? crmRaw.toUpperCase() : "";

    // especialidade: se for objeto, pega nome
    const espRaw = p.especialidade ?? p.esp ?? p.specialty ?? "";
    let espNome = "";
    if (espRaw && typeof espRaw === "object") {
      espNome = (espRaw.nome || espRaw.name || "").toString().trim();
    } else {
      espNome = (espRaw || "").toString().trim();
    }
    if (!espNome) {
      if (options.logInvalid) console.warn("cleanPlantaoItem: especialidade vazia", options.idx, p);
      return null;
    }

    // periodo calculado
    const periodo = computePeriodo(rawHora);

    return {
      original: p,
      data: dataSan,
      hora: rawHora ? rawHora.trim() : "",
      quantidade: q,
      nome: nome,
      crm: crm,
      especialidade: espNome,
      periodo,
    };
  } catch (err) {
    if (options.logInvalid) console.warn("cleanPlantaoItem: erro ao limpar item", options.idx, err);
    return null;
  }
};

/** Limpa um array bruto de plantões e retorna apenas os válidos
 * options:
 *  - logInvalid: bool -> ativa console.warn para itens inválidos
 */
export const cleanPlantaoArray = (plantaoArray, options = { logInvalid: false }) => {
  if (!Array.isArray(plantaoArray)) return [];
  const out = [];
  for (let i = 0; i < plantaoArray.length; i++) {
    const raw = plantaoArray[i];
    const cleaned = cleanPlantaoItem(raw, { logInvalid: options.logInvalid, idx: i });
    if (cleaned) {
      out.push(cleaned);
    }
  }
  return out;
};

/** Converte lista de médicos bruta em estrutura usada por filtros (ex.: nome, crm, especialidade)
 * Aceita medicosData bruto e retorna array seguro.
 */
export const buildOpcoesMedicosFromRaw = (medicosData) => {
  if (!Array.isArray(medicosData)) return [];
  return medicosData.map((m) => {
    try {
      const nome = (m.nome || m.name || "").toString().trim();
      const crm = (m.crm || "").toString().trim().toUpperCase();
      // especialidade pode ser objeto
      const espRaw = m.especialidade || m.specialty || "";
      const especialidade = (typeof espRaw === "object" ? (espRaw.nome || espRaw.name || "") : espRaw) || "";
      return { ...m, nome, crm, especialidade };
    } catch (e) {
      return { ...m, nome: "", crm: "", especialidade: "" };
    }
  });
};

/** Agrupa plantões por médico + dia + especialidade
 * Aceita plantaoData no formato limpo (por exemplo saída de cleanPlantaoArray)
 * ou aceita objetos simples {data, hora, quantidade, nome, crm, especialidade}
 */
export const agruparPorMedicoDiaEsp = (plantaoData, medicosData = []) => {
  if (!Array.isArray(plantaoData)) return [];

  // Normaliza medicos para map por crm e nome
  const medicosMap = new Map();
  (medicosData || []).forEach((m) => {
    if (!m) return;
    try {
      const crmKey = (m.crm || "").toString().toUpperCase();
      if (crmKey) medicosMap.set(crmKey, m);
      const nomeKey = normalize(m.nome || m.name || "");
      if (nomeKey) medicosMap.set(nomeKey, m);
    } catch (e) {
      // ignore
    }
  });

  const map = Object.create(null);

  plantaoData.forEach((raw) => {
    // raw pode ser o objeto limpo ou o bruto
    const p = raw.data && raw.nome ? raw : cleanPlantaoItem(raw, { logInvalid: false });
    if (!p) return;

    // busca médico por crm ou nome normalizado
    const med = medicosMap.get((p.crm || "").toString().toUpperCase()) || medicosMap.get(normalize(p.nome));
    const medicoNome = med?.nome || p.nome || "";
    const espNome = med?.especialidade?.nome || med?.especialidade || p.especialidade || "";
    const dia = sanitizeData(p.data, p.hora) || p.data || "";

    if (!dia) return;

    const key = `${normalize(medicoNome)}‖${normalize(espNome)}‖${dia}`;

    if (!map[key]) {
      map[key] = {
        medico: (medicoNome || "").toUpperCase(),
        crm: (med?.crm || p.crm || "").toString().toUpperCase(),
        especialidade: (espNome || "").toUpperCase(),
        data: dia,
        periodo: p.periodo || computePeriodo(p.hora || ""),
        atendimentos: 0,
        items: [],
      };
    }

    const qtd = Number(p.quantidade ?? p.qtd ?? p.quantity ?? 0) || 0;
    map[key].atendimentos += qtd;
    map[key].items.push(p.original || p);
  });

  return Object.values(map);
};

/** Normaliza e mapeia plantões para interface de filtros/gráficos
 * Retorna array de objetos prontos: { data, periodo, especialidade, medico, crm, atendimentos, items }
 */
export const normalizarEMapearPlantaoData = (plantaoData) => {
  if (!Array.isArray(plantaoData)) return [];

  const cleaned = cleanPlantaoArray(plantaoData, { logInvalid: false });

  return cleaned.map((p) => {
    const dataISO = sanitizeData(p.data, p.hora) || p.data;
    const periodo = computePeriodo(p.hora);
    const quantidade = Number(p.quantidade || 0) || 0;
    const medico = (p.nome || "").toUpperCase();
    const crm = p.crm ? p.crm.toUpperCase() : "";
    const especialidade = (p.especialidade || "").toUpperCase();

    return { data: dataISO, periodo, especialidade, medico, crm, atendimentos: quantidade, items: [p.original || p] };
  });
};

export default {
  normalize,
  fmtDate,
  parsePlantaoDate,
  sanitizeData,
  isPlantaoValido,
  computePeriodo,
  cleanPlantaoItem,
  cleanPlantaoArray,
  buildOpcoesMedicosFromRaw,
  agruparPorMedicoDiaEsp,
  normalizarEMapearPlantaoData,
};
