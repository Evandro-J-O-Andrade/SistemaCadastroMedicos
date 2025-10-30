// src/utlis/relatorioService.js
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { jsPDF } from "jspdf";
import "jspdf-autotable"; // Necessário para doc.autoTable
import * as XLSX from "xlsx";
import { getEspecialidadeInfo } from "../api/especialidades.js"; // Função para buscar informações da especialidade, como cor

dayjs.locale("pt-br");

// ===============================================
// 🔹 Funções de Filtragem (para uso em dataServices.js)
// ===============================================

// Normaliza string (remove acentos, caixa alta, trim)
export const normalizeString = (str) =>
  !str ? "" : str.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Converte data/hora do plantão para Date
export const parsePlantaoDate = (dataStr, horaStr = "00:00") => {
  if (!dataStr) return null;
  if (dataStr.includes("-")) return new Date(`${dataStr}T${horaStr}`);
  const [dia, mes, ano] = dataStr.split("/");
  return new Date(`${ano}-${mes}-${dia}T${horaStr}`);
};

// Filtra por médico e CRM
export const filtrarPorMedico = (dados, nomeBusca, crmBusca) => {
  if (!nomeBusca && !crmBusca) return dados;
  return dados.filter((p) => {
    const okMed = nomeBusca ? normalizeString(p.medico) === normalizeString(nomeBusca) : true;
    const okCrm = crmBusca ? normalizeString(p.crm) === normalizeString(crmBusca) : true;
    return okMed && okCrm;
  });
};

// Filtra por especialidade
export const filtrarPorEspecialidade = (dados, especialidadeBusca) => {
  if (!especialidadeBusca) return dados;
  return dados.filter((p) =>
    normalizeString(p.especialidade).includes(normalizeString(especialidadeBusca))
  );
};

// Filtra por intervalo de data/hora
export const filtrarPorDataHora = (
  dados,
  dataInicio,
  dataFim,
  horaDe = "07:00",
  horaAte = "19:00"
) => {
  if (!dataInicio || !dataFim) return dados;

  const dataInicioDayjs = dayjs(dataInicio).startOf("day");
  const dataFimDayjs = dayjs(dataFim).endOf("day");

  // Transforma horaDe/horaAte em minutos para fácil comparação
  const [h1, m1] = horaDe.split(":").map(Number);
  const minDe = h1 * 60 + m1;
  const [h2, m2] = horaAte.split(":").map(Number);
  const minAte = h2 * 60 + m2;

  return dados.filter((p) => {
    const dataPlantao = dayjs(parsePlantaoDate(p.data, p.hora));
    if (!dataPlantao.isValid()) return false;

    // 1. Filtro de Data (inclusivo)
    const dataOK = dataPlantao.isSame(dataInicioDayjs, "day") ||
                   dataPlantao.isSame(dataFimDayjs, "day") ||
                   (dataPlantao.isAfter(dataInicioDayjs, "day") &&
                    dataPlantao.isBefore(dataFimDayjs, "day"));

    if (!dataOK) return false;

    // 2. Filtro de Hora (se a data for a mesma, verifica a hora)
    if (!p.hora) return true; // Se não tem hora, assume que está ok

    const [hp, mp] = p.hora.split(":").map(Number);
    const minPlantao = hp * 60 + mp;

    return minPlantao >= minDe && minPlantao <= minAte;
  });
};

// Agrupa dados para exibição em cards de resumo
export const agruparCards = (dados) => {
  if (!dados || dados.length === 0) return { total: 0, especialidades: [] };

  const total = dados.reduce((acc, p) => acc + (p.quantidade || p.atendimentos || 0), 0);
  const espMap = {};

  dados.forEach((p) => {
    const esp = p.especialidade || "Desconhecido";
    const qtd = p.quantidade || p.atendimentos || 0;
    if (!espMap[esp]) {
      espMap[esp] = {
        nome: esp,
        atendimentos: 0,
        ...getEspecialidadeInfo(esp), // Adiciona cor e ícone, se houver
      };
    }
    espMap[esp].atendimentos += qtd;
  });

  const especialidades = Object.values(espMap).sort((a, b) => b.atendimentos - a.atendimentos);

  return { total, especialidades };
};


// ===============================================
// 🚀 Funções de Geração de Relatório (PDF e Excel)
// ===============================================

/**
 * Gera um PDF do relatório.
 * @param {Array<Object>} linhas - Dados consolidados do relatório, já agrupados.
 * Linhas no formato: [{ chave: '...', items: [{ medico, crm, data, hora, quantidade, ... }] }]
 * @returns {string|null} Nome do arquivo gerado.
 */
export const gerarPDF = (linhas) => {
  if (!linhas.length) return null;
  const doc = new jsPDF("p", "pt", "a4");

  doc.setFontSize(16);
  doc.text("Relatório Consolidado de Plantões", 40, 40);

  linhas.forEach((grupo, indexGrupo) => {
    // Adiciona título do grupo (Médico, Especialidade, ou Data)
    doc.setFontSize(14);
    // Usa um startY diferente para a primeira página vs. páginas subsequentes
    doc.text(`Grupo: ${grupo.chave}`, 40, indexGrupo === 0 ? 70 : 40); 

    const headers = [
      ["Médico", "CRM", "Especialidade", "Data", "Hora", "Quantidade"],
    ];

    const body = (grupo.items || []).map((p) => [
      p.medico,
      p.crm,
      p.especialidade,
      dayjs(p.data).format("DD/MM/YYYY"),
      p.hora,
      p.quantidade,
    ]);

    // Cria a tabela com jspdf-autotable
    doc.autoTable({
      startY: indexGrupo === 0 ? 80 : 50,
      head: headers,
      body: body,
      theme: "striped",
      headStyles: { fillColor: [31, 78, 120], textColor: 255 },
      bodyStyles: { textColor: 0 },
      styles: { fontSize: 10 },
    });

    // Adiciona nova página para o próximo grupo, se não for o último
    if (indexGrupo < linhas.length - 1) doc.addPage();
  });

  const filename = `relatorio_${dayjs().format("DDMMYYYY_HHmm")}.pdf`;
  doc.save(filename);
  return filename;
};

/**
 * Gera um arquivo Excel (xlsx) do relatório.
 * @param {Array<Object>} linhas - Dados consolidados do relatório, já agrupados.
 * @returns {string|null} Nome do arquivo gerado.
 */
export const gerarExcel = (linhas) => {
  if (!linhas.length) return null;
  const wb = XLSX.utils.book_new();

  // Cria uma planilha (sheet) para cada grupo (médico/especialidade/data)
  linhas.forEach((grupo) => {
    const wsData = [
      ["Médico", "CRM", "Especialidade", "Data", "Hora", "Quantidade"], // Cabeçalho
      ...(grupo.items || []).map((p) => [
        p.medico,
        p.crm,
        p.especialidade,
        dayjs(p.data).format("DD/MM/YYYY"),
        p.hora,
        p.quantidade,
      ]),
    ];
    // Converte Array of Array (AOA) para planilha
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    // Adiciona a planilha ao livro de trabalho (workbook), limitando o nome da aba a 31 caracteres
    XLSX.utils.book_append_sheet(wb, ws, `${grupo.chave}`.substring(0, 31));
  });

  const filename = `relatorio_${dayjs().format("YYYYMMDD_HHmm")}.xlsx`;
  XLSX.writeFile(wb, filename); // Salva o arquivo
  return filename;
};