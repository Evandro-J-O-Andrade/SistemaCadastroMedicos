// src/components/Filtros.jsx
import React, { useState, useEffect, useMemo } from "react";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import * as FaIcons from "react-icons/fa";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement,
  Filler,
} from "chart.js";
import "./Filtros.css";
import GraficoBarra from "./GraficoBarra.jsx";
import GraficoArea from "./GraficoArea.jsx";
import GraficoPizza from "./GraficoPizza.jsx";
import GraficoLinha from "./GraficoLinha.jsx";
import { getEspecialidadeInfo, especialidades as especialidadesList } from "../api/especialidades.js";
import { GlobalController, LocalStorageService } from "./GlobalController.jsx";
import { falarMensagem } from "../utils/tts.js";
import {
  fmtDate,
  getPlantaoFromStorage,
  getMedicosFromStorage,
  agruparPorMedicoDiaEsp,
  normalizarEMapearPlantaoData,
} from "../utils/index.js";
import { gerarPDF, gerarExcel } from "../utils/relatorioService.js";
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement,
  Filler
);
dayjs.locale("pt-br");
// ---------- Constantes / Helpers ----------
const DEFAULT_HORA_DE = "07:00";
const DEFAULT_HORA_ATE = "19:00";
const safeParse = (v) => {
  try {
    if (typeof v === "string") return JSON.parse(v);
    return v;
  } catch {
    return v;
  }
};
const normalizeString = (s = "") =>
  String(s || "")
    .toLowerCase()
    .trim()
    .normalize?.("NFD")
    .replace(/[\u0300-\u036f]/g, "");
