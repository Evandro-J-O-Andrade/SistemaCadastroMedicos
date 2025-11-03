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

// componentes de gráfico (mesma pasta / ajuste se estiver em outra)
import GraficoBarra from "./GraficoBarra.jsx";
import GraficoArea from "./GraficoArea.jsx";
import GraficoPizza from "./GraficoPizza.jsx";
import GraficoLinha from "./GraficoLinha.jsx";

// APIs / páginas / serviços do projeto
import { getEspecialidadeInfo, especialidades as especialidadesList } from "../api/especialidades.js";

import { GlobalController, LocalStorageService } from "./GlobalController.jsx";
import { falarMensagem } from "../utils/tts.js";
import { fmtDate } from "../utils/index.js";
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

// helpers de horário
const parseTime = (t) => {
  if (!t) return null;
  const [hh = 0, mm = 0] = String(t).split(":").map((v) => Number(v));
  return (hh || 0) * 60 + (mm || 0);
};
const timeInRange = (timeMin, timeMax, testTime) => {
  if (timeMin == null || timeMax == null || testTime == null) return false;
  if (timeMin <= timeMax) return testTime >= timeMin && testTime <= timeMax;
  // overnight
  return testTime >= timeMin || testTime <= timeMax;
};

const MetricCard = ({ title, value, color, icon }) => {
  const IconComponent = FaIcons[icon] || FaIcons.FaChartBar;
  return (
    <div className="card metric-card">
      <div className="icon" style={{ color: color }}>
        <IconComponent size={22} />
      </div>
      <div className="info">
        <p className="title">{title}</p>
        <span className="value">{value}</span>
      </div>
    </div>
  );
};

