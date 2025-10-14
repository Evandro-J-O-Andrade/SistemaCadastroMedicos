import React, { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
dayjs.locale("pt-br");

import {
  cleanPlantaoArray,
  buildOpcoesMedicosFromRaw,
  agruparPorMedicoDiaEsp,
  normalize,
  sanitizeData,
  computePeriodo,
  fmtDate as fmt,
} from "../utils/dadosConsolidados.js";

// especialidades vêm da pasta /api (named export)
import { especialidades as especialidadesListRaw, getEspecialidadeInfo } from "../api/especialidades.js";

// componentes de gráfico na pasta pages
import GraficoBarra from "./GraficoBarra";
import GraficoLinha from "./GraficoLinha";
import GraficoPizza from "./GraficoPizza";
import GraficoArea from "./GraficoArea";

import "./mobile.css";
import "./Filtros.css";

// garantia de variáveis seguras
const especialidadesList = Array.isArray(especialidadesListRaw) ? especialidadesListRaw : [];
const safeGetEspecialidadeInfo = typeof getEspecialidadeInfo === "function" ? getEspecialidadeInfo : () => ({ cor: undefined, icone: null });

// Componente Loader simples (fallback pro Suspense - anti-flicker)
const Loader = () => (
  <div style={{ 
    display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', 
    background: '#f0f8ff', fontSize: '18px', color: '#003366' 
  }}>
    <div>🔄 Carregando consolidação diária de atendimentos...</div>
  </div>
);

// ErrorBoundary para evitar tela em branco em caso de erro de renderização
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("ErrorBoundary capturou erro:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20 }}>
          <h3>Ocorreu um erro</h3>
          <p>Algo deu errado ao renderizar a página. Recarregue ou contate o suporte.</p>
          <pre style={{ whiteSpace: "pre-wrap" }}>{String(this.state.error)}</pre>
          <button onClick={() => window.location.reload()}>Recarregar</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Função simples de TTS (tenta voz Google se disponível)
const speak = (text) => {
  try {
    if (!text || typeof window === "undefined" || !window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(String(text));
    const voices = window.speechSynthesis.getVoices() || [];
    const googleVoice = voices.find((v) => /google/i.test(v.name));
    if (googleVoice) utter.voice = googleVoice;
    if (voices.length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        const vs = window.speechSynthesis.getVoices() || [];
        const g = vs.find((v) => /google/i.test(v.name));
        if (g) utter.voice = g;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      };
      window.speechSynthesis.speak(utter);
      return;
    }
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  } catch (e) {
    console.warn("TTS falhou:", e);
  }
};

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay || 300);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debouncedValue;
}

