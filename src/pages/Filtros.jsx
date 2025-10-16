// Imports principais
import React, { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";

// Utils e componentes
import {
  cleanPlantaoArray,
  buildOpcoesMedicosFromRaw,
  agruparPorMedicoDiaEsp,
  normalize,
  sanitizeData,
  computePeriodo,
  fmtDate as fmt,
  getPlantaoFromStorage,
  normalizePlantaoForRelatorios,
} from "../utils/dadosConsolidados.js";

import { especialidades as especialidadesListRaw, getEspecialidadeInfo } from "../api/especialidades.js";

// Componentes de gráfico
import GraficoBarra from "./GraficoBarra";
import GraficoLinha from "./GraficoLinha";
import GraficoPizza from "./GraficoPizza"; 
import GraficoArea from "./GraficoArea";

// Estilos
import "./mobile.css";
import "./Filtros.css";

dayjs.locale("pt-br");

// Helpers de segurança
const safeArray = (v) => Array.isArray(v) ? v : [];
const safeString = (v) => v === null || v === undefined ? "" : String(v);
const safeGetEspecialidadeInfo = typeof getEspecialidadeInfo === "function" ? getEspecialidadeInfo : () => ({ cor: undefined, icone: null });

// Loader Component
const Loader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f8ff', fontSize: '18px', color: '#003366' }}>
    <div>🔄 Carregando consolidação diária de atendimentos...</div>
  </div>
);

// Error Boundary
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

