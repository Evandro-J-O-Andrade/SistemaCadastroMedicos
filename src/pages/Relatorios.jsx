import React, { useState, useEffect, useRef } from "react";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import Chart from "chart.js/auto";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import GraficoBarra from "./GraficoBarra.jsx";
import GraficoPizza from "./GraficoPizza.jsx";
import GraficoLinha from "./GraficoLinha.jsx";
import GraficoArea from "./GraficoArea.jsx";
import { falarMensagem, toggleVoz, getVozStatus } from "../utils/tts.js";
import { getEspecialidadeInfo } from "../api/especialidades.js"; // Novo import para cores e ícones dinâmicos

import "./Relatorios.css";
import "./mobile.css"
dayjs.locale("pt-br");

function CardMedico({ medico, especialidade, dia, dias, totalOverall }) {
  const chartRef = useRef(null);
  const items = dias[0]?.items || [];
  const totalAtendimentos = items.reduce((soma, i) => soma + Number(i.quantidade), 0);

  // Pega todos os CRMs únicos
  const crms = [...new Set(items.map((i) => i.crm || "—"))];
  const crm = crms.join(", ");

  // Pega todas as especialidades únicas (deveria ser uma só por card) - garante string
  const especialidades = [...new Set(items.map((i) => i.especialidade || "—"))];
  const especialidadeDisplay = especialidades.join(", ");

  // String para atendimentos: "5 às 08:00, 3 às 14:00"
  const atendimentosStr = items
    .map((i) => `${i.quantidade} às ${i.hora}`)
    .join(", ");

  useEffect(() => {
    if (chartRef.current) {
      const ctx = chartRef.current.getContext("2d");
      if (ctx._chartInstance) {
        ctx._chartInstance.destroy();
      }

      const labels = items.map((i) => i.hora);
      const data = items.map((i) => Number(i.quantidade));
      // Cor dinâmica por especialidade (garante string no map)
      const backgroundColor = items.map((i) => getEspecialidadeInfo(i.especialidade || "—").cor || "#36A2EB");

      const chartInstance = new Chart(ctx, {
        type: "bar", // Barra para distribuição por horário
        data: {
          labels,
          datasets: [{ label: "Atendimentos por Horário", data, backgroundColor }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true },
          },
          plugins: {
            legend: { display: false },
          },
        },
      });

      ctx._chartInstance = chartInstance;
    }

    return () => {
      if (chartRef.current && chartRef.current._chartInstance) {
        chartRef.current._chartInstance.destroy();
      }
    };
  }, [items]);

  // Ícone dinâmico para especialidade (opcional, adicionado para consistência)
  const espInfo = getEspecialidadeInfo(especialidadeDisplay || "—");
  const Icone = espInfo.icone;

  return (
    <div
      style={{
        border: "1px solid #1f4e78",
        borderRadius: 8,
        padding: 20,
        margin: 10,
        maxWidth: 350,
        backgroundColor: "#F7FBFF",
        color: "#003366",
        fontSize: 13,
        textAlign: "center",
        fontFamily: "Arial, sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <h2 style={{ fontWeight: "700", fontSize: 18, marginBottom: 15 }}>
        {medico} - {especialidade} - {dia}
      </h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-around" }}>
        <div>
          <strong>CRM</strong>
          <div>{crm}</div>
        </div>
        <div style={{ maxWidth: "200px" }}>
          <strong>ATENDIMENTOS</strong>
          <div>{atendimentosStr || "Nenhum"}</div>
        </div>
        <div>
          <strong>ATENDIMENTOS DE OUTROS PROFISSIONAIS</strong>
          <div>{totalOverall - totalAtendimentos}</div>
        </div>
        <div>
          <strong>ESPECIALIDADE</strong>
          <div style={{ color: espInfo.cor || "#003366", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {Icone && typeof Icone === "function" && <Icone size={16} style={{ marginRight: 5 }} />}
            {especialidadeDisplay}
          </div>
        </div>
      </div>
      <div>
        <strong>TOTAL ATENDIMENTOS</strong>
        <div>{totalAtendimentos}</div>
      </div>
      <canvas ref={chartRef} style={{ height: 200, width: "200%" }} />
    </div>
  );
}

export default function Relatorios() {
  const hoje = dayjs().format("YYYY-MM-DD");

  const [plantoes, setPlantoes] = useState([]);
  const [medicosData, setMedicosData] = useState([]);
  const [medicoQuery, setMedicoQuery] = useState("");
  const [crmQuery, setCrmQuery] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [dataDe, setDataDe] = useState(hoje); // Default: data atual
  const [horaDe, setHoraDe] = useState("07:00"); // Default: 07:00
  const [dataAte, setDataAte] = useState(hoje); // Default: data atual
  const [horaAte, setHoraAte] = useState("19:00"); // Default: 19:00
  const [visao, setVisao] = useState("profissional");
  const [tipoGrafico, setTipoGrafico] = useState("pizza");
  const [linhas, setLinhas] = useState([]);
  const [gerado, setGerado] = useState(false);
  const [mostrarListaMedicos, setMostrarListaMedicos] = useState(false);
  const [ordem, setOrdem] = useState("alfabetica");

  const [mensagemGlobal, setMensagemGlobal] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("");

  useEffect(() => {
    if (!mensagemGlobal) return;
    // Usa util central para manter comportamento consistente (pt-BR/Google quando disponível)
    falarMensagem(mensagemGlobal);
  }, [mensagemGlobal]);

  const graficoRefs = useRef({});
  const inputRef = useRef();
  const tabelaRef = useRef(null); // Ref para capturar a tabela no PDF

  // Removido CORES_ESPECIALIDADE - agora usa getEspecialidadeInfo dinamicamente

  const normalizeString = (str) =>
    !str ? "" : str.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  useEffect(() => {
    const dadosMedicos = JSON.parse(localStorage.getItem("medicos") || "[]");
    // Garante que especialidade seja string nos medicos carregados
    const medicosNormalizados = dadosMedicos.map((m) => ({
      ...m,
      especialidade: m.especialidade?.nome || m.especialidade || "—",
    }));
    setMedicosData(Array.isArray(dadosMedicos) ? medicosNormalizados : []);

    const dadosPlantoes = JSON.parse(localStorage.getItem("plantaoData") || "[]");
    setPlantoes(Array.isArray(dadosPlantoes) ? dadosPlantoes : []);

    // Defaults iniciais para filtros
    setDataDe(hoje);
    setDataAte(hoje);
    setHoraDe("07:00");
    setHoraAte("19:00");
    setMedicoQuery("");
    setEspecialidade("");
    setCrmQuery("");
  }, []);

  const parsePlantaoDate = (dataStr, horaStr) => {
    if (!dataStr) return null;
    if (dataStr.includes("-")) return new Date(`${dataStr}T${horaStr || "00:00"}`);
    const [dia, mes, ano] = dataStr.split("/");
    return new Date(`${ano}-${mes}-${dia}T${horaStr || "00:00"}`);
  };

  // Funções simulando "procedures" para cada filtro/input
  const filtrarPorMedico = (dados, nomeBusca, crmBusca) => {
    if (!nomeBusca && !crmBusca) return dados; // Default: todos médicos
    return dados.filter((p) => {
      const okMed = nomeBusca ? normalizeString(p.medico) === normalizeString(nomeBusca) : true;
      const okCrm = crmBusca ? p.crm.includes(crmBusca) : true;
      return okMed && okCrm;
    });
  };

  const filtrarPorEspecialidade = (dados, espBusca) => {
    if (!espBusca) return dados; // Default: todas especialidades
    return dados.filter((p) => normalizeString(p.especialidade) === normalizeString(espBusca));
  };

  const filtrarPorDataHora = (dados, inicio, fim, horaDe, horaAte) => {
    return dados.filter((p) => {
      const registro = parsePlantaoDate(p.data, p.hora);
      if (!registro) return false;

      let okDataHora = registro >= inicio && registro <= fim;

      // Lógica para intervalos predefinidos
      if (horaDe === "00:00" && horaAte === "23:59") {
        // Ignora filtro de hora, traz o dia inteiro
        return okDataHora;
      } else if (horaDe === "19:00" && horaAte === "07:00") {
        const horaRegistro = registro.getHours() * 60 + registro.getMinutes();
        const limInicio = 19 * 60;
        const limFim = 7 * 60;

        const dataRegistro = new Date(registro);
        dataRegistro.setHours(0, 0, 0, 0);

        if (registro >= inicio && horaRegistro >= limInicio) {
          return true;
        } else {
          const inicioDiaSeguinte = new Date(dataRegistro);
          inicioDiaSeguinte.setDate(inicioDiaSeguinte.getDate() + 1);
          inicioDiaSeguinte.setHours(0, 0, 0, 0);
          const fimTurno = new Date(inicioDiaSeguinte);
          fimTurno.setHours(7, 0, 0, 0);
          if (registro >= inicioDiaSeguinte && registro <= fimTurno && horaRegistro <= limFim) {
            return true;
          }
        }
      } else {
        // Filtro diurno ou custom - respeita manual sem crossing
        const horaRegistro = dayjs(registro).format("HH:mm");
        return (horaRegistro >= horaDe && horaRegistro <= horaAte) && okDataHora;
      }
      return false;
    });
  };

  // === filtrarRelatorio: monta linhas com 1 CARD = Médico + Especialidade + Dia ===
  const filtrarRelatorio = () => {
    setMensagemGlobal("");

    const nomeBusca = normalizeString(medicoQuery);
    const crmBusca = crmQuery.trim();
    const espBusca = normalizeString(especialidade);

    // Verifica se o médico existe
    if (nomeBusca) {
      const encontrouMedico = medicosData.some((m) => normalizeString(m.nome) === nomeBusca);
      if (!encontrouMedico) {
        setMensagemGlobal("Médico não encontrado no sistema.");
        setTipoMensagem("erro");
        setLinhas([]);
        setGerado(false);
        return;
      }
    }

    // Normaliza todos os plantões - prioriza p.especialidade, garante string
    const dadosCompletos = plantoes.map((p) => {
      const medico = medicosData.find(
        (m) => m.crm === p.crm || normalizeString(m.nome) === normalizeString(p.nome)
      );
      return {
        medico: p.nome,
        crm: p.crm || medico?.crm || "—",
        especialidade: p.especialidade || (medico?.especialidade || "—"), // Garante string (usa .nome se objeto)
        data: p.data,
        hora: p.hora,
        turno: p.turno || "—",
        quantidade: Number(p.quantidade) || 0,
      };
    });

    // Ajuste para trazer todas as datas se dataDe ou dataAte não informados
    let inicio = dataDe ? parsePlantaoDate(dataDe, horaDe || "07:00") : new Date(0); // Início da época se não informado
    let fim = dataAte ? parsePlantaoDate(dataAte, horaAte || "19:00") : new Date(); // Agora se não informado

    // Lógica principal de "switch" baseado em prioridades: CRM > Nome > Especialidade > Tudo
    let filtrados;
    if (crmBusca) {
      // Prioridade total: Busca por CRM, ignora nome
      filtrados = dadosCompletos.filter((p) => p.crm === crmBusca); // Exact match, assumindo CRM único
      if (espBusca) {
        filtrados = filtrados.filter((p) => normalizeString(p.especialidade) === espBusca);
      }
      // Se não tiver especialidade, traz todas
    } else if (nomeBusca) {
      // Busca por nome (exact, como antes)
      filtrados = dadosCompletos.filter((p) => normalizeString(p.medico) === nomeBusca);
      if (espBusca) {
        filtrados = filtrados.filter((p) => normalizeString(p.especialidade) === espBusca);
      }
    } else if (espBusca) {
      // Só especialidade: Traz todos médicos dessa especialidade
      filtrados = dadosCompletos.filter((p) => normalizeString(p.especialidade) === espBusca);
    } else {
      // Nada informado: Traz todo mundo
      filtrados = dadosCompletos;
    }

    // Agora aplica filtro de data/hora em filtrados
    filtrados = filtrarPorDataHora(filtrados, inicio, fim, horaDe, horaAte);

    if (filtrados.length === 0) {
      let mensagem = "Nenhum dado encontrado com os filtros selecionados!. Preencha-os Corretamente!";
      if (nomeBusca && espBusca) mensagem = "Especialidade sem registro para esse médico.";
      else if (nomeBusca && !espBusca) mensagem = "Médico sem registros.";
      else if (!nomeBusca && espBusca) mensagem = "Especialidade sem registros.";
      setMensagemGlobal(mensagem);
      setTipoMensagem("erro");
      setLinhas([]);
      setGerado(false);
      return;
    } else {
      setMensagemGlobal("");
    }

    // Agrupamento: 1 card por Médico + Especialidade + Dia
    const agrup = filtrados.reduce((acc, p) => {
      const diaFormatado = dayjs(p.data, ["YYYY-MM-DD", "DD/MM/YYYY"]).format("DD/MM/YYYY");
      const key = `${p.medico}||${p.especialidade}||${diaFormatado}`;

      if (!acc[key]) {
        acc[key] = {
          chave: `${p.medico} - ${p.especialidade} - ${diaFormatado}`,
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

    // Transform to array of groups (cada grupo = 1 card)
    const linhasAgrupadas = Object.values(agrup).map((g) => ({
      chave: g.chave,
      medico: g.medico,
      especialidade: g.especialidade,
      dia: g.dia,
      totalDia: g.totalDia,
      items: g.items,
    }));

    setLinhas(linhasAgrupadas);
    setGerado(true);
    setTipoMensagem("sucesso");

    // desenha gráficos (se necessário) - charts individuais ainda usam estrutura antiga (dias array) no gerarChartData,
    // mas já que você comentou que usa páginas de gráfico separadas, mantive a chamada apenas por segurança:
    setTimeout(() => {
      linhasAgrupadas.forEach((grupo) => gerarGrafico({ ...grupo, dias: [{ dia: grupo.dia, totalDia: grupo.totalDia, items: grupo.items }] }));
    }, 100);
  };

  useEffect(() => {
    if (!gerado || !linhas.length) return;

    const getLastTimestamp = (grupo) => {
      const all = (grupo.items || []).map((i) => parsePlantaoDate(i.data, i.hora).getTime());
      if (!all.length) return 0;
      return Math.max(...all);
    };

    let newLinhas = [...linhas];
    if (ordem === "alfabetica") {
      newLinhas.sort((a, b) => a.chave.localeCompare(b.chave));
    } else if (ordem === "ultimo") {
      newLinhas.sort((a, b) => getLastTimestamp(b) - getLastTimestamp(a));
    }
    setLinhas(newLinhas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordem]);

  const limparResultados = () => {
    setLinhas([]);
    setGerado(false);
    graficoRefs.current = {};
    setMensagemGlobal("");
    setTipoMensagem("");
  };

  const limpar = () => {
    setMedicoQuery("");
    setCrmQuery("");
    setEspecialidade("");
    setDataDe(hoje);
    setHoraDe("07:00");
    setDataAte(hoje);
    setHoraAte("19:00");
    setVisao("profissional");
    setTipoGrafico("pizza");
    setOrdem("alfabetica");
    limparResultados();
    setMostrarListaMedicos(false);
  };

  // gerarChartData ajustado para aceitar o novo formato de grupo (dias pode ser undefined se passarmos grupo direto)
  const gerarChartData = (grupo) => {
    // grupo pode ser do tipo: { dias: [...] } (antigo) ou { items: [...] } (novo)
    const items = grupo.dias ? grupo.dias.flatMap((d) => d.items) : grupo.items || [];
    const labels = items.map((i) => `${dayjs(i.data, ["YYYY-MM-DD", "DD/MM/YYYY"]).format("DD/MM/YYYY")} ${i.hora}`);
    const data = items.map((i) => Number(i.quantidade));
    // Cor dinâmica
    const backgroundColor = items.map((i) => getEspecialidadeInfo(i.especialidade || "—").cor || "#36A2EB");
    return { labels, datasets: [{ label: "Quantidade de Atendimentos", data, backgroundColor }] };
  };

  const gerarGrafico = (grupo) => {
    const ctx = graficoRefs.current[grupo.chave];
    if (!ctx) return;

    // destrói chart anterior se existir (evita sobreposição)
    if (ctx._chartInstance && typeof ctx._chartInstance.destroy === "function") {
      try {
        ctx._chartInstance.destroy();
      } catch (e) {
        // ignore
      }
    }

    const cfg = {
      type: tipoGrafico === "pizza" ? "pie" : tipoGrafico,
      data: gerarChartData(grupo),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#003366",
              font: { size: 14, weight: "500" },
            },
          },
        },
        layout: {
          padding: { top: 20, bottom: 20 },
        },
        scales:
          tipoGrafico !== "pizza" && {
            x: { ticks: { color: "#003366" }, grid: { color: "#e0e0e0" } },
            y: { ticks: { color: "#003366" }, grid: { color: "#e0e0e0" } },
          },
      },
      plugins: [
        {
          id: "fundoBranco",
          beforeDraw: (chart) => {
            const ctx2 = chart.ctx;
            ctx2.save();
            ctx2.globalCompositeOperation = "destination-over";
            ctx2.fillStyle = "white"; // fundo branco
            ctx2.fillRect(0, 0, chart.width, chart.height);
            ctx2.restore();
          },
        },
      ],
    };

    const chartInstance = new Chart(ctx, cfg);
    // guarda referência (ajuda a destruir depois)
    ctx._chartInstance = chartInstance;
  };

  const gerarResumoPorEspecialidade = (linhasParam) => {
    const totais = {};
    linhasParam.forEach((grupo) => {
      // cada grupo é um card, com items
      (grupo.items || []).forEach((item) => {
        const espKey = item.especialidade || "—"; // Garante string
        if (!totais[espKey]) totais[espKey] = 0;
        totais[espKey] += Number(item.quantidade);
      });
    });
    return Object.keys(totais).map((esp) => `${esp}: ${totais[esp]} atendimentos`);
  };

  // Consolidado por MEDICO: agrupa across cards por medico (soma totalDia)
  const gerarChartDataConsolidadoPorMedico = (linhasParam) => {
    const totais = {};
    linhasParam.forEach((grupo) => {
      const medico = grupo.medico;
      if (!totais[medico]) totais[medico] = 0;
      const reduceValue = grupo.items ? grupo.items.reduce((s, i) => s + Number(i.quantidade), 0) : 0;
      totais[medico] += Number(grupo.totalDia || reduceValue || 0);
    });
    const labels = Object.keys(totais);
    const data = labels.map((label) => totais[label]);

    // tenta achar a especialidade do médico nos dados para obter cor (garante string)
    const backgroundColor = labels.map((label) => {
      const encontro = medicosData.find((m) => normalizeString(m.nome) === normalizeString(label));
      const esp = encontro?.especialidade || "—"; // Já string normalizado
      return getEspecialidadeInfo(esp).cor || "#36A2EB";
    });

    return { labels, datasets: [{ label: "Quantidade", data, backgroundColor }] };
  };

  // Consolidado por ESPECIALIDADE: agrupa across cards por especialidade
  const gerarChartDataConsolidadoPorEspecialidade = (linhasParam) => {
    const totais = {};
    linhasParam.forEach((grupo) => {
      const espKey = grupo.especialidade || (grupo.items && grupo.items[0]?.especialidade) || "—"; // Garante string
      if (!totais[espKey]) totais[espKey] = 0;
      const reduceValue = grupo.items ? grupo.items.reduce((s, i) => s + Number(i.quantidade), 0) : 0;
      totais[espKey] += Number(grupo.totalDia || reduceValue || 0);
    });
    const labels = Object.keys(totais);
    const data = labels.map((lab) => totais[lab]);
    // Cor dinâmica para todas as especialidades
    const backgroundColor = labels.map((lab) => getEspecialidadeInfo(lab).cor || "#36A2EB");
    return { labels, datasets: [{ label: "Quantidade", data, backgroundColor }] };
  };

  const renderGraficoDinamico = (data) => {
    switch (tipoGrafico) {
      case "barra":
        return <GraficoBarra data={data} />;
      case "linha":
        return <GraficoLinha data={data} />;
      case "area":
        return <GraficoArea data={data} />;
      case "pizza":
      default:
        return <GraficoPizza data={data} />;
    }
  };

  const gerarPDF = () => {
    if (!linhas.length) return alert("Não há dados para gerar o PDF.");
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("DASHBOARD DE PRODUTIVIDADE MÉDICA", 14, 20);

    // linhas agora são cards (medico+esp+dia)
    linhas.forEach((grupo, indexGrupo) => {
      const dadosTabela = (grupo.items || []).map((item) => [
        item.medico,
        item.crm,
        item.especialidade, // Já string
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

    doc.save(`relatorio_${dayjs().format("DDMMYYYY_HHmm")}.pdf`);
  };

  const exportExcel = () => {
    if (!linhas.length) {
      alert("Não há dados para exportar o Excel.");
      return;
    }
    const wb = XLSX.utils.book_new();
    linhas.forEach((grupo) => {
      const wsData = [
        ["Médico", "CRM", "Especialidade", "Data", "Hora", "Quantidade"],
        ...(grupo.items || []).map((p) => [
          p.medico,
          p.crm,
          p.especialidade, // Já string
          dayjs(p.data, ["YYYY-MM-DD", "DD/MM/YYYY"]).format("DD/MM/YYYY"),
          dayjs(p.hora, "HH:mm").format("HH:mm"),
          p.quantidade,
        ]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      // nome de aba permite até 31 chars
      XLSX.utils.book_append_sheet(wb, ws, `${grupo.chave}`.substring(0, 31));
    });
    XLSX.writeFile(wb, `relatorio_${dayjs().format("YYYYMMDD_HHmm")}.xlsx`);
  };

  // totalOverall: soma de todos os atendimentos no relatório (soma across linhas)
  const totalOverall = linhas.reduce((acc, g) => {
    const reduceValue = g.items ? g.items.reduce((s, i) => s + Number(i.quantidade), 0) : 0;
    return acc + Number(g.totalDia || reduceValue || 0);
  }, 0);

  return (
    <div className="relatorios-wrap">
      <div className="relatorios-header">
        <h1>DASHBOARD DE GESTÃO DE PRODUTIVIDADE MÉDICA</h1>
      </div>

      {mensagemGlobal && (
        <div className={`mensagem-global ${tipoMensagem}`}>
          <p>{mensagemGlobal}</p>
        </div>
      )}

      <div className="relatorios-controles card">
        {/* CONTROLES */}
        <div className="grid-3">
          <div className="field">
            <label>Visão</label>
            <select value={visao} onChange={(e) => setVisao(e.target.value)}>
              <option value="profissional">Profissional</option>
              <option value="especialidade">Especialidade</option>
            </select>
          </div>

          <div className="field">
            <label>Tipo de Gráfico</label>
            <select value={tipoGrafico} onChange={(e) => setTipoGrafico(e.target.value)}>
              <option value="barra">Barra</option>
              <option value="linha">Linha</option>
              <option value="pizza">Pizza</option>
              <option value="area">Área</option>
            </select>
          </div>

          <div className="field">
            <label>Intervalo</label>
            <select
              value={`${horaDe}-${horaAte}`}
              onChange={(e) => {
                const [inicio, fim] = e.target.value.split("-");
                setHoraDe(inicio);
                setHoraAte(fim);
              }}
            >
              <option value="07:00-19:00">07:00h-19:00h</option>
              <option value="19:00-07:00">19:00h-07:00h</option>
              <option value="00:00-23:59">00h-23h59 (completo)</option>
            </select>
          </div>
        </div>

        <div className="grid-3">
          <div className="field">
            <label>Especialidade</label>
            <select value={especialidade} onChange={(e) => setEspecialidade(e.target.value)}>
              <option value="">Todas</option>
              {/* Garante string no map */}
              {[...new Set(medicosData.map((m) => m.especialidade))].map((esp) => (
                <option key={esp} value={esp}>
                  {esp}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Médico</label>
            <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
              <input
                ref={inputRef}
                value={medicoQuery}
                onChange={(e) => setMedicoQuery(e.target.value)}
                placeholder="Todos"
                onFocus={() => setMostrarListaMedicos(true)}
                onBlur={() => setTimeout(() => setMostrarListaMedicos(false), 200)}
              />
              <span
                style={{ cursor: "pointer", marginLeft: "5px" }}
                onClick={() => {
                  setMedicoQuery("");
                  setCrmQuery("");
                  setMostrarListaMedicos(true);
                }}
              >
                🔍
              </span>
              {mostrarListaMedicos && (
                <div
                  style={{
                    border: "1px solid #5f5a5aff",
                    maxHeight: "310px",
                    overflowY: "auto",
                    background: "#fcf1f1ff",
                    position: "absolute",
                    top: "30px",
                    width: "350px",
                    zIndex: 10,
                  }}
                >
                  {medicosData
                    .filter((m) => normalizeString(m.nome).includes(normalizeString(medicoQuery)))
                    .map((m) => (
                      <div
                        key={m.id}
                        style={{ padding: "5px", cursor: "pointer" }}
                        onMouseDown={() => {
                          setMedicoQuery(m.nome);
                          setCrmQuery(m.crm || "");
                          setMostrarListaMedicos(false);
                        }}
                      >
                        {m.nome}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div className="field">
            <label>CRM</label>
            <input type="text" value={crmQuery} onChange={(e) => setCrmQuery(e.target.value)} />
          </div>
        </div>

        <div className="grid-3">
          <div className="field">
            <label>Data/Hora Início</label>
            <input type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} />
            <input type="time" value={horaDe} onChange={(e) => setHoraDe(e.target.value)} />
          </div>

          <div className="field">
            <label>Data/Hora Fim</label>
            <input type="date" value={dataAte} onChange={(e) => setDataAte(e.target.value)} />
            <input type="time" value={horaAte} onChange={(e) => setHoraAte(e.target.value)} />
          </div>
        </div>

        <div className="grid-3" style={{ marginTop: "10px" }}>
          <div className="field">
            <label>Ordenar por</label>
            <select value={ordem} onChange={(e) => setOrdem(e.target.value)}>
              <option value="alfabetica">Alfabética</option>
              <option value="ultimo">Último Atendimento</option>
            </select>
          </div>
        </div>

        <div className="botoes-relatorio" style={{ marginTop: "15px", display: "flex", gap: "20px" }}>
          <button style={{ fontSize: "16px", padding: "10px 60px" }} onClick={filtrarRelatorio}>
            Gerar Relatórios
          </button>
          <button style={{ fontSize: "16px", padding: "10px 100px" }} onClick={limpar}>
            Limpar
          </button>
          <button style={{ fontSize: "16px", padding: "10px 115px" }} onClick={gerarPDF}>
            Exportar PDF
          </button>
          <button style={{ fontSize: "16px", padding: "10px 115px" }} onClick={exportExcel}>
            Exportar Excel
          </button>
        </div>
      </div>

      {gerado && visao === "profissional" && (
        <section
          ref={tabelaRef}
          className="relatorios-tabela"
          style={{ display: "flex", flexWrap: "wrap", justifyContent: "center" }}
        >
          {linhas.map((grupo) => (
            <CardMedico
              key={grupo.chave}
              medico={grupo.medico}
              especialidade={grupo.especialidade}
              dia={grupo.dia}
              dias={[{ dia: grupo.dia, totalDia: grupo.totalDia, items: grupo.items }]}
              totalOverall={totalOverall}
            />
          ))}
        </section>
      )}

      {gerado && linhas.length > 0 && (
        <div className="grafico-container">
          <h3 style={{ textAlign: "center", marginBottom: 20 }}>
            Gráfico Consolidado {visao === "profissional" ? "por Médico" : "por Especialidade"}
          </h3>
          {renderGraficoDinamico(
            visao === "profissional"
              ? gerarChartDataConsolidadoPorMedico(linhas)
              : gerarChartDataConsolidadoPorEspecialidade(linhas)
          )}
          {visao === "especialidade" && (
            <div style={{ marginTop: 15, textAlign: "center", fontWeight: "600", color: "#003366" }}>
              {gerarResumoPorEspecialidade(linhas).join(" | ")}
            </div>
          )}
        </div>
        
      )}
      
    </div>
    
  );
}