const parsePlantaoDate = (dataStr, horaStr) => {
  if (!dataStr) return null;
  // Accepts YYYY-MM-DD or DD/MM/YYYY or already ISO
  let dateObj = null;
  if (String(dataStr).includes("-")) {
    dateObj = new Date(`${dataStr}T${horaStr || "00:00"}`);
  } else {
    const parts = String(dataStr).split("/");
    if (parts.length === 3) {
      const [dia, mes, ano] = parts;
      dateObj = new Date(`${ano}-${mes}-${dia}T${horaStr || "00:00"}`);
    } else {
      dateObj = new Date(`${dataStr}T${horaStr || "00:00"}`);
    }
  }
  return isNaN(dateObj) ? null : dateObj;
};
const filtrarPorDataHoraLocal = (dados, inicioDate, fimDate, horaInicioStr, horaFimStr) => {
  const horaInicio = horaInicioStr || DEFAULT_HORA_DE;
  const horaFim = horaFimStr || DEFAULT_HORA_ATE;
  return (dados || []).filter((p) => {
    const pData = p.data || p.dia || p.date;
    const pHora = p.hora || p.horaInicio || p.hora_inicio || "";
    const registro = parsePlantaoDate(pData, pHora);
    if (!registro) return false;
    // data-range check
    if (registro < inicioDate || registro > fimDate) return false;
    // hora full day
    if (horaInicio === "00:00" && horaFim === "23:59") return true;
    // overnight case (e.g., 19:00 -> 07:00)
    const toMinutes = (hhmm) => {
      const [hh, mm] = String(hhmm).split(":").map((v) => Number(v || 0));
      return hh * 60 + (mm || 0);
    };
    const recMinutes = registro.getHours() * 60 + registro.getMinutes();
    const startMin = toMinutes(horaInicio);
    const endMin = toMinutes(horaFim);
    if (startMin <= endMin) {
      return recMinutes >= startMin && recMinutes <= endMin;
    } else {
      // overnight
      return recMinutes >= startMin || recMinutes <= endMin;
    }
  });
};
// Função helper para cor do médico (deriva da primeira especialidade ou padrão)
const getMedicoCor = (medico, especialidades = []) => {
  const primeiraEsp = especialidades[0] || "";
  return getEspecialidadeInfo(primeiraEsp)?.cor || "#1f4e78";
};
// Função helper para ícone do médico (usa ícone da primeira especialidade)
const getMedicoIcon = (medico, especialidades = []) => {
  const primeiraEsp = especialidades[0] || "";
  return getEspecialidadeInfo(primeiraEsp)?.icone || FaIcons.FaUserMd;
};
// Função helper para ícone da especialidade
const getEspecialidadeIcon = (especialidade) => {
  return getEspecialidadeInfo(especialidade)?.icone || FaIcons.FaUserMd;
};
// ---------- MetricCard ----------
const MetricCard = ({ title, value, color = "#1f4e78", icon = "FaChartBar" }) => {
  const Icon = FaIcons[icon] || FaIcons.FaChartBar;
  return (
    <div className="card metric-card">
      <div className="icon" style={{ color }}>
        <Icon size={20} />
      </div>
      <div className="info">
        <p className="title">{title}</p>
        <span className="value">{value}</span>
      </div>
    </div>
  );
};
// ---------- Hook local para carregar dados (sem usar setMensagem externo) ----------
const useDadosPlantaoInternal = () => {
  const [dadosPlantaoAgrupado, setDadosPlantaoAgrupado] = useState([]);
  const [dadosMedicosRaw, setDadosMedicosRaw] = useState([]);
  const [opcoesMedicos, setOpcoesMedicos] = useState([]);
  const [opcoesEspecialidades, setOpcoesEspecialidades] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagemLocal, setMensagemLocal] = useState("");
  const carregarDadosIniciais = async () => {
    setCarregando(true);
    setMensagemLocal("Carregando dados...");
    try {
      let plantoesBrutos = [];
      let medicosBrutos = [];
      try {
        if (GlobalController && typeof GlobalController.getPlantoes === "function") {
          plantoesBrutos = GlobalController.getPlantoes() || [];
        }
      } catch (e) {
        plantoesBrutos = [];
      }
      try {
        if (GlobalController && typeof GlobalController.getMedicos === "function") {
          medicosBrutos = GlobalController.getMedicos() || [];
        }
      } catch (e) {
        medicosBrutos = [];
      }
      // fallback utils
      if (!Array.isArray(plantoesBrutos) || plantoesBrutos.length === 0) {
        const utilPl = getPlantaoFromStorage?.() || [];
        plantoesBrutos = Array.isArray(utilPl) ? utilPl : plantoesBrutos;
        setMensagemLocal("Carregado plantões do storage.");
      }
      if (!Array.isArray(medicosBrutos) || medicosBrutos.length === 0) {
        const utilMed = getMedicosFromStorage?.() || [];
        medicosBrutos = Array.isArray(utilMed) ? utilMed : medicosBrutos;
        setMensagemLocal("Carregado médicos do storage.");
      }
      setDadosMedicosRaw(medicosBrutos || []);
      // normalizar
      const plantoesNormalizados = normalizarEMapearPlantaoData
        ? normalizarEMapearPlantaoData(plantoesBrutos)
        : (Array.isArray(plantoesBrutos) ? plantoesBrutos : []);
      // agrupar por medico/dia/esp
      const plantoesAgrupados = agruparPorMedicoDiaEsp
        ? agruparPorMedicoDiaEsp(plantoesNormalizados, []) // se precisa medicosList, o componente chamará com os índices
        : plantoesNormalizados;
      setDadosPlantaoAgrupado(plantoesAgrupados || []);
      setMensagemLocal(`Dados carregados: ${plantoesAgrupados.length} registros agrupados.`);
      // opcoes medico/especialidade
      const uniqueMedicos = [...new Set((medicosBrutos || []).map((m) => m?.nome).filter(Boolean))];
      setOpcoesMedicos(uniqueMedicos);
      const uniqueEspecialidades = Array.isArray(especialidadesList)
        ? especialidadesList.map((e) => (typeof e === "string" ? e : e?.nome)).filter(Boolean)
        : [];
      setOpcoesEspecialidades(uniqueEspecialidades.sort());
    } catch (err) {
      console.warn("Erro carregando dados iniciais:", err);
      setMensagemLocal("Erro carregando dados.");
    } finally {
      setCarregando(false);
    }
  };
  useEffect(() => {
    carregarDadosIniciais();
    window.addEventListener("dadosAtualizados", carregarDadosIniciais);
    return () => window.removeEventListener("dadosAtualizados", carregarDadosIniciais);
  }, []);
  return {
    dadosPlantaoAgrupado,
    dadosMedicosRaw,
    opcoesMedicos,
    opcoesEspecialidades,
    carregando,
    mensagemLocal,
    recarregar: carregarDadosIniciais,
  };
};
// ---------- Componente Principal ----------
export default function Filtros() {
  // --- UI mensagem (definida primeiro para evitar referência antes da inicialização)
  const [mensagem, setMensagem] = useState("");
  // usa hook interno para buscar dados
  const {
    dadosPlantaoAgrupado,
    dadosMedicosRaw,
    opcoesMedicos,
    opcoesEspecialidades,
    carregando,
    mensagemLocal,
    recarregar,
  } = useDadosPlantaoInternal();
  // --- inputs e estados
  const hoje = dayjs().format("YYYY-MM-DD");
  const [medicoNome, setMedicoNome] = useState("");
  const [medicoCRM, setMedicoCRM] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [dataInicio, setDataInicio] = useState(hoje);
  const [dataFim, setDataFim] = useState(hoje);
  const [horaDe, setHoraDe] = useState(DEFAULT_HORA_DE);
  const [horaAte, setHoraAte] = useState(DEFAULT_HORA_ATE);
  const [turnoPreset, setTurnoPreset] = useState("personalizado");
  const [periodoGranularidade, setPeriodoGranularidade] = useState("dia"); // Novo: dia, mes, ano
  // suggestions / opções
  const [opcoesMedicosObj, setOpcoesMedicosObj] = useState([]); // objetos {nome, crm, especialidade}
  const [sugestoesMedicos, setSugestoesMedicos] = useState([]);
  const [mostrarSugestoesMedicos, setMostrarSugestoesMedicos] = useState(false);
  const [opcoesEspecialidadesState, setOpcoesEspecialidadesState] = useState([]);
  const [mostrarSugestoesEspecialidades, setMostrarSugestoesEspecialidades] = useState(false);
  const [sugestoesEspecialidades, setSugestoesEspecialidades] = useState([]);
  // --- resultados (aparecem após Gerar Filtros)
  const [cardsMedicos, setCardsMedicos] = useState([]); // [{nome, crm, especialidades:[], atendimentosTotal, registros:[] }]
  const [mostrarResultados, setMostrarResultados] = useState(false);
  // modal de detalhes
  const [modalDetalhes, setModalDetalhes] = useState({ aberto: false, medico: null, registros: [] });
  // charts / view
  const [chartType, setChartType] = useState("pizza");
  const [visao, setVisao] = useState("profissional"); // profissional | especialidade
  // --- indices locale
  const [medicosIndexByCRM, setMedicosIndexByCRM] = useState(new Map());
  const [medicosIndexByName, setMedicosIndexByName] = useState(new Map());
  const [plantaoRawOriginal, setPlantaoRawOriginal] = useState([]); // raw normalizados (antes do agrupamento) — usado para detalhes
  // Load medicos raw into opcoes/indices and plantao raw
  useEffect(() => {
    // medicosRaw -> opcoesMedicosObj
    const medSource = Array.isArray(dadosMedicosRaw) ? dadosMedicosRaw : [];
    const medObjs = medSource.map((m) => ({
      nome: m?.nome || m?.name || m?.nomeMedico || "",
      crm: String(m?.crm || m?.CRM || "").trim(),
      especialidade: (m?.especialidade && (m.especialidade.nome || m.especialidade)) || "",
    }));
    const idxCRM = new Map();
    const idxName = new Map();
    medObjs.forEach((m) => {
      if (m.crm) idxCRM.set(m.crm, m);
      if (m.nome) idxName.set(normalizeString(m.nome), m);
    });
    setOpcoesMedicosObj(medObjs);
    setSugestoesMedicos(medObjs);
    setMedicosIndexByCRM(idxCRM);
    setMedicosIndexByName(idxName);
    // especialidades
    const espList = Array.isArray(opcoesEspecialidades) ? opcoesEspecialidades : [];
    setOpcoesEspecialidadesState(espList);
    setSugestoesEspecialidades(espList.map(e => ({ nome: e })));
    // plantao raw original (tentativa de recuperar não-agrupado: normalizarEMapearPlantaoData)
    // Tentaremos manter plantaoRawOriginal como array normalizado (se possível)
    try {
      // Re-obter plantoes raw via GlobalController/getPlantaoFromStorage etc:
      let plSource =
        (GlobalController && typeof GlobalController.getPlantoes === "function" && GlobalController.getPlantoes()) ||
        (LocalStorageService && typeof LocalStorageService.getItem === "function" && safeParse(LocalStorageService.getItem("plantaoData"))) ||
        safeParse(localStorage.getItem("plantaoData")) ||
        [];
      if (!Array.isArray(plSource) || plSource.length === 0) {
        const utilPl = getPlantaoFromStorage?.() || [];
        plSource = Array.isArray(utilPl) ? utilPl : plSource;
      }
      const normalizados = normalizarEMapearPlantaoData ? normalizarEMapearPlantaoData(plSource) : plSource;
      setPlantaoRawOriginal(Array.isArray(normalizados) ? normalizados : []);
    } catch (e) {
      console.warn("Erro carregando plantao raw original:", e);
      setPlantaoRawOriginal([]);
    }
  }, [dadosMedicosRaw, opcoesEspecialidades, dadosPlantaoAgrupado]);
  // suggestions filter for medicoNome
  useEffect(() => {
    if (!medicoNome) {
      setSugestoesMedicos(opcoesMedicosObj);
      return;
    }
    const q = normalizeString(medicoNome);
    setSugestoesMedicos((opcoesMedicosObj || []).filter((m) => normalizeString(m.nome).includes(q)));
  }, [medicoNome, opcoesMedicosObj]);
  // suggestions filter for especialidade
  useEffect(() => {
    if (!especialidade) {
      setSugestoesEspecialidades(opcoesEspecialidadesState.map(e => ({ nome: e })));
      return;
    }
    const q = normalizeString(especialidade);
    setSugestoesEspecialidades((opcoesEspecialidadesState || []).filter((e) => normalizeString(e).includes(q)).map(e => ({ nome: e })));
  }, [especialidade, opcoesEspecialidadesState]);
  // Handle turno preset changes
  useEffect(() => {
    if (turnoPreset === "07-19") {
      setHoraDe("07:00");
      setHoraAte("19:00");
    } else if (turnoPreset === "19-07") {
      setHoraDe("19:00");
      setHoraAte("07:00");
    } else if (turnoPreset === "fechado-23:59") {
      setHoraDe("00:00");
      setHoraAte("23:59");
    } else if (turnoPreset === "personalizado") {
      // keep existing
    }
  }, [turnoPreset]);
  // Handle periodo granularidade (ajusta datas baseadas na seleção)
  useEffect(() => {
    if (periodoGranularidade === "mes") {
      const inicioMes = dayjs().startOf("month").format("YYYY-MM-DD");
      const fimMes = dayjs().endOf("month").format("YYYY-MM-DD");
      setDataInicio(inicioMes);
      setDataFim(fimMes);
    } else if (periodoGranularidade === "ano") {
      const inicioAno = dayjs().startOf("year").format("YYYY-MM-DD");
      const fimAno = dayjs().endOf("year").format("YYYY-MM-DD");
      setDataInicio(inicioAno);
      setDataFim(fimAno);
    } else {
      // dia: mantém hoje
      setDataInicio(hoje);
      setDataFim(hoje);
    }
  }, [periodoGranularidade]);
  // ---------- Main filtering logic (applied when user clicks "Gerar Filtros") ----------
  const aplicarFiltros = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setMostrarResultados(false);
    setCardsMedicos([]);
    setMensagem("");
    // Prepare defaults
    const dInicioStr = dataInicio || hoje;
    const dFimStr = dataFim || hoje;
    const dInicio = dayjs(dInicioStr, ["YYYY-MM-DD", "DD/MM/YYYY"]).startOf("day").toDate();
    const dFim = dayjs(dFimStr, ["YYYY-MM-DD", "DD/MM/YYYY"]).endOf("day").toDate();
    let horaStart = horaDe || DEFAULT_HORA_DE;
    let horaEnd = horaAte || DEFAULT_HORA_ATE;
    // Normalize inputs
    const nomeBusca = normalizeString(medicoNome);
    const crmBusca = String(medicoCRM || "").trim();
    const espBusca = normalizeString(especialidade || "");
    // Build normalized dataset from plantaoRawOriginal (array of individual plantões)
    const registros = (plantaoRawOriginal || []).map((p) => {
      const nomeRegistro = typeof p.medico === "string" ? p.medico : p.medico?.nome || p.nomeMedico || "";
      const crmRegistro = String(p.crm || p.crmMedico || p.medico?.crm || "").trim();
      const espRegistro = p.especialidade || p.especialidade?.nome || p.medico?.especialidade?.nome || "";
      const dataRegistro = p.data || p.dia || p.date || "";
      const horaRegistro = p.hora || p.horaInicio || p.hora_inicio || "";
      const quantidade = Number(p.quantidade || p.qtd || p.atendimentos || 0);
      return {
        ...p,
        medico: nomeRegistro,
        crm: crmRegistro,
        especialidade: espRegistro,
        data: dataRegistro,
        hora: horaRegistro,
        quantidade,
      };
    });
    // Priority logic:
    // crm > nome > especialidade > all
    let filtrados = [];
    if (crmBusca) {
      filtrados = registros.filter((r) => String(r.crm) === crmBusca);
      if (espBusca) filtrados = filtrados.filter((r) => normalizeString(r.especialidade) === espBusca);
    } else if (nomeBusca) {
      filtrados = registros.filter((r) => normalizeString(r.medico) === nomeBusca);
      if (espBusca) filtrados = filtrados.filter((r) => normalizeString(r.especialidade) === espBusca);
    } else if (espBusca) {
      filtrados = registros.filter((r) => normalizeString(r.especialidade) === espBusca);
    } else {
      filtrados = registros;
    }
    // apply date/time filter (local version)
    filtrados = filtrarPorDataHoraLocal(filtrados, dInicio, dFim, horaStart, horaEnd);
    // If nothing found, try relaxed search (to help "usuário burro")
    if (!filtrados || filtrados.length === 0) {
      if (nomeBusca) {
        const fuzzy = registros.filter((r) => normalizeString(r.medico).includes(nomeBusca));
        filtrados = filtrarPorDataHoraLocal(fuzzy, dInicio, dFim, horaStart, horaEnd);
      }
    }
    if (!filtrados || filtrados.length === 0) {
      let msg = "Nenhum dado encontrado para os filtros aplicados.";
      if (nomeBusca && espBusca) msg = "Especialidade sem registro para esse médico.";
      else if (nomeBusca && !espBusca) msg = "Médico sem registros no período selecionado.";
      else if (!nomeBusca && espBusca) msg = "Especialidade sem registros no período selecionado.";
      setMensagem(msg);
      falarMensagem(msg);
      setTimeout(() => setMensagem(""), 5000);
      setMostrarResultados(true);
      return;
    }
    // Build doctor cards: group by crm if present, otherwise by normalized name
    const map = new Map();
    filtrados.forEach((r) => {
      const key = r.crm || normalizeString(r.medico) || Math.random().toString(36).slice(2, 9);
      if (!map.has(key)) {
        map.set(key, {
          key,
          nome: r.medico || "Desconhecido",
          crm: r.crm || "",
          especialidadesSet: new Set(),
          registros: [],
          atendimentosTotal: 0,
        });
      }
      const entry = map.get(key);
      if (r.especialidade) entry.especialidadesSet.add(r.especialidade);
      entry.registros.push(r);
      entry.atendimentosTotal += Number(r.quantidade || r.atendimentos || 0) || 0;
    });
    let cards = Array.from(map.values()).map((c) => ({
      key: c.key,
      nome: c.nome,
      crm: c.crm,
      especialidades: Array.from(c.especialidadesSet),
      registros: c.registros,
      atendimentosTotal: c.atendimentosTotal,
    }));
    // If user requested a specific specialidade, filter doctors to those who had that specialidade in registros
    if (espBusca) {
      cards = cards.filter((c) => c.especialidades.some((e) => normalizeString(e) === espBusca));
    }
    // If user provided medicoNome, filter to that doctor only (in case fuzzy matched multiple)
    if (nomeBusca && !crmBusca) {
      cards = cards.filter((c) => normalizeString(c.nome) === nomeBusca || normalizeString(c.nome).includes(nomeBusca));
    }
    // sort by atendimentos desc
    cards.sort((a, b) => b.atendimentosTotal - a.atendimentosTotal);
    // set results
    setCardsMedicos(cards);
    setMostrarResultados(true);
    const msg = "Foi encontrado os dados pesquisados.";
    setMensagem(msg);
    falarMensagem(msg);
    setTimeout(() => setMensagem(""), 5000);
  };
  // handle limpar
  const handleLimpar = () => {
    setMedicoNome("");
    setMedicoCRM("");
    setEspecialidade("");
    setDataInicio(hoje);
    setDataFim(hoje);
    setHoraDe(DEFAULT_HORA_DE);
    setHoraAte(DEFAULT_HORA_ATE);
    setTurnoPreset("personalizado");
    setPeriodoGranularidade("dia");
    setCardsMedicos([]);
    setMostrarResultados(false);
    setMensagem("Filtros limpos.");
    falarMensagem("Filtros limpos.");
    setTimeout(() => setMensagem(""), 3000);
  };
  // abrir detalhes (modal)
  const abrirDetalhes = (card) => {
    setModalDetalhes({ aberto: true, medico: { nome: card.nome, crm: card.crm, especialidades: card.especialidades }, registros: card.registros });
  };
  const fecharDetalhes = () => setModalDetalhes({ aberto: false, medico: null, registros: [] });
  // export handlers
  const exportPDF = () => {
    // gerar com cardsMedicos (ou tabela detalhada se preferir)
    gerarPDF(cardsMedicos);
    setMensagem("PDF gerado.");
    falarMensagem("PDF gerado.");
  };
  const exportExcel = () => {
    gerarExcel(cardsMedicos);
    setMensagem("Excel gerado.");
    falarMensagem("Excel gerado.");
  };
  // aggregated metrics
  const totalAtendimentos = useMemo(() => cardsMedicos.reduce((s, c) => s + (Number(c.atendimentosTotal) || 0), 0), [cardsMedicos]);
  const totalMedicos = useMemo(() => cardsMedicos.length, [cardsMedicos]);
  // chart data simple (Atendimentos por médico)
  const chartData = useMemo(() => {
    const labels = cardsMedicos.map((c) => c.nome);
    const data = cardsMedicos.map((c) => c.atendimentosTotal);
    return { labels, datasets: [{ label: "Atendimentos", data }] };
  }, [cardsMedicos]);
  // tabela detalhada: achamos melhor usar os registros desagregados dos cards (concat)
  const tabelaDetalhada = useMemo(() => {
    if (!mostrarResultados) return [];
    // juntar todos registros de cards (cada registro já tem data/hora/especialidade)
    const regs = cardsMedicos.flatMap((c) =>
      c.registros.map((r) => ({
        ...r,
        medico: c.nome,
        crm: c.crm,
        especialidade: r.especialidade || c.especialidades?.[0] || "",
        atendimentos: Number(r.quantidade || r.atendimentos || 0),
      }))
    );
    // ordenar por data decrescente
    regs.sort((a, b) => {
      const ad = parsePlantaoDate(a.data, a.hora) || new Date(0);
      const bd = parsePlantaoDate(b.data, b.hora) || new Date(0);
      return bd - ad;
    });
    return regs;
  }, [cardsMedicos, mostrarResultados]);
  // chart data for days / pizza when tabelaDetalhada present
  const dadosPorDia = useMemo(() => {
    const map = {};
    (tabelaDetalhada || []).forEach((r) => {
      let key;
      if (periodoGranularidade === "mes") {
        key = dayjs(r.data, ["YYYY-MM-DD", "DD/MM/YYYY"]).format("YYYY-MM");
      } else if (periodoGranularidade === "ano") {
        key = dayjs(r.data, ["YYYY-MM-DD", "DD/MM/YYYY"]).format("YYYY");
      } else {
        key = dayjs(r.data, ["YYYY-MM-DD", "DD/MM/YYYY"]).isValid() ? dayjs(r.data).format("YYYY-MM-DD") : String(r.data || "");
      }
      map[key] = (map[key] || 0) + (Number(r.atendimentos) || 0);
    });
    const labels = Object.keys(map).sort();
    const data = labels.map((l) => map[l]);
    const labelFormat = periodoGranularidade === "mes" ? "MM/YYYY" : periodoGranularidade === "ano" ? "YYYY" : "DD/MM";
    return { labels: labels.map((l) => dayjs(l).format(labelFormat)), datasets: [{ label: "Atendimentos", data, borderColor: "#1f4e78", backgroundColor: "#1f4e7840", fill: true }] };
  }, [tabelaDetalhada, periodoGranularidade]);
  const dadosPorEspecialidade = useMemo(() => {
    const map = {};
    (tabelaDetalhada || []).forEach((r) => {
      const k = r.especialidade || "Desconhecida";
      map[k] = (map[k] || 0) + (Number(r.atendimentos) || 0);
    });
    const labels = Object.keys(map);
    const data = labels.map((l) => map[l]);
    const colors = labels.map((l) => getEspecialidadeInfo(l)?.cor || "#888");
    return { labels, datasets: [{ data, backgroundColor: colors }] };
  }, [tabelaDetalhada]);
  // render grafico area/pizza/linha/barra
  const renderGrafico = () => {
    if (!mostrarResultados) return <p className="sem-dados">Clique em "Gerar Filtros" para ver resultados.</p>;
    if (chartType === "pizza") return <GraficoPizza data={visao === "profissional" ? chartData : dadosPorEspecialidade} />;
    if (chartType === "barra") return <GraficoBarra data={visao === "profissional" ? chartData : dadosPorEspecialidade} />;
    if (chartType === "linha") return <GraficoLinha data={dadosPorDia} />;
    if (chartType === "area") return <GraficoArea data={dadosPorDia} />;
    return <GraficoPizza data={chartData} />;
  };
  // Quando o usuário clicar em "Ver Detalhes" na tabela (plantão individual), montar modal com todos os plantões do profissional
  const handleDetalhesClickFromTable = (p) => {
    // procuramos todos os registros do mesmo médico (por nome ou crm)
    const chave = p.crm || p.medico;
    const registros = tabelaDetalhada.filter((r) => (p.crm ? r.crm === p.crm : normalizeString(r.medico) === normalizeString(p.medico)));
    setModalDetalhes({ aberto: true, medico: { nome: p.medico, crm: p.crm, especialidade: p.especialidade }, registros });
  };
  // UI render
  if (carregando) {
    return (
      <div className="filtros-container">
        <h1>Relatórios e Filtros</h1>
        <p>{mensagemLocal || "Carregando dados..."}</p>
      </div>
    );
  }
  return (
    <div className="filtros-container">
      <h1>Relatórios de Plantões — Filtros Inteligentes</h1>
      <div className="grid-3" style={{ gap: 12, marginBottom: 12 }}>
        <MetricCard title="Total de Atendimentos" value={totalAtendimentos} color="#1f4e78" icon="FaUserMd" />
        <MetricCard title="Total de Médicos" value={totalMedicos} color="#27AE60" icon="FaUsers" />
        <MetricCard title="Período" value={`${fmtDate(dataInicio)} → ${fmtDate(dataFim)}`} color="#F39C12" icon="FaCalendarAlt" />
      </div>
      {mensagem && <div className="mensagem-global">{mensagem}</div>}
      <div className="card">
        <h3>Filtros</h3>
        <form onSubmit={aplicarFiltros}>
          <div className="filtros-grid">
            {/* Médico + sugestões (só nome no input, CRM setado automaticamente, sugestão mostra só nome) */}
            <div className="input-group autocomplete-group">
              <label>Médico</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  value={medicoNome}
                  onChange={(e) => {
                    setMedicoNome(e.target.value);
                    setMostrarSugestoesMedicos(true);
                  }}
                  onFocus={() => setMostrarSugestoesMedicos(true)}
                  onBlur={() => setTimeout(() => setMostrarSugestoesMedicos(false), 150)}
                  placeholder="Nome do médico (opcional)"
                  className="input-field"
                />
                <button type="button" className="btn-icon" onClick={() => setMostrarSugestoesMedicos((s) => !s)}>
                  <FaIcons.FaSearch />
                </button>
              </div>
              {mostrarSugestoesMedicos && sugestoesMedicos.length > 0 && (
                <div className="autocomplete-list" role="listbox" style={{ left: 0, right: 0, maxWidth: '100%' }}>
                  {sugestoesMedicos.map((s, i) => {
                    const corMedico = getMedicoCor(s, [s.especialidade]);
                    const IconMedico = getMedicoIcon(s, [s.especialidade]);
                    return (
                      <div
                        key={i}
                        className="autocomplete-item"
                        onMouseDown={() => {
                          setMedicoNome(s.nome || "");
                          setMedicoCRM(s.crm || "");
                          setMostrarSugestoesMedicos(false);
                        }}
                        style={{ borderLeft: `3px solid ${corMedico}` }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ color: corMedico, fontSize: "1.2em" }}>{<IconMedico />}</span>
                          <div>{s.nome}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {/* CRM (auto-set from selection) */}
            <div className="input-group">
              <label>CRM</label>
              <input value={medicoCRM} onChange={(e) => setMedicoCRM(e.target.value)} placeholder="CRM (opcional)" className="input-field" />
            </div>
            {/* Especialidade (custom autocomplete com ícones e cores) */}
            <div className="input-group autocomplete-group">
              <label>Especialidade</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  value={especialidade}
                  onChange={(e) => {
                    setEspecialidade(e.target.value);
                    setMostrarSugestoesEspecialidades(true);
                  }}
                  onFocus={() => setMostrarSugestoesEspecialidades(true)}
                  onBlur={() => setTimeout(() => setMostrarSugestoesEspecialidades(false), 150)}
                  placeholder="Especialidade (opcional)"
                  className="input-field"
                />
                <button type="button" className="btn-icon" onClick={() => setMostrarSugestoesEspecialidades((s) => !s)}>
                  <FaIcons.FaSearch />
                </button>
              </div>
              {mostrarSugestoesEspecialidades && sugestoesEspecialidades.length > 0 && (
                <div className="autocomplete-list" role="listbox" style={{ left: 0, right: 0, maxWidth: '100%' }}>
                  {sugestoesEspecialidades.map((s, i) => {
                    const info = getEspecialidadeInfo(s.nome);
                    const corEsp = info?.cor || "#888";
                    const IconEsp = getEspecialidadeIcon(s.nome);
                    return (
                      <div
                        key={i}
                        className="autocomplete-item"
                        onMouseDown={() => {
                          setEspecialidade(s.nome);
                          setMostrarSugestoesEspecialidades(false);
                        }}
                        style={{ borderLeft: `3px solid ${corEsp}` }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ color: corEsp, fontSize: "1.2em" }}>{<IconEsp />}</span>
                          <div>{s.nome}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {/* Novo: Granularidade de Período (Dia/Mês/Ano) */}
            <div className="input-group">
              <label>Período de Pesquisa</label>
              <select
                value={periodoGranularidade}
                onChange={(e) => setPeriodoGranularidade(e.target.value)}
                className="input-select"
              >
                <option value="dia">Por Dia</option>
                <option value="mes">Por Mês</option>
                <option value="ano">Por Ano</option>
              </select>
            </div>
            {/* Turno */}
            <div className="input-group">
              <label>Turno / Preset</label>
              <select
                value={turnoPreset}
                onChange={(e) => setTurnoPreset(e.target.value)}
                className="input-select"
              >
                <option value="personalizado">Personalizado</option>
                <option value="07-19">07:00 - 19:00</option>
                <option value="19-07">19:00 - 07:00</option>
                <option value="fechado-12h">Fechado 12h</option>
                <option value="fechado-23:59">Dia todo</option>
              </select>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <input type="time" value={horaDe} onChange={(e) => setHoraDe(e.target.value)} />
                <input type="time" value={horaAte} onChange={(e) => setHoraAte(e.target.value)} />
              </div>
            </div>
            {/* Data inicio */}
            <div className="input-group">
              <label>Data Início</label>
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="input-field" />
            </div>
            {/* Data fim */}
            <div className="input-group">
              <label>Data Fim</label>
              <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="input-field" />
            </div>
            {/* Tipo de gráfico */}
            <div className="input-group">
              <label>Tipo de Gráfico</label>
              <select value={chartType} onChange={(e) => setChartType(e.target.value)} className="input-select">
                <option value="pizza">Pizza</option>
                <option value="barra">Barra</option>
                <option value="linha">Linha</option>
                <option value="area">Área</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <button type="submit" className="btn-primario"><FaIcons.FaFilter style={{ marginRight: 8 }} /> Gerar Filtros</button>
            <button type="button" className="btn-secundario" style={{ marginLeft: 8 }} onClick={handleLimpar}><FaIcons.FaEraser style={{ marginRight: 8 }} /> Limpar</button>
          </div>
        </form>
      </div>
      {/* resultados (aparecem só após clicar) */}
      {mostrarResultados && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-primario" onClick={exportPDF}><FaIcons.FaFilePdf style={{ marginRight: 8 }} /> Gerar PDF</button>
              <button className="btn-secundario" onClick={exportExcel}><FaIcons.FaFileExcel style={{ marginLeft: 8, marginRight: 8 }} /> Gerar Excel</button>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="radio" name="visao" checked={visao === "profissional"} onChange={() => setVisao("profissional")} /> Profissional
              </label>
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="radio" name="visao" checked={visao === "especialidade"} onChange={() => setVisao("especialidade")} /> Especialidade
              </label>
            </div>
          </div>
          {/* GRID CARDS (com ícone e cor para médico da especialidade) */}
          <div className="grid-cards" style={{ marginTop: 12 }}>
            {cardsMedicos.length === 0 ? (
              <p>Nenhum registro encontrado.</p>
            ) : (
              cardsMedicos.map((c) => {
                const corMedico = getMedicoCor(c, c.especialidades);
                const IconMedico = getMedicoIcon(c, c.especialidades);
                const espPreview = (c.especialidades || []).slice(0, 3);
                return (
                  <div key={c.key} className="card-medico" style={{ borderLeft: `5px solid ${corMedico}` }}>
                    <div className="card-header">
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: corMedico, fontSize: "1.5em" }}>{<IconMedico />}</span>
                        <div>
                          <h4 style={{ margin: 0 }}>{c.nome || "Desconhecido"}</h4>
                          <small>{c.crm ? `CRM: ${c.crm}` : "CRM: —"}</small>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700 }}>{c.atendimentosTotal}</div>
                        <small>Atendimentos</small>
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="chips">
                        {espPreview.map((e, i) => {
                          const info = getEspecialidadeInfo(e);
                          const chipColor = info?.cor || "#666";
                          const IconEsp = getEspecialidadeIcon(e);
                          return (
                            <span key={i} className="chip" style={{ background: chipColor, color: "#fff", display: "flex", alignItems: "center", gap: 4 }}>
                              {<IconEsp />}
                              {e}
                            </span>
                          );
                        })}
                        {c.especialidades.length > 3 && <span className="chip">+{c.especialidades.length - 3}</span>}
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <button className="btn-small" onClick={() => abrirDetalhes(c)}><FaIcons.FaEye style={{ marginRight: 6 }} /> Ver detalhes</button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {/* Tabela detalhada (plantões individuais, com ícones/cores) */}
          <div style={{ marginTop: 18 }}>
            <h3>Relatório Detalhado</h3>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <button className="btn-primario" onClick={() => { gerarPDF(tabelaDetalhada); setMensagem("PDF gerado."); falarMensagem("PDF gerado."); }}>
                <FaIcons.FaFilePdf style={{ marginRight: 8 }} /> Gerar PDF (tabela)
              </button>
              <button className="btn-secundario" onClick={() => { gerarExcel(tabelaDetalhada); setMensagem("Excel gerado."); falarMensagem("Excel gerado."); }}>
                <FaIcons.FaFileExcel style={{ marginRight: 8 }} /> Gerar Excel (tabela)
              </button>
            </div>
            {tabelaDetalhada.length === 0 ? (
              <p className="sem-dados">Nenhum dado encontrado para os filtros aplicados.</p>
            ) : (
              <div className="tabela-wrapper">
                <table className="tabela-estilizada">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Médico</th>
                      <th>CRM</th>
                      <th>Especialidade</th>
                      <th>Hora</th>
                      <th>Atendimentos</th>
                      <th>Detalhes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabelaDetalhada.map((p, idx) => {
                      const corMedicoLinha = getMedicoCor({ nome: p.medico }, [p.especialidade]);
                      const IconMedicoLinha = getMedicoIcon({ nome: p.medico }, [p.especialidade]);
                      const IconEspLinha = getEspecialidadeIcon(p.especialidade);
                      const corEsp = getEspecialidadeInfo(p.especialidade)?.cor || "#999";
                      return (
                        <tr key={idx} style={{ borderLeft: `5px solid ${corEsp}` }}>
                          <td>{fmtDate(p.data)}</td>
                          <td style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ color: corMedicoLinha, fontSize: "1.2em" }}>{<IconMedicoLinha />}</span>
                            {p.medico || "Desconhecido"}
                          </td>
                          <td>{p.crm || "—"}</td>
                          <td style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ color: corEsp, fontSize: "1.2em" }}>{<IconEspLinha />}</span>
                            {p.especialidade || "—"}
                          </td>
                          <td>{p.hora || "—"}</td>
                          <td className="atendimentos-value">{p.atendimentos}</td>
                          <td>
                            <button className="btn-detalhes" onClick={() => handleDetalhesClickFromTable(p)}>Ver Detalhes</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Modal detalhes (com ícones/cores) */}
      {modalDetalhes.aberto && modalDetalhes.medico && (
        <div className="modal-overlay" onClick={fecharDetalhes}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detalhes — {modalDetalhes.medico?.nome}</h3>
              <button className="btn-icon" onClick={fecharDetalhes}><FaIcons.FaTimes /></button>
            </div>
            <div className="modal-body">
              <p><strong>CRM:</strong> {modalDetalhes.medico?.crm || "—"}</p>
              <p><strong>Especialidades no período:</strong> {(modalDetalhes.medico?.especialidades || []).join(", ") || "—"}</p>
              <h4>Plantões</h4>
              {modalDetalhes.registros.length === 0 ? <p>Nenhum plantão encontrado.</p> : (
                <table className="tabela-estilizada">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Hora</th>
                      <th>Especialidade</th>
                      <th>Atendimentos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalDetalhes.registros.map((r, i) => {
                      const IconEspModal = getEspecialidadeIcon(r.especialidade);
                      const corEspModal = getEspecialidadeInfo(r.especialidade)?.cor || "#999";
                      return (
                        <tr key={i} style={{ borderLeft: `3px solid ${corEspModal}` }}>
                          <td>{fmtDate(r.data)}</td>
                          <td>{r.hora || "—"}</td>
                          <td style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ color: corEspModal, fontSize: "1.2em" }}>{<IconEspModal />}</span>
                            {r.especialidade || "—"}
                          </td>
                          <td>{Number(r.quantidade || r.atendimentos || 0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-primario" onClick={() => { gerarPDF(modalDetalhes.registros); falarMensagem("PDF gerado dos plantões."); }}>Exportar PDF (detalhes)</button>
              <button className="btn-secundario" onClick={() => { gerarExcel(modalDetalhes.registros); falarMensagem("Excel gerado dos plantões."); }}>Exportar Excel</button>
            </div>
          </div>
        </div>
      )}
      {/* Footer com Gráfico (movido para o final) */}
      {mostrarResultados && (
        <div style={{ marginTop: 24, paddingTop: 24, borderTop: "1px solid #eee" }}>
          <h4>Visualização Gráfica</h4>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="radio" name="visao" checked={visao === "profissional"} onChange={() => setVisao("profissional")} /> Profissional
              </label>
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="radio" name="visao" checked={visao === "especialidade"} onChange={() => setVisao("especialidade")} /> Especialidade
              </label>
            </div>
          </div>
          {renderGrafico()}
        </div>
      )}
    </div>
  );
}