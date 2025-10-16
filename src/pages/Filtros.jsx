// Imports principais
import React, { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";

// Utils de storage
import { getMedicosFromStorage, getPlantaoFromStorage } from "../utils/storagePlantao";

// Utils de dados consolidados (fallback)
import {
  agruparPorMedicoDiaEsp,
  normalize,
  fmtDate as fmt,
} from "../utils/dadosConsolidados.js";

import { especialidades as especialidadesListRaw, getEspecialidadeInfo } from "../api/especialidades.js";

// TTS
import { falarMensagem, toggleVoz, getVozStatus } from "../utils/tts.js";

// Gráficos
import GraficoBarra from "./GraficoBarra";
import GraficoLinha from "./GraficoLinha";
import GraficoPizza from "./GraficoPizza"; 
import GraficoArea from "./GraficoArea";

// Estilos
import "./mobile.css";
import "./Filtros.css";

dayjs.locale("pt-br");

// Helpers
const safeArray = (v) => Array.isArray(v) ? v : [];
const safeString = (v) => v === null || v === undefined ? "" : String(v);

// ===== Suas funções integradas =====
const normalizarPlantao = (plantaoRaw = []) => {
  return safeArray(plantaoRaw).map((l) => {
    const data = l.data ? dayjs(l.data).format("YYYY-MM-DD") : null;
    const periodo = l.periodo || "—";
    const especialidade = normalize(safeString(l.especialidade)).toLowerCase();
    const medico = normalize(safeString(l.medico)).toLowerCase();
    let crm = safeString(l.crm).toUpperCase().trim();

    // Tenta extrair CRM do nome, se não existir
    if (!crm && medico) {
      const parts = medico.split(/[-–—\/|]/).map(s => s.trim());
      if (parts.length > 1) {
        const possibleCrm = parts.pop();
        if (/[A-Za-z0-9]/.test(possibleCrm)) crm = possibleCrm.toUpperCase();
      }
    }

    const atendimentos = Number(l.atendimentos) || 0;

    return { ...l, data, periodo, especialidade, medico, crm, atendimentos };
  }).filter(l => l.data && l.medico); // Remove registros sem data ou médico
};

const construirOpcoes = (medicosRaw = [], especialidadesRaw = []) => {
  const medicos = safeArray(medicosRaw).map((m) => ({
    nome: normalize(safeString(m.nome)).toLowerCase(),
    crm: safeString(m.crm).toUpperCase().trim(),
    especialidade: normalize(safeString(m.especialidade)).toLowerCase(),
  }));

  const especialidadesSet = new Set(
    safeArray(especialidadesRaw)
      .map(e => normalize(safeString(e.nome)).toLowerCase())
      .filter(Boolean)
  );

  medicos.forEach(m => {
    if (m.especialidade) especialidadesSet.add(m.especialidade);
  });

  const especialidades = Array.from(especialidadesSet).map(nome => ({ nome }));

  return { medicos, especialidades };
};
// Função para sincronizar os campos com dados do storage e API
const sincronizarCampos = () => {
  try {
    // 1️⃣ Médicos
    const medicosRaw = safeArray(getMedicosFromStorage());
    const medicos = medicosRaw.map(m => ({
      nome: normalize(safeString(m.nome)),
      crm: safeString(m.crm).toUpperCase().trim(),
      especialidade: normalize(safeString(m.especialidade))
    }));

    // 2️⃣ Especialidades
    const especialidades = safeArray(especialidadesListRaw).map(e => ({
      nome: normalize(safeString(e.nome))
    }));

    // 3️⃣ Atualiza inputs de forma segura
    if (medicos.length > 0 && medicoQuery) {
      const mSelecionado = medicos.find(m => normalize(m.nome) === normalize(medicoQuery));
      if (mSelecionado) setMedicoQuery(mSelecionado.nome);
    }

    if (especialidades.length > 0 && especialidadeQuery) {
      const eSelecionada = especialidades.find(e => normalize(e.nome) === normalize(especialidadeQuery));
      if (eSelecionada) setEspecialidadeQuery(eSelecionada.nome);
    }

    if (crmQuery) {
      const crmValido = medicos.some(m => m.crm === crmQuery.toUpperCase().trim());
      if (!crmValido) setCrmQuery(""); // limpa se não existir
    }

    // Hora fica como estava (opcional)
    // setHoraQuery(horaQuery || ""); // opcional

    // 4️⃣ Reconstrói opções para dropdowns
    setOpcoes({ medicos, especialidades });

    // 5️⃣ Reaplica filtros nos dados consolidados
    const filtros = { periodo, dia, mes, ano, medicoQuery, especialidadeQuery, crmQuery, horaQuery };
    const filtrado = aplicarFiltrosSeguros({ plantao: linhasOriginais, filtros });
    setLinhas(filtrado);

    mostrarMensagem("Campos sincronizados com sucesso.", vozAtiva);

  } catch (e) {
    console.error("Erro sincronizarCampos:", e);
    mostrarMensagem("Erro ao sincronizar campos.", vozAtiva);
  }
};

const aplicarFiltrosSeguros = ({
  plantao = [],
  filtros = { periodo: "dia", dia: "", mes: "", ano: "", medicoQuery: "", especialidadeQuery: "", crmQuery: "", horaQuery: "" }  // Adicionei hora
}) => {
  let linhas = safeArray(plantao);

  const { periodo, dia, mes, ano, medicoQuery, especialidadeQuery, crmQuery, horaQuery } = filtros;

  // Filtragem por período
  linhas = linhas.filter((l) => {
    if (periodo === "dia" && dia) return l.data === dia;
    if (periodo === "mes" && mes) return l.data.startsWith(mes);
    if (periodo === "ano" && ano) return l.data.startsWith(ano);
    return true;
  });

  // Filtro por hora (nova)
  if (horaQuery) {
    linhas = linhas.filter(l => safeString(l.hora).includes(horaQuery));
  }

  // Filtros de texto
  if (medicoQuery && medicoQuery.toLowerCase() !== "todos") {
    const q = normalize(medicoQuery);
    linhas = linhas.filter(l => l.medico.includes(q));
  }

  if (especialidadeQuery && especialidadeQuery.toLowerCase() !== "todas") {
    const q = normalize(especialidadeQuery);
    linhas = linhas.filter(l => l.especialidade.includes(q));
  }

  if (crmQuery) {
    const q = crmQuery.toUpperCase().trim();
    linhas = linhas.filter(l => (l.crm || "").includes(q));
  }

  return linhas;
};

// Loader e ErrorBoundary (igual)
const Loader = () => (
  <div style={{
    display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', 
    background: '#f0f8ff', fontSize: '18px', color: '#003366' 
  }}>
    <div>🔄 Carregando consolidação diária de atendimentos...</div>
  </div>
);

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

const mostrarMensagem = (texto, vozAtiva = true) => {
  if (vozAtiva) falarMensagem(texto);
  console.log(`Mensagem: ${texto}`);
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

  // Estados
  const [periodo, setPeriodo] = useState("dia");
  const [dia, setDia] = useState(dayjs().format("YYYY-MM-DD"));
  const [mes, setMes] = useState(dayjs().format("YYYY-MM"));
  const [ano, setAno] = useState(dayjs().format("YYYY"));
  const [horaQuery, setHoraQuery] = useState("");  // Novo: filtro hora

  const [especialidadeQuery, setEspecialidadeQuery] = useState("");
  const [medicoQuery, setMedicoQuery] = useState("");
  const [crmQuery, setCrmQuery] = useState("");

  const debouncedEspecialidade = useDebounce(especialidadeQuery, 300);
  const debouncedMedico = useDebounce(medicoQuery, 300);
  const debouncedCrm = useDebounce(crmQuery, 300);

  const [opcoes, setOpcoes] = useState({ medicos: [], especialidades: [] });
  const [linhasOriginais, setLinhasOriginais] = useState([]);
  const [linhas, setLinhas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [mostrarListaMedicos, setMostrarListaMedicos] = useState(false);
  const [mostrarListaEspecialidades, setMostrarListaEspecialidades] = useState(false);
  const [tipoGrafico, setTipoGrafico] = useState("barra");

  const [vozAtiva, setVozAtiva] = useState(getVozStatus());

  const inputRefMedico = useRef();  // Ref pra lupa médico

  const tabelaRef = useRef(null);

  const handleToggleVoz = () => {
    const novoStatus = toggleVoz();
    setVozAtiva(novoStatus);
    mostrarMensagem(novoStatus ? "Voz ativada" : "Voz desativada", novoStatus);
  };

  // Anti-flicker
  useEffect(() => {
    document.body.style.visibility = 'hidden';
    return () => { document.body.style.visibility = 'visible'; };
  }, []);
  useEffect(() => {
    if (!loading) document.body.style.visibility = 'visible';
    else document.body.style.visibility = 'hidden';
  }, [loading]);

  // Carregamento (com suas funções)
  useEffect(() => {
    let mounted = true;

    const carregar = async () => {
      setLoading(true);
      setErro("");
      try {
        console.log('🔄 Load Filtros...');

        const medicosRaw = safeArray(getMedicosFromStorage());
        const plantaoArr = safeArray(getPlantaoFromStorage());
        console.log('📊 Raw: Médicos', medicosRaw.length, 'Plantões', plantaoArr.length);

        // Suas funções
        const dadosLimpos = normalizarPlantao(plantaoArr);
        const opcoesNovas = construirOpcoes(medicosRaw, especialidadesList);
        console.log('🔧 Normalizado', dadosLimpos.length, 'Opções med', opcoesNovas.medicos.length);

        if (!mounted) return;
        setOpcoes(opcoesNovas);

        if (dadosLimpos.length === 0) {
          setLinhasOriginais([]);
          setLinhas([]);
          setErro("Sem atendimentos – cadastre em Plantão.");
          if (mounted) setLoading(false);
          return;
        }

        const agrupado = agruparPorMedicoDiaEsp(dadosLimpos, opcoesNovas.medicos);
        const dadosFinais = safeArray(agrupado);
        setLinhasOriginais(dadosFinais);
        setLinhas(dadosFinais);

        if (dadosFinais.length === 0) {
          setErro("Sem linhas após agrupar.");
        } else {
          console.log('🎉 Load ok: Linhas', dadosFinais.length);
        }

      } catch (err) {
        console.error("Erro load:", err);
        if (mounted) setErro("Erro ao carregar.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    carregar();

    function onStorageListener(event) {
      const keysToWatch = ["medicos", "medicosList", "plantaoData", "relatorioPlantao", "dadosPlantao"];
      if (keysToWatch.includes(event.key)) setTimeout(carregar, 150);
    }
    window.addEventListener("storage", onStorageListener);
    return () => {
      mounted = false;
      window.removeEventListener("storage", onStorageListener);
    };
  }, []);

  // Totais
  const totais = useMemo(() => {
    if (!linhas || linhas.length === 0) return { totalPeriodo: 0, mediaDia: 0, mediaMes: 0, mediaEspecialidade: {} };
    const totalPeriodo = linhas.reduce((s, l) => s + (Number(l.atendimentos) || 0), 0);
    const datasUnicas = [...new Set(linhas.map(l => l.data))];
    const diasUnicos = datasUnicas.length || 1;
    const mediaDia = Math.round(totalPeriodo / diasUnicos);
    const mediaMes = Math.round(mediaDia * 30);

    const mediaEsp = {};
    linhas.forEach(l => {
      const espNorm = normalize(l.especialidade || "");
      mediaEsp[espNorm] = (mediaEsp[espNorm] || 0) + (Number(l.atendimentos) || 0);
    });
    Object.keys(mediaEsp).forEach(k => mediaEsp[k] = Math.round(mediaEsp[k] / diasUnicos));

    return { totalPeriodo, mediaDia, mediaMes, mediaEspecialidade: mediaEsp };
  }, [linhas]);

  // Charts
  const montarChartData = (key) => {
    if (!linhas || linhas.length === 0) return null;
    const map = {};
    linhas.forEach(l => {
      const valor = key === "dia" ? l.data : normalize(l[key] || "");
      if (!valor) return;
      map[valor] = (map[valor] || 0) + (Number(l.atendimentos) || 0);
    });
    return {
      labels: Object.keys(map).map(k => (key === "dia" ? fmt(k) : k.toUpperCase())),
      data: Object.values(map),
    };
  };

  const chartDataPorEspecialidade = montarChartData("especialidade");
  const chartDataPorMedico = montarChartData("medico");
  const chartDataPorPeriodo = montarChartData("periodo");
  const chartDataPorDia = montarChartData("dia");

  // Dropdowns
  const medicosFiltrados = useMemo(() => {
    const q = debouncedMedico.toLowerCase().trim();
    const qCrm = debouncedCrm.toLowerCase().trim();
    if (!opcoes.medicos || opcoes.medicos.length === 0) return [];
    return opcoes.medicos.filter(m => {
      const nome = m.nome.toLowerCase();
      const crm = m.crm.toLowerCase();
      return (!q || nome.includes(q)) && (!qCrm || crm.includes(qCrm));
    });
  }, [opcoes.medicos, debouncedMedico, debouncedCrm]);

  const especialidadesFiltradas = useMemo(() => {
    const q = debouncedEspecialidade.toLowerCase().trim();
    if (!opcoes.especialidades || opcoes.especialidades.length === 0) return [];
    return opcoes.especialidades.filter(e => {
      const nome = e.nome.toLowerCase();
      return !q || nome.includes(q);
    });
  }, [opcoes.especialidades, debouncedEspecialidade]);

  // Aplicar com sua função
  const aplicar = () => {
    try {
      const filtros = { periodo, dia, mes, ano, medicoQuery, especialidadeQuery, crmQuery, horaQuery };
      const filtrado = aplicarFiltrosSeguros({ plantao: linhasOriginais, filtros });

      setLinhas(filtrado);
      if (filtrado.length === 0) {
        setErro("Nenhum dado encontrado.");
        mostrarMensagem("Nenhum dado pros filtros.", vozAtiva);
      } else {
        mostrarMensagem(`Filtros ok: ${filtrado.length} registros.`, vozAtiva);
      }
    } catch (e) {
      console.error("Erro aplicar:", e);
      setErro("Erro nos filtros.");
      mostrarMensagem("Erro nos filtros.", vozAtiva);
    }
  };

  const limpar = () => {
    setEspecialidadeQuery(""); setMedicoQuery(""); setCrmQuery(""); setHoraQuery("");
    setPeriodo("dia"); setDia(dayjs().format("YYYY-MM-DD")); setMes(dayjs().format("YYYY-MM")); setAno(dayjs().format("YYYY"));
    setErro("");
    setLinhas(linhasOriginais);
    mostrarMensagem("Filtros limpos.", vozAtiva);
  };

  // Exportar (com hora no ws)
  const exportarPDF = () => {
    if (linhas.length === 0) { mostrarMensagem("Sem dados pra PDF.", vozAtiva); return alert("Sem dados."); }
    try {
      const { jsPDF } = window; if (!jsPDF) { mostrarMensagem("jsPDF não.", vozAtiva); return alert("jsPDF não."); }
      const doc = new jsPDF();
      doc.text("Consolidado Atendimentos", 10, 10);
      const body = linhas.map(l => [fmt(l.data), l.periodo, l.especialidade, l.medico, l.crm, l.atendimentos, l.hora || '—']);
      doc.autoTable({ head: [["Data", "Período", "Esp", "Médico", "CRM", "Atend", "Hora"]], body, startY: 20 });
      doc.save(`consolidado_${dayjs().format("YYYYMMDD")}.pdf`);
      mostrarMensagem("PDF salvo!", vozAtiva);
    } catch (e) { console.error(e); mostrarMensagem("Erro PDF.", vozAtiva); alert("Erro PDF."); }
  };

  const exportarExcel = () => {
    if (linhas.length === 0) { mostrarMensagem("Sem dados pra Excel.", vozAtiva); return alert("Sem dados."); }
    try {
      if (!window.XLSX) { mostrarMensagem("XLSX não.", vozAtiva); return alert("XLSX não."); }
      const ws = window.XLSX.utils.json_to_sheet(linhas.map(l => ({ Data: fmt(l.data), Período: l.periodo, Esp: l.especialidade, Médico: l.medico, CRM: l.crm, Atend: l.atendimentos, Hora: l.hora || '—' })));
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Consolidado");
      window.XLSX.writeFile(wb, `consolidado_${dayjs().format("YYYYMMDD")}.xlsx`);
      mostrarMensagem("Excel salvo!", vozAtiva);
    } catch (e) { console.error(e); mostrarMensagem("Erro Excel.", vozAtiva); alert("Erro Excel."); }
  };

  const integrarComRelatorios = () => {
    mostrarMensagem("Indo relatórios.", vozAtiva);
    navigate("/relatorios", { state: { filtros: { periodo, dia, mes, ano, especialidadeQuery, medicoQuery, crmQuery, horaQuery } } });
  };

  const handleSelecionarMedico = (medico) => {
    setMedicoQuery(medico.nome || "");
    setMostrarListaMedicos(false);
    mostrarMensagem(`Médico: ${medico.nome}`, vozAtiva);
  };

  const handleSelecionarEspecialidade = (e) => {
    setEspecialidadeQuery(e.nome || "");
    setMostrarListaEspecialidades(false);
    mostrarMensagem(`Esp: ${e.nome}`, vozAtiva);
  };

  // Lupa médico: Abre lista no click
  const abrirListaMedico = () => {
    setMostrarListaMedicos(true);
  };

  // Normalize chart (simplificado)
  const normalizeChartData = (chartData) => {
    if (!chartData) return null;
    if (chartData.labels && chartData.data) return chartData;
    return null;
  };

  const renderGraficoDinamico = (chartData, titulo) => {
    const data = normalizeChartData(chartData);
    if (!data) return null;
    const ComponentMap = { barra: GraficoBarra, linha: GraficoLinha, pizza: GraficoPizza, area: GraficoArea };
    const Component = ComponentMap[tipoGrafico];
    if (!Component) return <div>Gráfico indisponível.</div>;
    return (
      <div className="grafico-wrapper" key={titulo}>
        <h4>{titulo}</h4>
        <Component data={data} />
      </div>
    );
  };

  if (loading) return <Loader />;

  return (
    <ErrorBoundary>
      <Suspense fallback={<Loader />}>
        <div className="filtros-container">
          <h2>Consolidação Diária Atendimentos - Intranet Empresa</h2>
          <button onClick={handleToggleVoz}>{vozAtiva ? "🔈 Desativar Voz" : "🔊 Ativar Voz"}</button>

          {erro && <div style={{color: "#b91c1c", padding: 10, background: "#fee"}}>{erro}</div>}

          <div className="filtros-controles card">
            <div className="grid-3">
              <div className="field">
                <label>Período</label>
                <select value={periodo} onChange={e => setPeriodo(e.target.value)}>
                  <option value="dia">Dia</option>
                  <option value="mes">Mês</option>
                  <option value="ano">Ano</option>
                </select>
              </div>

              {periodo === "dia" && (
                <div className="field">
                  <label>Data</label>
                  <input type="date" value={dia} onChange={e => setDia(e.target.value)} />
                </div>
              )}

              {periodo === "mes" && (
                <div className="field">
                  <label>Mês</label>
                  <input type="month" value={mes} onChange={e => setMes(e.target.value)} />
                </div>
              )}

              {periodo === "ano" && (
                <div className="field">
                  <label>Ano</label>
                  <input type="number" min="2000" max="2100" value={ano} onChange={e => setAno(e.target.value)} style={{width:100}} />
                </div>
              )}

              <div className="field">
                <label>Tipo Gráfico</label>
                <select value={tipoGrafico} onChange={e => setTipoGrafico(e.target.value)}>
                  <option value="barra">Barra</option>
                  <option value="linha">Linha</option>
                  <option value="pizza">Pizza</option>
                  <option value="area">Área</option>
                </select>
              </div>
            </div>

            {/* Grid com hora */}
            <div className="grid-3">
              <div className="field">
                <label>Hora (opcional)</label>
                <input type="time" value={horaQuery} onChange={e => setHoraQuery(e.target.value)} placeholder="HH:MM" />
              </div>

              <div className="field" style={{position: "relative"}}>
                <label>Especialidade</label>
                <input type="text" placeholder="Todas" value={especialidadeQuery} onChange={e => setEspecialidadeQuery(e.target.value)} onFocus={() => setMostrarListaEspecialidades(true)} onBlur={() => setTimeout(() => setMostrarListaEspecialidades(false), 150)} />
                {mostrarListaEspecialidades && (
                  <div className="lista-dropdown" style={{position: "absolute", top: "100%", zIndex: 10, background: "#fff", border: "1px solid #ccc", maxHeight: 200, overflowY: "auto"}}>
                    <div onMouseDown={() => { setEspecialidadeQuery("todas"); setMostrarListaEspecialidades(false); }} style={{padding:6, cursor:"pointer"}}>Todas</div>
                    {especialidadesFiltradas.map((e, idx) => {
                      const info = safeGetEspecialidadeInfo(e.nome);
                      const Icone = info?.icone;
                      return (
                        <div key={idx} onMouseDown={() => handleSelecionarEspecialidade(e)} style={{padding:6, cursor:"pointer", display:"flex", alignItems:"center"}}>
                          {Icone && typeof Icone === "function" && <Icone size={16} style={{marginRight:5}} />}
                          {e.nome.toUpperCase()}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Médico com lupa */}
              <div className="field" style={{display: "flex", alignItems: "center", position: "relative"}}>
                <label>Médico</label>
                <div style={{display: "flex"}}>
                  <input
                    ref={inputRefMedico}
                    type="text"
                    placeholder="Todos"
                    value={medicoQuery}
                    onChange={e => setMedicoQuery(e.target.value)}
                    onFocus={() => setMostrarListaMedicos(true)}
                    onBlur={() => setTimeout(() => setMostrarListaMedicos(false), 200)}
                    style={{flex:1}}
                  />
                  <span style={{cursor: "pointer", marginLeft: "5px", fontSize: "18px"}} onClick={abrirListaMedico}>🔍</span>
                </div>
                {mostrarListaMedicos && (
                  <div style={{border: "1px solid #ccc", maxHeight: "200px", overflowY: "auto", background: "#fff", position: "absolute", top: "100%", width: "100%", zIndex: 10}}>
                    <div onMouseDown={() => { setMedicoQuery("todos"); setMostrarListaMedicos(false); }} style={{padding: "5px", cursor: "pointer"}}>Todos</div>
                    {medicosFiltrados.map(m => (
                      <div key={m.crm || m.nome} onMouseDown={() => handleSelecionarMedico(m)} style={{padding: "5px", cursor: "pointer"}}>
                        {m.nome.toUpperCase()} - {m.crm}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="field">
                <label>CRM</label>
                <input type="text" value={crmQuery} onChange={e => setCrmQuery(e.target.value.toUpperCase())} placeholder="Filtrar CRM" />
              </div>
            </div>

            <div className="botoes-filtros" style={{display: "flex", gap: 10, marginTop: 15}}>
              <button onClick={aplicar} disabled={loading}>{loading ? "Carregando..." : "Aplicar Filtros"}</button>
              <button onClick={limpar}>Limpar</button>
              <button onClick={exportarPDF}>PDF</button>
              <button onClick={exportarExcel}>Excel</button>
              <button onClick={integrarComRelatorios}>Relatórios</button>
            </div>

            {erro && <p style={{color: "#b91c1c", marginTop: 8}}>{erro}</p>}
          </div>

          {linhas.length > 0 && (
            <div className="card resumo-totais">
              <h3>📐 Totais & Médias</h3>
              <p><strong>Total Atendimentos:</strong> {totais.totalPeriodo}</p>
              <p><strong>Média Diária:</strong> {totais.mediaDia}</p>
              <p><strong>Média Mensal:</strong> {totais.mediaMes}</p>
              <ul className="lista-media-esp">
                {Object.entries(totais.mediaEspecialidade).map(([esp, valor]) => <li key={esp}>{esp.toUpperCase()}: {valor}</li>)}
              </ul>
            </div>
          )}

          <div ref={tabelaRef} className="card tabela-consolidado">
            <h3>Consolidado Atendimentos</h3>
            <div className="tabela-wrapper">
              <table>
                <thead><tr><th>Data</th><th>Período</th><th>Especialidade</th><th>Médico</th><th>CRM</th><th>Atendimentos</th><th>Hora</th></tr></thead>
                <tbody>
                  {linhas.length === 0 ? (
                    <tr><td colSpan="7" className="sem-dados">Sem dados</td></tr>
                  ) : (
                    linhas.map((l, i) => (
                      <tr key={i}>
                        <td>{fmt(l.data) || "—"}</td>
                        <td>{l.periodo || "—"}</td>
                        <td style={{color: safeGetEspecialidadeInfo(l.especialidade)?.cor}}>{l.especialidade || "—"}</td>
                        <td>{l.medico || "—"}</td>
                        <td>{l.crm || "—"}</td>
                        <td>{l.atendimentos || 0}</td>
                        <td>{l.hora || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {linhas.length > 0 && (
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