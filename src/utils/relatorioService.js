// src/utlis/relatorioService.js
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { getEspecialidadeInfo } from "../api/especialidades.js";

dayjs.locale("pt-br");

// Normaliza string (remove acentos, caixa alta, etc)
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
    const okCrm = crmBusca ? p.crm.includes(crmBusca) : true;
    return okMed && okCrm;
  });
};

// Filtra por especialidade
export const filtrarPorEspecialidade = (dados, espBusca) => {
  if (!espBusca) return dados;
  return dados.filter((p) => normalizeString(p.especialidade) === normalizeString(espBusca));
};

// Filtra por intervalo de data e hora
export const filtrarPorDataHora = (dados, inicio, fim, horaDe = "07:00", horaAte = "19:00") => {
  return dados.filter((p) => {
    const registro = parsePlantaoDate(p.data, p.hora);
    if (!registro) return false;

    let okDataHora = registro >= inicio && registro <= fim;

    if (horaDe === "00:00" && horaAte === "23:59") return okDataHora;
    if (horaDe === "19:00" && horaAte === "07:00") {
      const horaRegistro = registro.getHours() * 60 + registro.getMinutes();
      const limInicio = 19 * 60;
      const limFim = 7 * 60;
      const dataRegistro = new Date(registro);
      dataRegistro.setHours(0, 0, 0, 0);

      if (registro >= inicio && horaRegistro >= limInicio) return true;

      const inicioDiaSeguinte = new Date(dataRegistro);
      inicioDiaSeguinte.setDate(inicioDiaSeguinte.getDate() + 1);
      inicioDiaSeguinte.setHours(0, 0, 0, 0);
      const fimTurno = new Date(inicioDiaSeguinte);
      fimTurno.setHours(7, 0, 0, 0);
      if (registro >= inicioDiaSeguinte && registro <= fimTurno && horaRegistro <= limFim) return true;

      return false;
    }

    const horaRegistro = dayjs(registro).format("HH:mm");
    return horaRegistro >= horaDe && horaRegistro <= horaAte && okDataHora;
  });
};

// Agrupa dados para gerar cards (médico + especialidade + dia)
export const agruparCards = (dados) => {
  const agrup = dados.reduce((acc, p) => {
    const diaFormatado = dayjs(p.data, ["YYYY-MM-DD", "DD/MM/YYYY"]).format("DD/MM/YYYY");
    const key = `${p.medico}||${p.especialidade}||${diaFormatado}`;

    if (!acc[key]) {
      acc[key] = {
        chave: key,
        medico: p.medico,
        especialidade: p.especialidade,
        dia: diaFormatado,
        totalDia: 0,
        items: [],
      };
    }

    acc[key].totalDia += Number(p.quantidade);
    acc[key].items.push(p);
    return acc;
  }, {});

  return Object.values(agrup);
};

// Gera PDF do relatório
export const gerarPDF = (linhas) => {
  if (!linhas.length) return null;
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("DASHBOARD DE PRODUTIVIDADE MÉDICA", 14, 20);

  linhas.forEach((grupo, indexGrupo) => {
    const dadosTabela = (grupo.items || []).map((item) => [
      item.medico,
      item.crm,
      item.especialidade,
      dayjs(item.data).format("DD/MM/YYYY"),
      item.hora,
      item.quantidade,
    ]);

    doc.autoTable({
      startY: doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 30,
      head: [["Médico", "CRM", "Especialidade", "Data", "Hora", "Quantidade"]],
      body: dadosTabela,
      theme: "grid",
      headStyles: { fillColor: [31, 78, 120], textColor: 255 },
      bodyStyles: { textColor: 0 },
      styles: { fontSize: 10 },
    });

    if (indexGrupo < linhas.length - 1) doc.addPage();
  });

  const filename = `relatorio_${dayjs().format("DDMMYYYY_HHmm")}.pdf`;
  doc.save(filename);
  return filename;
};

// Gera Excel do relatório
export const gerarExcel = (linhas) => {
  if (!linhas.length) return null;
  const wb = XLSX.utils.book_new();

  linhas.forEach((grupo) => {
    const wsData = [
      ["Médico", "CRM", "Especialidade", "Data", "Hora", "Quantidade"],
      ...(grupo.items || []).map((p) => [
        p.medico,
        p.crm,
        p.especialidade,
        dayjs(p.data).format("DD/MM/YYYY"),
        p.hora,
        p.quantidade,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, `${grupo.chave}`.substring(0, 31));
  });

  const filename = `relatorio_${dayjs().format("YYYYMMDD_HHmm")}.xlsx`;
  XLSX.writeFile(wb, filename);
  return filename;
};

// Gera resumo por especialidade
export const gerarResumoPorEspecialidade = (linhas) => {
  const totais = {};
  linhas.forEach((grupo) => {
    (grupo.items || []).forEach((item) => {
      const espKey = item.especialidade || "—";
      if (!totais[espKey]) totais[espKey] = 0;
      totais[espKey] += Number(item.quantidade);
    });
  });
  return Object.keys(totais).map((esp) => `${esp}: ${totais[esp]} atendimentos`);
};