const speak = (text) => {
  try {
    if (!text || typeof window === "undefined" || !window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(String(text));
    const voices = window.speechSynthesis.getVoices() || [];
    const googleVoice = voices.find((v) => /google/i.test(v.name));
    if (googleVoice) utter.voice = googleVoice;
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

  // Estados principais
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
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [mostrarListaMedicos, setMostrarListaMedicos] = useState(false);
  const [mostrarListaEspecialidades, setMostrarListaEspecialidades] = useState(false);
  const [tipoGrafico, setTipoGrafico] = useState("barra");

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 10;

  const tabelaRef = useRef(null);

  // Anti-flicker CSS
  useEffect(() => {
    document.body.style.visibility = 'hidden';
    return () => { document.body.style.visibility = 'visible'; };
  }, []);
  useEffect(() => {
    if (!loading) document.body.style.visibility = 'visible';
    else document.body.style.visibility = 'hidden';
  }, [loading]);

  // Carregamento de dados
  useEffect(() => {
    let mounted = true;
    const buildEspecialidadesFromFile = () =>
      Array.isArray(especialidadesListRaw) ? especialidadesListRaw.map((e) => (typeof e === "string" ? { nome: e } : { nome: e?.nome || "" })) : [];

    const carregar = async () => {
      setLoading(true);
      setErro("");
      try {
        // Médicos
        let medicos = [];
        const medicosCandidates = ["medicos", "medicosList", "listaMedicos"];
        for (const k of medicosCandidates) {
          try { const raw = localStorage.getItem(k); if (!raw) continue; const parsed = JSON.parse(raw); if (Array.isArray(parsed)) { medicos = parsed; break; } } catch {} 
        }
        if (medicos.length === 0) { try { medicos = JSON.parse(localStorage.getItem("medicos") || "[]") || []; } catch { medicos = []; } }

        // Plantão
        const plantaoArr = getPlantaoFromStorage(['plantaoData','plantao','plantaoList','plantaoArray']);
        if (!plantaoArr || plantaoArr.length === 0) { setLinhas([]); setErro("Sem atendimentos consolidados hoje – cadastre em Plantão."); setLoading(false); return; }

        const cleaned = cleanPlantaoArray(plantaoArr, { logInvalid: false });
        const normalizedRel = normalizePlantaoForRelatorios(plantaoArr, medicos);
        const dadosLimpos = (Array.isArray(cleaned) && cleaned.length > 0) ? cleaned : normalizedRel;
        if (!Array.isArray(dadosLimpos) || dadosLimpos.length === 0) { setLinhas([]); setErro("⚠️ Dados inválidos no Plantão."); setLoading(false); return; }

        const opcoesMedicos = buildOpcoesMedicosFromRaw(medicos);
        const agrupado = agruparPorMedicoDiaEsp(dadosLimpos, opcoesMedicos) || [];

        if (!mounted) return;
        setLinhas(agrupado);
        setOpcoes({ medicos: opcoesMedicos, especialidades: buildEspecialidadesFromFile() });

      } catch (err) {
        console.error(err);
        if (mounted) { setLinhas([]); setErro("Erro ao carregar dados."); }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    carregar();
    window.addEventListener("storage", carregar);
    return () => window.removeEventListener("storage", carregar);
  }, []);

  useEffect(() => { if (erro) speak(erro); }, [erro]);

  // Filtros
  const aplicar = () => {
    let filtrado = [...linhas];
    if (especialidadeQuery && especialidadeQuery !== "todas") filtrado = filtrado.filter(l => normalize(l.especialidade || "").includes(normalize(especialidadeQuery)));
    if (medicoQuery && medicoQuery !== "todos") filtrado = filtrado.filter(l => normalize(l.medico || "").includes(normalize(medicoQuery)));
    if (crmQuery) filtrado = filtrado.filter(l => (l.crm || "").toString().toUpperCase().includes(crmQuery.toUpperCase()));
    if (periodo === "dia" && dia) filtrado = filtrado.filter(l => l.data === dia);
    else if (periodo === "mes" && mes) filtrado = filtrado.filter(l => (l.data || "").startsWith(mes));
    else if (periodo === "ano" && ano) filtrado = filtrado.filter(l => (l.data || "").startsWith(ano));
    setLinhas(filtrado);
    setPaginaAtual(1); // reseta paginação
  };

  const limpar = () => { setEspecialidadeQuery(""); setMedicoQuery(""); setCrmQuery(""); setPaginaAtual(1); /* recarrega linhas originais */ };

  // Paginação
  const totalPaginas = Math.ceil(linhas.length / itensPorPagina);
  const linhasPaginadas = linhas.slice((paginaAtual-1)*itensPorPagina, paginaAtual*itensPorPagina);

  if (loading) return <Loader />;

  return (
    <ErrorBoundary>
      <Suspense fallback={<Loader />}>
        <div className="filtros-container">
          {/* ... filtros, gráficos e botões permanecem ... */}

          {/* Tabela */}
          <div className="card tabela-consolidado">
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
                  {linhasPaginadas.length === 0 ? (
                    <tr><td colSpan="6" className="sem-dados">Sem dados para exibir</td></tr>
                  ) : (
                    linhasPaginadas.map((l, i) => (
                      <tr key={i}>
                        <td>{fmt(l.data) || "—"}</td>
                        <td>{l.periodo || "—"}</td>
                        <td style={{ color: safeGetEspecialidadeInfo((l.especialidade || "").toLowerCase())?.cor }}>{l.especialidade || "—"}</td>
                        <td>{l.medico || "—"}</td>
                        <td>{l.crm || "—"}</td>
                        <td>{l.atendimentos || 0}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Controles de paginação */}
            {linhas.length > itensPorPagina && (
              <div className="paginacao" style={{ marginTop: 10, display: 'flex', justifyContent: 'center', gap: 10 }}>
                <button onClick={() => setPaginaAtual(p => Math.max(p-1,1))} disabled={paginaAtual===1}>« Anterior</button>
                <span>{paginaAtual} / {totalPaginas}</span>
                <button onClick={() => setPaginaAtual(p => p<totalPaginas ? p+1 : p)} disabled={paginaAtual===totalPaginas}>Próximo »</button>
              </div>
            )}
          </div>
        </div>
      </Suspense>
    </ErrorBoundary>
  );
}
