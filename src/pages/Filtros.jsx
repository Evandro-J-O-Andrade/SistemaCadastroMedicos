// src/components/Filtros.jsx
import React, { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";

// Utils de storage (usado no controller)
import { getMedicosFromStorage, getPlantaoFromStorage } from "../utils/storagePlantao";

// Utils de dados consolidados (integra no controller)
import {
  normalize,
  fmtDate as fmt,
  parsePlantaoDate,
  agruparPorMedicoDiaEsp,
  normalizePlantao,
  cleanPlantaoArray  // Destrincha raw no controller
} from "../utils/dadosConsolidados.js";

import { especialidades as especialidadesListRaw, getEspecialidadeInfo } from "../api/especialidades.js";

// TTS original
import { falarMensagem, toggleVoz, getVozStatus } from "../utils/tts.js";

// Gráficos original
import GraficoBarra from "./GraficoBarra";
import GraficoLinha from "./GraficoLinha";
import GraficoPizza from "./GraficoPizza";
import GraficoArea from "./GraficoArea";

// Estilos original
import "./mobile.css";
import "./Filtros.css";

dayjs.locale("pt-br");

// Helpers original
const safeArray = (v) => Array.isArray(v) ? v : [];
const safeString = (v) => v === null || v === undefined ? "" : String(v);

// Wrapper original
const safeGetEspecialidadeInfo = (nome) => {
  try {
    return getEspecialidadeInfo(nome);
  } catch (e) {
    return { nome: nome || "Desconhecido", icone: null, cor: "#999" };
  }
};

// timeToMinutes original (fixado sem JSX bug)
const timeToMinutes = (hhmm = "") => {
  if (!hhmm) return null;
  const cleaned = String(hhmm).trim();
  if (!cleaned.includes(":")) {
    if (/^\d{3,4}$/.test(cleaned)) {
      const pad = cleaned.padStart(4, "0");
      return Number(pad.slice(0, 2)) * 60 + Number(pad.slice(2));
    }
    return null;  // Fix: Null se inválido
  }
  const [h, m] = cleaned.split(":").map(n => Number(n));
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
};

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

// GlobalController como intermediário (lógica de busca/tratamento)
export const GlobalController = {
  MEDICOS_KEY: "medicos",
  PLANTOES_KEY: "plantaoData",
  getMedicos() {
    return getMedicosFromStorage() || [];
  },
  getPlantoes() {
    let raw = getPlantaoFromStorage() || [];
    raw = cleanPlantaoArray(raw);  // Normaliza/destrincha raw do save
    return raw;
  },
  findMedicoByName(name) {
    if (!name) return null;
    const medicos = this.getMedicos();
    return medicos.find((m) => (m.nome || "").toLowerCase() === name.toLowerCase()) || null;
  },
  searchMedicos(query) {
    if (!query) return this.getMedicos();
    return this.getMedicos().filter((m) => (m.nome || "").toLowerCase().includes(query.toLowerCase()));
  },
  listEspecialidades() {
    const medicos = this.getMedicos();
    const set = new Set();
    medicos.forEach((m) => {
      const esp = m.especialidades || m.especialidade || [];
      if (Array.isArray(esp)) {
        esp.forEach((e) => set.add((e || "").toString()));
      } else if (esp) set.add(esp.toString());
    });
    return Array.from(set).sort();
  },
  searchEspecialidades(query) {
    if (!query) return this.listEspecialidades();
    return this.listEspecialidades().filter((e) => e.toLowerCase().includes(query.toLowerCase()));
  },
  getPlantaoRecords({ medicoName, especialidade, crm, date, time }) {
    const plantoes = this.getPlantoes();  // Já normalizado
    const medicos = this.getMedicos();
    function sameDate(dStr, targetDate) {
      if (!dStr || !targetDate) return false;
      const d = new Date(dStr);
      if (isNaN(d)) return false;
      return (
        d.getFullYear() === targetDate.getFullYear() &&
        d.getMonth() === targetDate.getMonth() &&
        d.getDate() === targetDate.getDate()
      );
    }
    function sameTime(tStr, targetTime) {
      if (!tStr || !targetTime) return false;
      const pad = (s) => (s || "").toString().padStart(2, "0");
      const [h, m] = (tStr || "").split(":");
      const [ht, mt] = [pad(h), pad(m)];
      const [h2, m2] = [pad(targetTime.getHours()), pad(targetTime.getMinutes())];
      return ht === h2 && mt === m2;
    }
    const targetDate = date ? new Date(date) : null;
    const targetTime = time ? (() => { const now = new Date(); const [hh, mm] = (time || "").split(":"); now.setHours(Number(hh||0)); now.setMinutes(Number(mm||0)); now.setSeconds(0); now.setMilliseconds(0); return now; })() : null;
    let medicoObj = medicoName ? medicos.find(m => (m.nome||"").toLowerCase() === medicoName.toLowerCase()) : null;
    if (!medicoObj && crm) {
      medicoObj = medicos.find(m => (m.crm||"").toString() === crm.toString());
    }
    let results = plantoes.filter(p => {
      const pMedNome = (p.medicoNome || p.medico || "").toString();
      const pMedCrm = (p.crm || p.medicoCrm || "").toString();
      const pEsp = (p.especialidade || p.specialty || "").toString();
      const pDate = p.data || p.date || p.dt || null;
      const pTime = p.hora || p.time || p.horaInicio || null;
      if (medicoName && pMedNome.toLowerCase() !== medicoName.toLowerCase()) return false;
      if (crm && pMedCrm !== crm.toString()) return false;
      if (especialidade && pEsp.toLowerCase() !== especialidade.toLowerCase()) return false;
      if (targetDate && !sameDate(pDate, targetDate)) return false;
      if (targetTime && !sameTime(pTime, targetTime)) return false;
      return true;
    });
    if (medicoObj && results.length === 0) {
      const medId = medicoObj.id || medicoObj._id || medicoObj.crm || medicoObj.nome;
      results = plantoes.filter(p => {
        if (p.medicoId && (p.medicoId === medId)) return true;
        if (p.medico && (p.medico === medId)) return true;
        if ((p.medicoNome || "").toLowerCase() === (medicoObj.nome || "").toLowerCase()) return true;
        return false;
      }).filter(p => {
        if (especialidade && ((p.especialidade||"").toLowerCase() !== especialidade.toLowerCase())) return false;
        if (targetDate && !sameDate(p.data || p.date, targetDate)) return false;
        if (targetTime && !sameTime(p.hora || p.time, targetTime)) return false;
        return true;
      });
    }
    const enriched = results.map(p => {
      const pMedNome = p.medicoNome || p.medico || "";
      const medico = medicos.find(m => ((m.nome||"").toLowerCase() === (pMedNome||"").toLowerCase()) || (m.crm && m.crm.toString() === (p.crm||p.medicoCrm||"").toString()));
      return {
        ...p,
        medico: medico || null,
      };
    });
    return enriched;
  },
  calcStats(plantoes) {
    if (!plantoes || plantoes.length === 0) return { total: 0, mediaDia: 0, mediaMes: 0, mediaAno: 0 };
    const total = plantoes.reduce((sum, p) => sum + (Number(p.quantidade) || Number(p.atendimentos) || 1), 0);
    const dias = new Set();
    const meses = new Set();
    const anos = new Set();
    plantoes.forEach(p => {
      const d = new Date(p.data || p.date || p.dt || null);
      if (!isNaN(d)) {
        dias.add(d.toISOString().slice(0,10));
        meses.add(`${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}`);
        anos.add(d.getFullYear());
      }
    });
    const mediaDia = dias.size ? +(total / dias.size).toFixed(2) : 0;
    const mediaMes = meses.size ? +(total / meses.size).toFixed(2) : 0;
    const mediaAno = anos.size ? +(total / anos.size).toFixed(2) : 0;
    return { total, mediaDia, mediaMes, mediaAno };
  },
};

export default function Filtros() {
  const navigate = useNavigate();

  // Estados original
  const [periodo, setPeriodo] = useState("dia");
  const [dia, setDia] = useState(dayjs().format("YYYY-MM-DD"));
  const [mes, setMes] = useState(dayjs().format("YYYY-MM"));
  const [ano, setAno] = useState(dayjs().format("YYYY"));
  const [horaQuery, setHoraQuery] = useState("");

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

  const inputRefMedico = useRef();
  const tabelaRef = useRef(null);

  const handleToggleVoz = () => {
    const novoStatus = toggleVoz();
    setVozAtiva(novoStatus);
    mostrarMensagem(novoStatus ? "Voz ativada" : "Voz desativada", novoStatus);
  };

  // Anti-flicker original
  useEffect(() => {
    document.body.style.visibility = 'hidden';
    return () => { document.body.style.visibility = 'visible'; };
  }, []);
  useEffect(() => {
    document.body.style.visibility = loading ? 'hidden' : 'visible';
  }, [loading]);

  // Carregar dados via controller (intermediário)
  useEffect(() => {
    let mounted = true;

    const carregar = async () => {
      setLoading(true);
      setErro("");
      try {
        const medicos = GlobalController.getMedicos();  // Intermediário
        const plantao = GlobalController.getPlantoes();  // Normaliza raw

        const especialidades = GlobalController.listEspecialidades();  // Union

        if (!mounted) return;
        setOpcoes({ medicos, especialidades });

        // Agrupa normalizado
        const agrupado = agruparPorMedicoDiaEsp(plantao, medicos);
        const dadosFinais = safeArray(agrupado);

        if (!mounted) return;
        setLinhasOriginais(dadosFinais);
        setLinhas(dadosFinais);

        if (dadosFinais.length === 0) setErro("Sem atendimentos – cadastre em Plantão.");

      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        if (mounted) setErro("Erro ao carregar dados do plantão.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    carregar();

    // Listener original
    function onStorageListener(event) {
      const keysToWatch = ["medicos", "medicosList", "plantaoData", "relatorioPlantao", "dadosPlantao"];
      if (!event.key || keysToWatch.includes(event.key)) setTimeout(carregar, 150);
    }
    window.addEventListener("storage", onStorageListener);

    return () => {
      mounted = false;
      window.removeEventListener("storage", onStorageListener);
    };
  }, []);

  // Totais via controller
  const totais = useMemo(() => {
    const plantao = GlobalController.getPlantoes();  // Intermediário
    const stats = GlobalController.calcStats(plantao);
    return { totalPeriodo: stats.total, mediaDia: stats.mediaDia, mediaMes: stats.mediaMes, mediaEspecialidade: {} };
  }, [linhas]);

  // Charts via controller
  const montarChartData = (key) => {
    const plantao = GlobalController.getPlantoes();  // Intermediário
    if (!plantao || plantao.length === 0) return null;
    const map = {};
    plantao.forEach(p => {
      const valor = key === "dia" ? sanitizeData(p.data) : normalize(p[key] || "");
      if (!valor) return;
      map[valor] = (map[valor] || 0) + (Number(p.quantidade) || 0);
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

  // Dropdowns via controller
  const medicosFiltrados = useMemo(() => {
    const q = (debouncedMedico || "").toString().toLowerCase().trim();
    const qCrm = (debouncedCrm || "").toString().toLowerCase().trim();
    if (!opcoes.medicos || opcoes.medicos.length === 0) return [];
    return opcoes.medicos.filter(m => {
      const nome = (m.nome || "").toString().toLowerCase();
      const crm = (m.crm || "").toString().toLowerCase();
      return (!q || nome.includes(q)) && (!qCrm || crm.includes(qCrm));
    });
  }, [opcoes.medicos, debouncedMedico, debouncedCrm]);

  const especialidadesFiltradas = useMemo(() => {
    const q = (debouncedEspecialidade || "").toString().toLowerCase().trim();
    if (!opcoes.especialidades || opcoes.especialidades.length === 0) return [];
    return opcoes.especialidades.filter(e => {
      const nome = (e.nome || "").toString().toLowerCase();
      return !q || nome.includes(q);
    });
  }, [opcoes.especialidades, debouncedEspecialidade]);

  // Aplicar filtros via controller
  const aplicar = () => {
    try {
      setErro("");
      const filters = {
        medicoName: medicoQuery,
        especialidade: especialidadeQuery,
        crm: crmQuery,
        date: dia,
        time: horaQuery
      };
      const filtrado = GlobalController.getPlantaoRecords(filters);  // Intermediário faz cross + valida
      if (filtrado.length === 0) {
        setErro("Nenhum dado encontrado. Verifique médico/esp/data.");
        mostrarMensagem("Nenhum dado pros filtros.", vozAtiva);
      } else {
        setLinhas(filtrado);
        const stats = GlobalController.calcStats(filtrado);
        mostrarMensagem(`Filtros ok: ${filtrado.length} registros, total ${stats.total}.`, vozAtiva);
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

  // Exportações original
  const exportarPDF = () => {
    if (linhas.length === 0) { mostrarMensagem("Sem dados pra PDF.", vozAtiva); return alert("Sem dados."); }
    try {
      const { jsPDF } = window; if (!jsPDF) { mostrarMensagem("jsPDF não.", vozAtiva); return alert("jsPDF não."); }
      const doc = new jsPDF();
      doc.text("Consolidado Atendimentos", 10, 10);
      const body = linhas.map(l => [fmt(l.data), l.periodo, l.especialidade, l.medico, l.crm, l.atendimentos, l.hora || '—']);
      if (doc.autoTable) doc.autoTable({ head: [["Data", "Período", "Esp", "Médico", "CRM", "Atend", "Hora"]], body, startY: 20 });
      doc.save(`consolidado_${dayjs().format("YYYYMMDD")}.pdf`);
      mostrarMensagem("PDF salvo!", vozAtiva);
    } catch (e) { console.error(e); mostrarMensagem("Erro PDF.", vozAtiva); alert("Erro PDF."); }
  };

  const exportarExcel = () => {
    if (linhas.length === 0) { mostrarMensagem("Sem dados pra Excel.", vozAtiva); return alert("Sem dados."); }
    try {
      if (!window.XLSX) { mostrarMensagem("XLSX não.", vozAtiva); return alert("XLSX não."); }
      const ws = window.XLSX.utils.json_to_sheet(linhas.map(l => ({
        Data: fmt(l.data), Periodo: l.periodo, Especialidade: l.especialidade,
        Medico: l.medico, CRM: l.crm, Atendimentos: l.atendimentos, Hora: l.hora || '—'
      })));
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Consolidado");
      window.XLSX.writeFile(wb, `consolidado_${dayjs().format("YYYYMMDD")}.xlsx`);
      mostrarMensagem("Excel salvo!", vozAtiva);
    } catch (e) { console.error(e); mostrarMensagem("Erro Excel.", vozAtiva); alert("Erro Excel."); }
  };

  if (loading) return <Loader />;

  return (
    <ErrorBoundary>
      <div className="filtros-container">
        <h2>Consolidação de Plantão</h2>
        <div className="filtros-topo">
          <input placeholder="Médico" value={medicoQuery} ref={inputRefMedico} onChange={e => setMedicoQuery(e.target.value)} />
          <input placeholder="CRM" value={crmQuery} onChange={e => setCrmQuery(e.target.value)} />
          <input placeholder="Especialidade" value={especialidadeQuery} onChange={e => setEspecialidadeQuery(e.target.value)} />
          <input placeholder="Hora" value={horaQuery} onChange={e => setHoraQuery(e.target.value)} />
          <button onClick={aplicar}>Filtrar</button>
          <button onClick={limpar}>Limpar</button>
          <button onClick={handleToggleVoz}>{vozAtiva ? "🔊" : "🔈"}</button>
        </div>
        {erro && <div className="erro">{erro}</div>}

        <div className="totais">
          <span>Total: {totais.totalPeriodo}</span>
          <span>Média/dia: {totais.mediaDia}</span>
          <span>Média/mês: {totais.mediaMes}</span>
        </div>

        <div className="botoes-export">
          <button onClick={exportarPDF}>Exportar PDF</button>
          <button onClick={exportarExcel}>Exportar Excel</button>
        </div>

        <div className="graficos">
          {tipoGrafico === "barra" && chartDataPorEspecialidade && <GraficoBarra data={chartDataPorEspecialidade} />}
          {tipoGrafico === "linha" && chartDataPorDia && <GraficoLinha data={chartDataPorDia} />}
          {tipoGrafico === "pizza" && chartDataPorMedico && <GraficoPizza data={chartDataPorMedico} />}
          {tipoGrafico === "area" && chartDataPorPeriodo && <GraficoArea data={chartDataPorPeriodo} />}
        </div>

        <div className="tabela" ref={tabelaRef}>
          <table>
            <thead>
              <tr>
                <th>Data</th><th>Período</th><th>Especialidade</th><th>Médico</th><th>CRM</th><th>Atendimentos</th><th>Hora</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l, idx) => (
                <tr key={idx}>
                  <td>{fmt(l.data)}</td>
                  <td>{l.periodo}</td>
                  <td>{l.especialidade}</td>
                  <td>{l.medico}</td>
                  <td>{l.crm}</td>
                  <td>{l.atendimentos}</td>
                  <td>{l.hora || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ErrorBoundary>
  );
}