export default function Filtros() {
  const navigate = useNavigate();

  const [periodo, setPeriodo] = useState("dia");
  const [dia, setDia] = useState(dayjs().format("YYYY-MM-DD"));
  const [mes, setMes] = useState(dayjs().format("YYYY-MM"));
  const [ano, setAno] = useState(dayjs().format("YYYY"));

  const [especialidadeQuery, setEspecialidadeQuery] = useState("");
  const [medicoQuery, setMedicoQuery] = useState("");
  const [crmQuery, setCrmQuery] = useState("");

  const debouncedEspecialidade = useDebounce(especialidadeQuery, 300);
  const debouncedMedico = useDebounce(medicoQuery, 300);
  const debouncedCrm = useDebounce(crmQuery, 300);

  const [opcoes, setOpcoes] = useState({ medicos: [], especialidades: [] });
  const [linhas, setLinhas] = useState([]);
  const [loading, setLoading] = useState(true); // Começa true pra Suspense pegar
  const [erro, setErro] = useState("");
  const [mostrarListaMedicos, setMostrarListaMedicos] = useState(false);
  const [mostrarListaEspecialidades, setMostrarListaEspecialidades] = useState(false);
  const [tipoGrafico, setTipoGrafico] = useState("barra");

  const tabelaRef = useRef(null);

  // Anti-flicker CSS: Esconde body até carregar (comum em React SPAs)
  useEffect(() => {
    document.body.style.visibility = 'hidden';
    return () => { document.body.style.visibility = 'visible'; };
  }, []);
  useEffect(() => {
    if (!loading) document.body.style.visibility = 'visible';
    else document.body.style.visibility = 'hidden';
  }, [loading]);

  // Carregamento único e robusto (substitui versões duplicadas)
  useEffect(() => {
    let mounted = true;

    const buildEspecialidadesFromFile = () =>
      Array.isArray(especialidadesList) ? especialidadesList.map((e) => (typeof e === "string" ? { nome: e } : { nome: e?.nome || "" })) : [];

    const carregar = async () => {
      setLoading(true);
      setErro("");
      try {
        const medicosRaw = localStorage.getItem("medicos");
        const plantaoRaw = localStorage.getItem("plantaoData");

        // parse seguro de médicos
        let medicos = [];
        try {
          medicos = medicosRaw ? JSON.parse(medicosRaw) : [];
          if (!Array.isArray(medicos)) medicos = [];
        } catch (e) {
          console.warn("Filtros: erro ao parsear medicos", e);
          medicos = [];
        }

        // construir opções de médicos
        let opcoesMedicos = buildOpcoesMedicosFromRaw(medicos || []);
        opcoesMedicos = Array.isArray(opcoesMedicos) ? opcoesMedicos.map((m) => {
          try {
            let nome = (m?.nome || "").toString().trim();
            let crm = (m?.crm || "").toString().trim().toUpperCase();
            if (!crm && /[-–—\/|]\s*[A-Za-z0-9]+$/u.test(nome)) {
              const parts = nome.split(/[-–—\/|]/).map((s) => s.trim());
              if (parts.length > 1) {
                const possibleCrm = parts.pop();
                if (/[A-Za-z0-9]/.test(possibleCrm)) {
                  crm = possibleCrm.toUpperCase();
                  nome = parts.join(" ").trim();
                }
              }
            }
            return { ...m, nome, crm };
          } catch {
            return m;
          }
        }) : [];

        // especialidades: prioriza arquivo /api
        const espFromFile = buildEspecialidadesFromFile();
        let especialidades = espFromFile.length > 0 ? espFromFile : (() => {
          const setEsp = new Set();
          (opcoesMedicos || []).forEach((m) => { if (m && m.especialidade) setEsp.add(String(m.especialidade).trim()); });
          return Array.from(setEsp).map((nome) => ({ nome }));
        })();

        if (!mounted) return;
        setOpcoes({ medicos: opcoesMedicos, especialidades });

        // parse plantão
        let plantaoArr = [];
        try {
          plantaoArr = plantaoRaw ? JSON.parse(plantaoRaw) : [];
          if (!Array.isArray(plantaoArr)) plantaoArr = [];
        } catch (e) {
          console.warn("Filtros: erro ao parsear plantaoData", e);
          plantaoArr = [];
        }

        if (!plantaoArr || plantaoArr.length === 0) {
          setLinhas([]);
          setErro("Sem atendimentos consolidados hoje – cadastre em Plantão.");
          if (mounted) setLoading(false);
          return;
        }

        // limpeza principal
        const cleaned = cleanPlantaoArray(plantaoArr, { logInvalid: false });

        let dadosLimpos = cleaned.length ? cleaned : [];
        if (dadosLimpos.length === 0) {
          // tentativa permissiva de normalização
          plantaoArr.forEach((p) => {
            try {
              const data = sanitizeData(p?.data);
              const horaStr = p?.hora && typeof p.hora === "string" ? p.hora.trim() : "";
              let quantidade = Number((p?.quantidade || p?.qtd || 0).toString().replace(/[^0-9.-]/g, ""));
              if (isNaN(quantidade)) quantidade = 0;
              const nome = (p?.nome || p?.medico || "").toString().trim();
              const crm = (p?.crm || "").toString().trim().toUpperCase();
              const espRaw = p?.especialidade;
              const especialidade = (typeof espRaw === "object" && espRaw?.nome) ? espRaw.nome : espRaw || "";
              if (!data || !nome || !especialidade || quantidade <= 0) return;
              const periodoItem = computePeriodo(horaStr);
              dadosLimpos.push({ ...p, data, hora: horaStr, quantidade, nome, crm, especialidade: especialidade.toString().trim(), periodo: periodoItem });
            } catch { /* skip item */ }
          });
        }

        if (dadosLimpos.length === 0) {
          setLinhas([]);
          setErro("⚠️ Dados inválidos no Plantão. Cadastre atendimentos válidos para consolidação diária.");
          if (mounted) setLoading(false);
          return;
        }

        const agrupado = agruparPorMedicoDiaEsp(dadosLimpos, opcoesMedicos);
        if (!mounted) return;
        setLinhas(agrupado);
      } catch (err) {
        console.error("Erro ao carregar dados em Filtros:", err);
        if (mounted) {
          setLinhas([]);
          setOpcoes({ medicos: [], especialidades: buildEspecialidadesFromFile() });
          setErro("Erro ao carregar dados. Verifique console.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    carregar();

    function onStorageListener(event) {
      if (event.key === "medicos" || event.key === "plantaoData") {
        setTimeout(() => carregar(), 150);
      }
    }
    window.addEventListener("storage", onStorageListener);
    return () => {
      window.removeEventListener("storage", onStorageListener);
    };
  }, []);

  // fala erro quando mudar
  useEffect(() => {
    if (erro) speak(erro);
  }, [erro]);

  // --- Totais ---
  const totais = useMemo(() => {
    if (!linhas || !Array.isArray(linhas) || linhas.length === 0)
      return { totalPeriodo: 0, mediaDia: 0, mediaMes: 0, mediaEspecialidade: {} };
    const totalPeriodo = linhas.reduce((s, l) => s + (Number(l.atendimentos) || 0), 0);
    const datasUnicas = [...new Set(linhas.map((l) => l.data))];
    const diasUnicos = datasUnicas.length || 1;
    const mediaDia = Math.round(totalPeriodo / diasUnicos);
    const mediaMes = Math.round(mediaDia * 30);

    const mediaEsp = {};
    linhas.forEach((l) => {
      const espNorm = normalize(l.especialidade || "");
      mediaEsp[espNorm] = (mediaEsp[espNorm] || 0) + (Number(l.atendimentos) || 0);
    });
    Object.keys(mediaEsp).forEach((k) => {
      mediaEsp[k] = Math.round(mediaEsp[k] / diasUnicos);
    });

    return { totalPeriodo, mediaDia, mediaMes, mediaEspecialidade: mediaEsp };
  }, [linhas]);

  const montarChartData = (key) => {
    if (!linhas || !Array.isArray(linhas) || linhas.length === 0) return null;
    const map = {};
    linhas.forEach((l) => {
      const valor = key === "dia" ? l.data : normalize(l[key] || "");
      if (!valor) return;
      map[valor] = (map[valor] || 0) + (Number(l.atendimentos) || 0);
    });
    return {
      labels: Object.keys(map).map((k) => (key === "dia" ? fmt(k) : k.toUpperCase())),
      data: Object.values(map),
    };
  };

  const chartDataPorEspecialidade = montarChartData("especialidade");
  const chartDataPorMedico = montarChartData("medico");
  const chartDataPorPeriodo = montarChartData("periodo");
  const chartDataPorDia = montarChartData("dia");

  // Filtros dropdown filtrados com debounce
  const medicosFiltrados = useMemo(() => {
    const q = (debouncedMedico || "").toString().toLowerCase().trim();
    const qCrm = (debouncedCrm || "").toString().toLowerCase().trim();
    if (!opcoes.medicos || opcoes.medicos.length === 0) return [];
    return opcoes.medicos.filter((m) => {
      const nome = (m.nome || "").toString().toLowerCase();
      const crm = (m.crm || "").toString().toLowerCase();
      return (!q || nome.includes(q)) && (!qCrm || crm.includes(qCrm));
    });
  }, [opcoes.medicos, debouncedMedico, debouncedCrm]);

  const especialidadesFiltradas = useMemo(() => {
    const q = (debouncedEspecialidade || "").toString().toLowerCase().trim();
    if (!opcoes.especialidades || opcoes.especialidades.length === 0) return [];
    return opcoes.especialidades.filter((e) => {
      const nome = (e.nome || "").toString().toLowerCase();
      return !q || nome.includes(q);
    });
  }, [opcoes.especialidades, debouncedEspecialidade]);

  // Aplica filtros atuais (usa linhas já agrupadas) com validação
  const aplicar = () => {
    try {
      if (periodo === "dia" && !dia) { setErro("Por favor selecione uma data (dia)."); return; }
      if (periodo === "mes" && !mes) { setErro("Por favor selecione um mês."); return; }
      if (periodo === "ano" && (!ano || String(ano).length !== 4)) { setErro("Por favor selecione um ano válido."); return; }

      setErro("");
      let filtrado = [...linhas];
      if (especialidadeQuery && especialidadeQuery !== "todas") {
        const q = normalize(especialidadeQuery);
        filtrado = filtrado.filter((l) => normalize(l.especialidade || "").includes(q));
      }
      if (medicoQuery && medicoQuery !== "todos") {
        const q = normalize(medicoQuery);
        filtrado = filtrado.filter((l) => normalize(l.medico || "").includes(q));
      }
      if (crmQuery) {
        const q = crmQuery.toString().toUpperCase();
        filtrado = filtrado.filter((l) => (l.crm || "").toString().toUpperCase().includes(q));
      }
      if (periodo === "dia" && dia) filtrado = filtrado.filter((l) => l.data === dia);
      else if (periodo === "mes" && mes) filtrado = filtrado.filter((l) => (l.data || "").startsWith(mes));
      else if (periodo === "ano" && ano) filtrado = filtrado.filter((l) => (l.data || "").startsWith(ano));
      setLinhas(filtrado);
    } catch (e) {
      console.error("Erro aplicar filtros:", e);
      setErro("Erro ao aplicar filtros.");
    }
  };

  const limpar = () => {
    setEspecialidadeQuery("");
    setMedicoQuery("");
    setCrmQuery("");
    const medicosRaw = localStorage.getItem("medicos");
    const plantaoRaw = localStorage.getItem("plantaoData");
    let medicos = [];
    try { medicos = medicosRaw ? JSON.parse(medicosRaw) : []; } catch (e) { medicos = []; }
    let plantaoArr = [];
    try { plantaoArr = plantaoRaw ? JSON.parse(plantaoRaw) : []; } catch (e) { plantaoArr = []; }
    const cleaned = cleanPlantaoArray(plantaoArr, { logInvalid: false });
    const grouped = agruparPorMedicoDiaEsp(cleaned, buildOpcoesMedicosFromRaw(medicos));
    setLinhas(grouped);
  };

  const exportarPDF = () => {
    if (!linhas || linhas.length === 0) return alert("Sem dados para exportar.");
    try {
      const doc = new window.jsPDF();
      doc.text("Relatório de Atendimentos Consolidados", 10, 10);
      const body = linhas.map((l) => [fmt(l.data), l.periodo, l.especialidade, l.medico, l.crm, l.atendimentos]);
      if (doc.autoTable) doc.autoTable({ head: [["Data", "Período", "Especialidade", "Médico", "CRM", "Atendimentos"]], body, startY: 20 });
      doc.save(`relatorio_consolidado_${dayjs().format("YYYYMMDD_HHmm")}.pdf`);
    } catch (e) {
      console.error("Erro exportar PDF:", e);
      alert("Erro ao exportar PDF.");
    }
  };

  const exportarExcel = () => {
    if (!linhas || linhas.length === 0) return alert("Sem dados para exportar.");
    try {
      if (!window.XLSX) return alert("Biblioteca XLSX não encontrada.");
      const ws = window.XLSX.utils.json_to_sheet(linhas);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Consolidado");
      window.XLSX.writeFile(wb, `relatorio_consolidado_${dayjs().format("YYYYMMDD_HHmm")}.xlsx`);
    } catch (e) {
      console.error("Erro exportar Excel:", e);
      alert("Erro ao exportar Excel.");
    }
  };

  const integrarComRelatorios = () => {
    navigate("/relatorios", { state: { filtros: { periodo, dia, mes, ano, especialidadeQuery, medicoQuery, crmQuery } } });
  };

  const handleSelecionarMedico = (medico) => {
    setMedicoQuery(medico.nome || "");
    setMostrarListaMedicos(false);
  };
  const handleSelecionarEspecialidade = (e) => {
    setEspecialidadeQuery(e.nome || "");
    setMostrarListaEspecialidades(false);
  };

  const normalizeChartData = (chartData) => {
    try {
      if (!chartData) return null;
      if (chartData.labels && chartData.data) return chartData;
      if (Array.isArray(chartData)) {
        return { labels: chartData.map(i => i.label || ""), data: chartData.map(i => Number(i.data || 0)), backgroundColor: chartData.map(i => i.cor || "#3b82f6") };
      }
      if (typeof chartData === "object") {
        const keys = Object.keys(chartData);
        return { labels: keys, data: keys.map(k => Number(chartData[k] || 0)) };
      }
      return null;
    } catch (e) {
      console.error("normalizeChartData falhou:", e);
      return null;
    }
  };

  const renderGraficoDinamico = (chartData, titulo) => {
    try {
      const data = normalizeChartData(chartData);
      if (!data || !Array.isArray(data.labels) || !Array.isArray(data.data)) return null;
      const ComponentMap = {
        barra: GraficoBarra || window.GraficoBarra,
        linha: GraficoLinha || window.GraficoLinha,
        pizza: GraficoPizza || window.GraficoPizza,
        area: GraficoArea || window.GraficoArea,
      };
      const Component = ComponentMap[tipoGrafico] || GraficoBarra || window.GraficoBarra;
      if (!Component) return null;
      return (
        <div className="grafico-wrapper" key={titulo}>
          <h4>{titulo}</h4>
          <Component data={data} />
        </div>
      );
    } catch (e) {
      console.error("Erro renderGraficoDinamico:", e);
      return null;
    }
  };

  // Render global com Suspense - anti-flicker full
  if (loading) return <Loader />;

  return (
    <ErrorBoundary>
      <Suspense fallback={<Loader />}>
        <div className="filtros-container">
          <h2>Consolidação Diária de Atendimentos - Intranet da Empresa</h2>

          {/* Erro global */}
          {erro && <div className="erro" style={{ marginBottom: 10 }}>{erro}</div>}

          <div className="filtros-controles card">
            <div className="grid-3">
              <div className="field">
                <label>Período</label>
                <select value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
                  <option value="dia">Dia</option>
                  <option value="mes">Mês</option>
                  <option value="ano">Ano</option>
                </select>
              </div>

              {periodo === "dia" && (
                <div className="field">
                  <label>Data</label>
                  <input type="date" value={dia} onChange={(e) => setDia(e.target.value)} />
                </div>
              )}

              {periodo === "mes" && (
                <div className="field">
                  <label>Mês</label>
                  <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
                </div>
              )}

              {periodo === "ano" && (
                <div className="field">
                  <label>Ano</label>
                  <input type="number" min="2000" max="2100" value={ano} onChange={(e) => setAno(e.target.value)} style={{ width: 100 }} />
                </div>
              )}

              <div className="field">
                <label>Tipo de Gráfico</label>
                <select value={tipoGrafico} onChange={(e) => setTipoGrafico(e.target.value)}>
                  <option value="barra">Barra</option>
                  <option value="linha">Linha</option>
                  <option value="pizza">Pizza</option>
                  <option value="area">Área</option>
                </select>
              </div>
            </div>

            <div className="grid-3">
              <div className="field" style={{ position: "relative" }}>
                <label>Especialidade</label>
                <input
                  type="text"
                  placeholder="Todas"
                  value={especialidadeQuery}
                  onChange={(e) => setEspecialidadeQuery(e.target.value)}
                  onFocus={() => setMostrarListaEspecialidades(true)}
                  onBlur={() => setTimeout(() => setMostrarListaEspecialidades(false), 150)}
                />
                {mostrarListaEspecialidades && (
                  <div
                    className="lista-dropdown"
                    style={{
                      position: "absolute",
                      top: "100%",
                      zIndex: 10,
                      background: "#fff",
                      border: "1px solid #ccc",
                      maxHeight: 200,
                      overflowY: "auto",
                    }}
                  >
                    <div onMouseDown={() => { setEspecialidadeQuery("todas"); setMostrarListaEspecialidades(false); }} style={{ padding: 6, cursor: "pointer" }}>
                      Todas
                    </div>
                    {(especialidadesFiltradas || []).map((e, idx) => {
                      const info = safeGetEspecialidadeInfo ? safeGetEspecialidadeInfo(e?.nome) : {};
                      const Icone = info?.icone;
                      return (
                        <div key={idx} onMouseDown={() => handleSelecionarEspecialidade(e)} style={{ padding: 6, cursor: "pointer", display: "flex", alignItems: "center" }}>
                          {Icone && typeof Icone === "function" && <Icone size={16} style={{ marginRight: 5 }} />}
                          {(e?.nome || "").toUpperCase()}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="field" style={{ position: "relative" }}>
                <label>Médico</label>
                <input
                  type="text"
                  placeholder="Todos"
                  value={medicoQuery}
                  onChange={(e) => setMedicoQuery(e.target.value)}
                  onFocus={() => setMostrarListaMedicos(true)}
                  onBlur={() => setTimeout(() => setMostrarListaMedicos(false), 150)}
                />
                {mostrarListaMedicos && (
                  <div
                    className="lista-dropdown"
                    style={{
                      position: "absolute",
                      top: "100%",
                      zIndex: 10,
                      background: "#fff",
                      border: "1px solid #ccc",
                      maxHeight: 200,
                      overflowY: "auto",
                    }}
                  >
                    <div onMouseDown={() => { setMedicoQuery("todos"); setMostrarListaMedicos(false); }} style={{ padding: 6, cursor: "pointer" }}>
                      Todos
                    </div>
                    {(medicosFiltrados || []).map((m) => (
                      <div key={m?.id || m?.nome} onMouseDown={() => handleSelecionarMedico(m)} style={{ padding: 6, cursor: "pointer" }}>
                        {(m?.nome || "").toUpperCase()} - {(m?.crm || "").toUpperCase()}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="field">
                <label>CRM</label>
                <input type="text" value={crmQuery} onChange={(e) => setCrmQuery(e.target.value.toUpperCase())} placeholder="Filtrar por CRM" />
              </div>
            </div>

            <div className="botoes-filtros" style={{ display: "flex", gap: 10, marginTop: 15 }}>
              <button onClick={aplicar} disabled={loading}>
                {loading ? "Carregando..." : "Aplicar Filtros"}
              </button>
              <button onClick={limpar}>Limpar</button>
              <button onClick={exportarPDF}>Exportar PDF</button>
              <button onClick={exportarExcel}>Exportar Excel</button>
              <button onClick={integrarComRelatorios}>Ver em Relatórios</button>
            </div>

            {erro && (
              <p className="erro-mensagem" style={{ color: "#b91c1c", marginTop: 8 }}>
                {erro}
              </p>
            )}
          </div>

          {(linhas && linhas.length > 0) ? (
            <div className="card resumo-totais">
              <h3>📐 Totais & Médias</h3>
              <p>
                <strong>Total de Atendimentos:</strong> {totais.totalPeriodo}
              </p>
              <p>
                <strong>Média Diária:</strong> {totais.mediaDia}
              </p>
              <p>
                <strong>Média Mensal (aprox.):</strong> {totais.mediaMes}
              </p>
              <ul className="lista-media-esp">
                {Object.entries(totais.mediaEspecialidade || {}).map(([esp, valor]) => (
                  <li key={esp}>
                    {esp.toUpperCase()}: {valor}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div ref={tabelaRef} className="card tabela-consolidado">
            <h3>Consolidado de Atendimentos</h3>
            <div className="tabela-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Período</th>
                    <th>Especialidade</th>
                    <th>Médico</th>
                    <th>CRM</th>
                    <th>Atendimentos</th>
                  </tr>
                </thead>
                <tbody>
                  {(!linhas || linhas.length === 0) ? (
                    <tr>
                      <td colSpan="6" className="sem-dados">
                        Sem dados para exibir
                      </td>
                    </tr>
                  ) : (
                    (linhas || []).map((l, i) => (
                      <tr key={i}>
                        <td>{fmt(l.data) || "—"}</td>
                        <td>{l.periodo || "—"}</td>
                        <td style={{ color: safeGetEspecialidadeInfo((l.especialidade || "").toLowerCase())?.cor }}>
                          {l.especialidade || "—"}
                        </td>
                        <td>{l.medico || "—"}</td>
                        <td>{l.crm || "—"}</td>
                        <td>{l.atendimentos || 0}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {(linhas && linhas.length > 0) && (
            <div className="graficos-container">
              <h3>Gráficos Consolidados</h3>
              <div className="grid-graficos">
                {renderGraficoDinamico(chartDataPorEspecialidade, "Por Especialidade")}
                {renderGraficoDinamico(chartDataPorMedico, "Por Médico")}
                {renderGraficoDinamico(chartDataPorPeriodo, "Por Período")}
                {renderGraficoDinamico(chartDataPorDia, "Por Dia")}
              </div>
            </div>
          )}
        </div>
      </Suspense>
    </ErrorBoundary>
  );
}