export default function Filtros() {
  // datas padrão = hoje
  const hoje = dayjs().format("YYYY-MM-DD");
  const [dataInicio, setDataInicio] = useState(hoje);
  const [dataFim, setDataFim] = useState(hoje);

  // turno / horas - por pedido deixar personalizado como padrão
  const [turnoPreset, setTurnoPreset] = useState("personalizado"); // personalizado | 07-19 | 19-07 | fechado-23:59 | fechado-12h
  const [horaDe, setHoraDe] = useState("07:00");
  const [horaAte, setHoraAte] = useState("19:00");
  const [fechado12hModo, setFechado12hModo] = useState("diurno"); // diurno | noturno (apenas p/ fechado-12h)

  // campos separados (vazio = Todos)
  const [medicoNome, setMedicoNome] = useState("");
  const [medicoCRM, setMedicoCRM] = useState("");
  const [especialidade, setEspecialidade] = useState("");

  // sugestões/autocomplete (apenas nomes mostrados)
  const [opcoesMedicosObj, setOpcoesMedicosObj] = useState([]); // {nome, crm, especialidade}
  const [sugestoesMedicos, setSugestoesMedicos] = useState([]);
  const [mostrarSugestoesMedicos, setMostrarSugestoesMedicos] = useState(false);

  const [opcoesEspecialidades, setOpcoesEspecialidades] = useState([]); // com ícone/cor quando disponível
  const [mostrarSugestoesEspecialidades, setMostrarSugestoesEspecialidades] = useState(false);

  // dados brutos e filtrados
  const [plantaoDataRaw, setPlantaoDataRaw] = useState([]);
  const [tabelaDetalhada, setTabelaDetalhada] = useState([]);
  const [mensagem, setMensagem] = useState("");

  // gráfico e visão
  const [chartType, setChartType] = useState("pizza"); // pizza | barra | linha | area
  const [visao, setVisao] = useState("profissional");

  // índices para resolver por CRM/nome/especialidade
  const [medicosIndexByCRM, setMedicosIndexByCRM] = useState(new Map());
  const [medicosIndexByName, setMedicosIndexByName] = useState(new Map());
  const [plantaoMedicosIndexByCRM, setPlantaoMedicosIndexByCRM] = useState(new Map());

  // util safe parse
  function safeParse(v) {
    try {
      return typeof v === "string" ? JSON.parse(v) : v;
    } catch {
      return v;
    }
  }

  // carrega dados do localStorage (sem mocks) e monta índices
  useEffect(() => {
    try {
      const rawMed =
        (GlobalController && typeof GlobalController.getMedicos === "function" && GlobalController.getMedicos()) ||
        (LocalStorageService && typeof LocalStorageService.getItem === "function" && safeParse(LocalStorageService.getItem("medicos"))) ||
        safeParse(localStorage.getItem("medicos")) ||
        [];

      const medObjs = (Array.isArray(rawMed) ? rawMed : []).map((m) => ({
        nome: m?.nome || m?.name || m?.nomeMedico || "",
        crm: String(m?.crm || m?.CRM || "").trim(),
        especialidade: (m?.especialidade && (m.especialidade.nome || m.especialidade)) || "",
      }));

      // índices por CRM e por nome (cadastro de médicos)
      const idxCRM = new Map();
      const idxName = new Map();
      medObjs.forEach((m) => {
        if (m.crm) idxCRM.set(m.crm, m);
        if (m.nome) idxName.set((m.nome || "").toLowerCase(), m);
      });

      setOpcoesMedicosObj(medObjs);
      setSugestoesMedicos(medObjs); // mostrar todos inicialmente, filtra conforme digitação
      setMedicosIndexByCRM(idxCRM);
      setMedicosIndexByName(idxName);

      // especialidades: prefere a lista exportada pela nossa página de especialidades,
      // se disponível; senão, fallback para api/especialidades.js e para especialidades vindas dos médicos
      let espList = [];
      try {
        if (typeof getEspecialidades === "function") {
          espList = getEspecialidades() || [];
        }
      } catch (e) {
        espList = [];
      }
      if (!Array.isArray(espList) || espList.length === 0) {
        espList = Array.isArray(especialidadesList) ? especialidadesList : [];
      }
      const espSet = new Map();
      espList.forEach((e) => {
        const nome = typeof e === "string" ? e : e?.nome || "";
        if (nome) espSet.set(nome.toLowerCase(), typeof e === "string" ? { nome } : e);
      });
      medObjs.forEach((m) => {
        if (m.especialidade) {
          const key = (m.especialidade || "").toLowerCase();
          if (!espSet.has(key)) espSet.set(key, { nome: m.especialidade });
        }
      });
      setOpcoesEspecialidades(Array.from(espSet.values()));

      const rawPlantoes =
        (GlobalController && typeof GlobalController.getPlantoes === "function" && GlobalController.getPlantoes()) ||
        (LocalStorageService && typeof LocalStorageService.getItem === "function" && safeParse(LocalStorageService.getItem("plantaoData"))) ||
        safeParse(localStorage.getItem("plantaoData")) ||
        [];

      setPlantaoDataRaw(Array.isArray(rawPlantoes) ? rawPlantoes : []);

      // monta índice de médicos vindo dos plantões (podem ter crm/nome diferentes)
      const idxPlantaoCRM = new Map();
      (Array.isArray(rawPlantoes) ? rawPlantoes : []).forEach((p) => {
        // resolve crm do registro
        const crm = String(p.crm || p.crmMedico || p.medico?.crm || "").trim();
        const nome = typeof p.medico === "string" ? p.medico : p.medico?.nome || p.nomeMedico || "";
        const esp =
          p.especialidade || p.especialidade?.nome || p.medico?.especialidade?.nome || p.medico?.especialidade || "";
        if (crm) {
          if (!idxPlantaoCRM.has(crm)) idxPlantaoCRM.set(crm, { nome, crm, especialidades: new Set() });
          if (esp) idxPlantaoCRM.get(crm).especialidades.add(esp);
        } else if (nome) {
          // registra por nome também (caso crm ausente)
          const key = (nome || "").toLowerCase();
          if (!idxPlantaoCRM.has(key)) idxPlantaoCRM.set(key, { nome, crm: "", especialidades: new Set([esp].filter(Boolean)) });
        }
      });
      setPlantaoMedicosIndexByCRM(idxPlantaoCRM);
    } catch (e) {
      console.warn("Erro carregando localStorage:", e);
    }
  }, []);

  // filtra sugestões de médicos mostrando apenas NOME (sem crm/especialidade)
  useEffect(() => {
    if (!medicoNome) {
      setSugestoesMedicos(opcoesMedicosObj);
      return;
    }
    const q = medicoNome.toLowerCase();
    const found = opcoesMedicosObj.filter((m) => (m.nome || "").toLowerCase().includes(q));
    setSugestoesMedicos(found);
  }, [medicoNome, opcoesMedicosObj]);

  // suggestions especialidade visibility
  useEffect(() => {
    if (!especialidade) setMostrarSugestoesEspecialidades(false);
    else setMostrarSugestoesEspecialidades(true);
  }, [especialidade]);

  // quando o usuário preencher só o CRM manualmente: tentar resolver o nome automaticamente
  useEffect(() => {
    if (!medicoCRM) return;
    // se já tem nome preenchido, não mexe
    if (medicoNome && medicoNome.trim()) return;
    // tenta cadastro (medicosIndexByCRM)
    const mfromCadastro = medicosIndexByCRM.get(String(medicoCRM));
    if (mfromCadastro) {
      setMedicoNome(mfromCadastro.nome || "");
      if (!especialidade && mfromCadastro.especialidade) setEspecialidade(mfromCadastro.especialidade);
      return;
    }
    // tenta plantao index
    const mfromPlantao = plantaoMedicosIndexByCRM.get(String(medicoCRM));
    if (mfromPlantao) {
      setMedicoNome(mfromPlantao.nome || "");
      return;
    }
  }, [medicoCRM, medicoNome, especialidade, medicosIndexByCRM, plantaoMedicosIndexByCRM]);

  // permitir apagar nome e limpar crm/especialidade quando nome vazio
  const handleMedicoNomeChange = (value) => {
    setMedicoNome(value);
    if (!value || value.trim() === "") {
      // não sobrescrever CRM se o usuário quer manter - apenas limpa se estava preenchido automaticamente
      setMedicoCRM("");
      // mantém especialidade em branco para o usuário escolher
      setEspecialidade("");
    }
    setMostrarSugestoesMedicos(true);
  };

  // Normaliza string (mesma função usada em Relatorios)
  const normalizeString = (str) =>
    !str ? "" : String(str).toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Converte data/hora do registro em Date
  const parsePlantaoDate = (dataStr, horaStr) => {
    if (!dataStr) return null;
    if (dataStr.includes("-")) return new Date(`${dataStr}T${horaStr || "00:00"}`);
    const parts = String(dataStr).split("/");
    if (parts.length === 3) {
      const [dia, mes, ano] = parts;
      return new Date(`${ano}-${mes}-${dia}T${horaStr || "00:00"}`);
    }
    return new Date(`${dataStr}T${horaStr || "00:00"}`);
  };

  // filtra por intervalo de data/hora (aceita overnight igual Relatorios)
  const filtrarPorDataHora = (dados, inicio, fim, horaInicioStr, horaFimStr) => {
    const horaInicio = horaInicioStr || "07:00";
    const horaFim = horaFimStr || "19:00";

    return dados.filter((p) => {
      const registro = parsePlantaoDate(p.data || p.dia || p.date, p.hora || p.horaInicio || p.hora_inicio);
      if (!registro) return false;

      // checa intervalo de datas primeiro
      if (registro < inicio || registro > fim) return false;

      // se hora completa do dia selecionada
      if (horaInicio === "00:00" && horaFim === "23:59") return true;

      // overnight (19:00 - 07:00) tratamento especial
      if (horaInicio === "19:00" && horaFim === "07:00") {
        const horaRegistro = registro.getHours() * 60 + registro.getMinutes();
        const limInicio = 19 * 60;
        const limFim = 7 * 60;

        // se no mesmo dia e >= 19:00
        if (horaRegistro >= limInicio) return true;

        // se no próximo dia e <= 07:00
        // calcular início do próximo dia do registro
        const dataRegistro = new Date(registro);
        dataRegistro.setHours(0, 0, 0, 0);
        const inicioDiaSeguinte = new Date(dataRegistro);
        inicioDiaSeguinte.setDate(inicioDiaSeguinte.getDate() + 1);
        inicioDiaSeguinte.setHours(0, 0, 0, 0);
        const fimTurno = new Date(inicioDiaSeguinte);
        fimTurno.setHours(7, 0, 0, 0);

        if (registro >= inicioDiaSeguinte && registro <= fimTurno && horaRegistro <= limFim) return true;

        return false;
      }

      // caso padrão: compara string HH:mm
      const horaRegistroStr = dayjs(registro).format("HH:mm");
      return horaRegistroStr >= horaInicio && horaRegistroStr <= horaFim;
    });
  };

  // substitui aplicarFiltrosCliente por lógica igual à Relatorios (prioridade de filtros)
  const aplicarFiltrosCliente = () => {
    const di = dataInicio;
    const df = dataFim;
    const dInicio = dayjs(di, ["YYYY-MM-DD", "DD/MM/YYYY"]).startOf("day").toDate();
    const dFim = dayjs(df, ["YYYY-MM-DD", "DD/MM/YYYY"]).endOf("day").toDate();

    // prepara dados normalizados (igual Relatorios)
    const medicosCad = opcoesMedicosObj || []; // já carregado no useEffect
    const dadosPlantoes = Array.isArray(plantaoDataRaw) ? plantaoDataRaw : [];

    // normaliza registros para garantir campos usados
    const dadosCompletos = dadosPlantoes.map((p) => {
      const nomeRegistro = typeof p.medico === "string" ? p.medico : p.medico?.nome || p.nomeMedico || "";
      const crmRegistro = String(p.crm || p.crmMedico || p.medico?.crm || "").trim();
      const espRegistro = p.especialidade || p.especialidade?.nome || p.medico?.especialidade?.nome || "";
      return {
        ...p,
        medico: nomeRegistro,
        crm: crmRegistro,
        especialidade: espRegistro,
        data: p.data || p.dia || p.date,
        hora: p.hora || p.horaInicio || p.hora_inicio || "",
        quantidade: Number(p.quantidade || p.qtd || p.atendimentos || 0),
      };
    });

    const nomeBusca = normalizeString(medicoNome);
    const crmBusca = String(medicoCRM || "").trim();
    const espBusca = normalizeString(especialidade);

    // aplica prioridade: crm > nome > especialidade > todos
    let filtrados = [];
    if (crmBusca) {
      filtrados = dadosCompletos.filter((p) => String(p.crm) === crmBusca);
      if (espBusca) filtrados = filtrados.filter((p) => normalizeString(p.especialidade) === espBusca);
    } else if (nomeBusca) {
      filtrados = dadosCompletos.filter((p) => normalizeString(p.medico) === nomeBusca);
      if (espBusca) filtrados = filtrados.filter((p) => normalizeString(p.especialidade) === espBusca);
    } else if (espBusca) {
      filtrados = dadosCompletos.filter((p) => normalizeString(p.especialidade) === espBusca);
    } else {
      filtrados = dadosCompletos;
    }

    // depois aplica filtro de data/hora
    filtrados = filtrarPorDataHora(filtrados, dInicio, dFim, horaDe, horaAte);

    if (!filtrados || filtrados.length === 0) {
      let mensagem = "Nenhum dado encontrado para os filtros aplicados.";
      if (nomeBusca && espBusca) mensagem = "Especialidade sem registro para esse médico.";
      else if (nomeBusca && !espBusca) mensagem = "Médico sem registros.";
      else if (!nomeBusca && espBusca) mensagem = "Especialidade sem registros.";
      setTabelaDetalhada([]);
      setMensagem(mensagem);
      falarMensagem(mensagem);
      setTimeout(() => setMensagem(""), 4000);
      return;
    }

    // monta tabela detalhada no formato esperado
    const tabela = filtrados.map((p) => ({
      ...p,
      medico: p.medico || (p.crm ? (medicosIndexByCRM.get(p.crm)?.nome || "") : ""),
      crm: p.crm || "",
      especialidade: p.especialidade || "",
      data: p.data,
      hora: p.hora || "",
      atendimentos: Number(p.quantidade || 0),
    }));

    setTabelaDetalhada(tabela);
    const totalAtend = tabela.reduce((s, r) => s + (Number(r.atendimentos) || 0), 0);
    const msg = `Encontrados ${tabela.length} registros, ${totalAtend} atendimentos.`;
    setMensagem(msg);
    if (totalAtend > 0) falarMensagem(msg);
    setTimeout(() => setMensagem(""), 4000);
  };

  const handleAplicarFiltros = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    aplicarFiltrosCliente();
  };

  const handleLimparFiltros = () => {
    setDataInicio(hoje);
    setDataFim(hoje);
    setTurnoPreset("personalizado");
    setHoraDe("07:00");
    setHoraAte("19:00");
    setFechado12hModo("diurno");
    setMedicoNome("");
    setMedicoCRM("");
    setEspecialidade("");
    setTabelaDetalhada([]);
    setMensagem("Filtros limpos.");
    falarMensagem("Filtros limpos.");
    setTimeout(() => setMensagem(""), 3000);
  };

  // agregados p/ gráficos e cards (usados no topo)
  const agregadosPorMedico = useMemo(() => {
    const map = {};
    (tabelaDetalhada || []).forEach((r) => {
      const key = r.medico || "Desconhecido";
      map[key] = (map[key] || 0) + (Number(r.atendimentos) || 0);
    });
    const labels = Object.keys(map).sort((a, b) => map[b] - map[a]).slice(0, 20);
    const data = labels.map((l) => map[l]);
    return { labels, datasets: [{ label: "Atendimentos", data, backgroundColor: labels.map(() => "#3b82f6") }] };
  }, [tabelaDetalhada]);

  const agregadosPorEspecialidade = useMemo(() => {
    const map = {};
    (tabelaDetalhada || []).forEach((r) => {
      const key = r.especialidade || "Desconhecida";
      map[key] = (map[key] || 0) + (Number(r.atendimentos) || 0);
    });
    const labels = Object.keys(map);
    const data = labels.map((l) => map[l]);
    const colors = labels.map((l) => getEspecialidadeInfo(l)?.cor || "#888");
    return { labels, datasets: [{ data, backgroundColor: colors }] };
  }, [tabelaDetalhada]);

  const agregadosPorDia = useMemo(() => {
    const map = {};
    (tabelaDetalhada || []).forEach((r) => {
      const key = dayjs(r.data, ["YYYY-MM-DD", "DD/MM/YYYY"]).isValid() ? dayjs(r.data).format("YYYY-MM-DD") : String(r.data || "");
      map[key] = (map[key] || 0) + (Number(r.atendimentos) || 0);
    });
    const labels = Object.keys(map).sort();
    const data = labels.map((l) => map[l]);
    return { labels: labels.map((l) => dayjs(l).format("DD/MM")), datasets: [{ label: "Atendimentos", data, borderColor: "#1f4e78", backgroundColor: "#1f4e7840", fill: true }] };
  }, [tabelaDetalhada]);

  // escolhe componente de gráfico conforme chartType
  const renderGrafico = () => {
    if (chartType === "pizza") return <GraficoPizza data={visao === "profissional" ? agregadosPorMedico : agregadosPorEspecialidade} />;
    if (chartType === "barra") return <GraficoBarra data={visao === "profissional" ? agregadosPorMedico : agregadosPorEspecialidade} />;
    if (chartType === "linha") return <GraficoLinha data={agregadosPorDia} />;
    if (chartType === "area") return <GraficoArea data={agregadosPorDia} />;
    return <GraficoPizza data={agregadosPorMedico} />;
  };

  return (
    <div className="filtros-container">
      <h1>Relatórios de Plantões</h1>

      {/* CARDS NO TOPO usando dados filtrados */}
      <div className="grid-3" style={{ marginBottom: 12 }}>
        <MetricCard title="Total de Atendimentos" value={(tabelaDetalhada || []).reduce((s, r) => s + (Number(r.atendimentos) || 0), 0)} color="#1f4e78" icon="FaUserMd" />
        <MetricCard title="Total de Médicos Únicos" value={new Set((tabelaDetalhada || []).map(d => d.medico)).size} color="#27AE60" icon="FaUsers" />
        <MetricCard
          title="Média diária (intervalo)"
          value={(() => {
            const dias = new Set((tabelaDetalhada || []).map(d => dayjs(d.data).format('YYYY-MM-DD'))).size || 1;
            const total = (tabelaDetalhada || []).reduce((s, r) => s + (Number(r.atendimentos) || 0), 0);
            return (total / dias).toFixed(2);
          })()}
          color="#F39C12"
          icon="FaChartLine"
        />
      </div>

      {mensagem && <p className="mensagem-global">{mensagem}</p>}

      <div className="card">
        <h3>Filtros</h3>
        <form onSubmit={handleAplicarFiltros}>
          <div className="filtros-grid">
            <div className="input-group autocomplete-group">
              <label>Médico</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  value={medicoNome}
                  onChange={(e) => handleMedicoNomeChange(e.target.value)}
                  onFocus={() => setMostrarSugestoesMedicos(true)}
                  onBlur={() => setTimeout(() => setMostrarSugestoesMedicos(false), 150)}
                  placeholder="Todos"
                  className="input-field"
                  aria-label="Médico"
                />
                <button type="button" className="btn-icon" title="Pesquisar médico" onClick={() => setMostrarSugestoesMedicos((s) => !s)}>
                  <FaIcons.FaSearch />
                </button>
              </div>

              {mostrarSugestoesMedicos && sugestoesMedicos.length > 0 && (
                <div className="autocomplete-list" role="listbox">
                  {sugestoesMedicos.map((s, i) => (
                    <div
                      key={i}
                      className="autocomplete-item"
                      onMouseDown={() => {
                        // Ao selecionar médico: preencher NOME + CRM apenas.
                        // NÃO setar especialidade automaticamente (pode variar por plantão).
                        setMedicoNome(s.nome || "");
                        setMedicoCRM(s.crm || "");
                        setMostrarSugestoesMedicos(false);
                      }}
                    >
                      <div>{s.nome}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="input-group">
              <label>CRM</label>
              <input value={medicoCRM} onChange={(e) => setMedicoCRM(e.target.value)} placeholder="Todos" className="input-field" />
            </div>

            <div className="input-group autocomplete-group">
              <label>Especialidade</label>
              <input
                value={especialidade}
                onChange={(e) => {
                  setEspecialidade(e.target.value);
                  setMostrarSugestoesEspecialidades(true);
                }}
                onFocus={() => setMostrarSugestoesEspecialidades(true)}
                onBlur={() => setTimeout(() => setMostrarSugestoesEspecialidades(false), 150)}
                placeholder="Todos"
                className="input-field"
              />
              {mostrarSugestoesEspecialidades && opcoesEspecialidades.length > 0 && (
                <div className="autocomplete-list">
                  {opcoesEspecialidades
                    .filter((e) => {
                      const nome = typeof e === "string" ? e : e?.nome || "";
                      return !especialidade || nome.toLowerCase().includes((especialidade || "").toLowerCase());
                    })
                    .map((e, i) => {
                      const nome = typeof e === "string" ? e : e?.nome || "";
                      const info = getEspecialidadeInfo(nome);
                      const IconComp = info?.icone || null; // usar propriedade 'icone' retornada por getEspecialidadeInfo
                      return (
                        <div
                          key={i}
                          className="autocomplete-item"
                          onMouseDown={() => {
                            setEspecialidade(nome);
                            setMostrarSugestoesEspecialidades(false);
                          }}
                        >
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            {/* mostra ícone/color da especialidade quando disponível */}
                            {IconComp ? <IconComp style={{ color: info?.cor || "#666" }} /> : <span style={{ width: 12, height: 12, borderRadius: 6, background: info?.cor || "#ccc", display: "inline-block" }} />}
                            <span>{nome}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            <div className="input-group">
              <label>Turno</label>
              <select
                value={turnoPreset}
                onChange={(e) => {
                  const v = e.target.value;
                  setTurnoPreset(v);
                  if (v === "07-19") {
                    setHoraDe("07:00");
                    setHoraAte("19:00");
                  } else if (v === "19-07") {
                    setHoraDe("19:00");
                    setHoraAte("07:00");
                  } else if (v === "fechado-23:59") {
                    setHoraDe("23:59");
                    setHoraAte("23:59");
                  } else if (v === "fechado-12h") {
                    // manter modo diurno por padrão
                    setFechado12hModo("diurno");
                    setHoraDe("07:00");
                    setHoraAte("19:00");
                  }
                }}
                className="input-select"
              >
                <option value="personalizado">Personalizado (padrão)</option>
                <option value="07-19">07:00 - 19:00</option>
                <option value="19-07">19:00 - 07:00</option>
                <option value="fechado-12h">Fechado 12h (diurno/noturno)</option>
                <option value="fechado-23:59">Fechado 23:59</option>
              </select>

              {/* controles extra para fechado-12h (diurno / noturno) */}
              {turnoPreset === "fechado-12h" && (
                <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                  <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input type="radio" name="f12" checked={fechado12hModo === "diurno"} onChange={() => { setFechado12hModo("diurno"); setHoraDe("07:00"); setHoraAte("19:00"); }} /> 07:00-19:00
                  </label>
                  <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input type="radio" name="f12" checked={fechado12hModo === "noturno"} onChange={() => { setFechado12hModo("noturno"); setHoraDe("19:00"); setHoraAte("07:00"); }} /> 19:00-07:00
                  </label>
                </div>
              )}

              {turnoPreset === "personalizado" && (
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <input type="time" value={horaDe} onChange={(e) => setHoraDe(e.target.value)} className="input-field" />
                  <input type="time" value={horaAte} onChange={(e) => setHoraAte(e.target.value)} className="input-field" />
                </div>
              )}
            </div>

            <div className="input-group">
              <label>Data Início</label>
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="input-field" />
            </div>

            <div className="input-group">
              <label>Data Fim</label>
              <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="input-field" />
            </div>

            <div className="input-group">
              <label>Tipo de Gráfico</label>
              <select value={chartType} onChange={(e) => setChartType(e.target.value)} className="input-select">
                <option value="pizza">Pizza (padrão)</option>
                <option value="barra">Barra</option>
                <option value="linha">Linha</option>
                <option value="area">Área</option>
              </select>
            </div>
          </div>

          <div className="botoes-acao" style={{ marginTop: 12 }}>
            <button type="submit" className="btn-primario">
              <FaIcons.FaFilter style={{ marginRight: 8 }} /> Gerar relatórios
            </button>
            <button type="button" className="btn-secundario" onClick={handleLimparFiltros} style={{ marginLeft: 8 }}>
              <FaIcons.FaEraser style={{ marginRight: 8 }} /> Limpar filtros
            </button>
          </div>
        </form>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 12, alignItems: "center" }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="radio" name="visao" checked={visao === "profissional"} onChange={() => setVisao("profissional")} /> Visão Profissional
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="radio" name="visao" checked={visao === "especialidade"} onChange={() => setVisao("especialidade")} /> Visão Especialidade
        </label>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>Análises</h3>
        <div className="grid-graficos">
          <div className="grafico-wrapper">
            <h4>{visao === "profissional" ? "Atendimentos por Médico" : "Atendimentos por Especialidade"}</h4>
            {renderGrafico()}
          </div>
          <div className="grafico-wrapper">
            <h4>Atendimentos por Dia</h4>
            <GraficoArea data={agregadosPorDia} />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>Relatório Detalhado</h3>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button className="btn-primario" onClick={() => { gerarPDF(tabelaDetalhada); setMensagem("PDF gerado."); falarMensagem("PDF gerado."); }}>
            <FaIcons.FaFilePdf style={{ marginRight: 8 }} /> Gerar PDF
          </button>
          <button className="btn-secundario" onClick={() => { gerarExcel(tabelaDetalhada); setMensagem("Excel gerado."); falarMensagem("Excel gerado."); }}>
            <FaIcons.FaFileExcel style={{ marginRight: 8 }} /> Gerar Excel
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
                </tr>
              </thead>
              <tbody>
                {tabelaDetalhada.map((p, idx) => (
                  <tr key={idx} style={{ borderLeft: `5px solid ${getEspecialidadeInfo(p.especialidade)?.cor || "#999"}` }}>
                    <td>{fmtDate(p.data)}</td>
                    <td>{p.medico}</td>
                    <td>{p.crm}</td>
                    <td>{p.especialidade}</td>
                    <td>{p.hora}</td>
                    <td className="atendimentos-value">{p.atendimentos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
