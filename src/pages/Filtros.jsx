import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import LogoAlpha from "../img/Logo_Alpha.png";
import GraficoBarra from "./GraficoBarra.jsx";
import GraficoPizza from "./GraficoPizza.jsx";
import GraficoLinha from "./GraficoLinha.jsx";
import GraficoArea from "./GraficoArea.jsx";
import { especialidades as especialidadesList, getEspecialidadeInfo } from "../api/especialidades.js";
import "./mobile.css";
import "./Filtros.css";

dayjs.locale("pt-br");
const fmt = (d) => dayjs(d).format("DD/MM/YYYY");

/**
 * Computa o período (Diurno/Noturno) baseado na hora do plantão
 * Diurno: 07:00 - 18:59
 * Noturno: 19:00 - 06:59
 */
const computePeriodo = (hora) => {
  if (!hora || !hora.includes(":")) return "Indefinido";
  const [h, m] = hora.split(":").map(Number);
  const minutos = h * 60 + m;
  const inicioDiurno = 7 * 60;
  const fimDiurno = 19 * 60;
  if (minutos >= inicioDiurno && minutos < fimDiurno) return "Diurno";
  return "Noturno";
};

/**
 * Mapeia um item de plantaoData para o formato esperado (atendimentos consolidado)
 * Como é consolidado por dia, agrupa por data + medico + especialidade, soma quantidade
 */
const mapearParaAtendimentos = (plantaoData) => {
  const agrupado = {};
  plantaoData.forEach((p) => {
    if (!p.data || !p.nome || !p.especialidade || p.quantidade == null) return;
    const key = `${p.data}_${normalizeString(p.nome)}_${normalizeString(p.especialidade)}`;
    if (!agrupado[key]) {
      agrupado[key] = {
        data: p.data,
        periodo: computePeriodo(p.hora),
        especialidade: p.especialidade, // Assume string
        medico: p.nome,
        crm: p.crm || "", // Adicionado para filtro por CRM
        atendimentos: 0,
      };
    }
    agrupado[key].atendimentos += Number(p.quantidade || 0);
  });
  return Object.values(agrupado);
};

const normalizeString = (str) => {
  if (!str) return "";
  return String(str).toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export default function Filtros() {
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState("dia");
  const [dia, setDia] = useState(dayjs().format("YYYY-MM-DD"));
  const [mes, setMes] = useState(dayjs().format("YYYY-MM"));
  const [ano, setAno] = useState(dayjs().format("YYYY"));
  const [especialidadeQuery, setEspecialidadeQuery] = useState(""); // Mudado para input searchável
  const [medicoQuery, setMedicoQuery] = useState(""); // Mudado para input searchável como em Relatorios
  const [crmQuery, setCrmQuery] = useState(""); // Novo filtro por CRM
  const [opcoes, setOpcoes] = useState({ medicos: [], especialidades: [] });
  const [linhas, setLinhas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [mostrarListaMedicos, setMostrarListaMedicos] = useState(false); // Para dropdown medicos
  const [mostrarListaEspecialidades, setMostrarListaEspecialidades] = useState(false); // Para dropdown especialidades
  const [tipoGrafico, setTipoGrafico] = useState("barra"); // Para otimização, usar os graficos custom

  const tabelaRef = useRef(null);
  const graficoRef = useRef(null); // Ref único para o grafico dinâmico otimizado

  useEffect(() => {
    try {
      console.log("Carregando dados do localStorage..."); // Log pra debug
      const medicosRaw = localStorage.getItem("medicos");
      const plantaoRaw = localStorage.getItem("plantaoData");
      console.log("Médicos raw:", medicosRaw ? "OK" : "Vazio");
      console.log("Plantão raw:", plantaoRaw ? "OK" : "Vazio");

      const medicos = JSON.parse(medicosRaw || "[]");
      // Normaliza especialidade para string (nome), integrando com Medicos.jsx
      const medicosNormalizados = medicos.map((m) => ({
        ...m,
        especialidade: m.especialidade?.nome || m.especialidade || "",
      }));
      setOpcoes({
        medicos: medicosNormalizados,
        especialidades: especialidadesList || [], // De especialidades.js
      });

      // Carrega plantaoData e mapeia para formato de atendimentos consolidado
      const plantaoData = JSON.parse(plantaoRaw || "[]");
      const atendimentosMapeados = mapearParaAtendimentos(plantaoData);
      setLinhas(atendimentosMapeados);
      console.log("Dados carregados:", { medicos: medicosNormalizados.length, atendimentos: atendimentosMapeados.length });
    } catch (err) {
      console.error("Erro no useEffect de load:", err); // Log detalhado
      setOpcoes({ medicos: [], especialidades: especialidadesList || [] });
      setLinhas([]);
      setErro("Erro ao carregar dados: " + err.message);
    }
  }, []); // Dependências vazias, roda só no mount

  // Filtra medicos para dropdown (como em Relatorios)
  const medicosFiltrados = useMemo(() => 
    opcoes.medicos.filter((m) => 
      normalizeString(m.nome).includes(normalizeString(medicoQuery)) ||
      normalizeString(m.crm || "").includes(normalizeString(crmQuery))
    ), [opcoes.medicos, medicoQuery, crmQuery]
  );

  // Filtra especialidades para dropdown
  const especialidadesFiltradas = useMemo(() => 
    opcoes.especialidades.filter((e) => 
      normalizeString(e.nome).includes(normalizeString(especialidadeQuery))
    ), [opcoes.especialidades, especialidadeQuery]
  );

  const aplicar = () => {
    setLoading(true);
    setErro("");
    // Recarrega dados frescos do localStorage (como em Relatorios)
    try {
      const plantaoData = JSON.parse(localStorage.getItem("plantaoData") || "[]");
      if (!plantaoData.length) {
        setLinhas([]);
        setErro("⚠️ Nenhum plantão registrado para este período.");
        setLoading(false);
        return;
      }

      let atendimentosMapeados = mapearParaAtendimentos(plantaoData);
      let filtrado = [...atendimentosMapeados];

      // Filtra por período (como em Relatorios, mas adaptado para consolidado)
      if (periodo === "dia") filtrado = filtrado.filter(l => l.data === dia);
      if (periodo === "mes") filtrado = filtrado.filter(l => l.data.startsWith(mes));
      if (periodo === "ano") filtrado = filtrado.filter(l => l.data.startsWith(ano));

      // Se medicoQuery é "todos" ou vazio, não filtra por medico
      const nomeMed = medicoQuery && medicoQuery.toLowerCase() !== "todos" ? medicoQuery : "";
      const nomeEsp = especialidadeQuery && especialidadeQuery.toLowerCase() !== "todas" ? especialidadeQuery : "";

      // Lógica combinada de filtros (igual ao original, mas usando strings normalizadas) + CRM
      filtrado = filtrado.filter(l => {
        const matchMed = !nomeMed || normalizeString(l.medico) === normalizeString(nomeMed);
        const matchEsp = !nomeEsp || normalizeString(l.especialidade) === normalizeString(nomeEsp);
        const matchCrm = !crmQuery || normalizeString(l.crm).includes(normalizeString(crmQuery));
        return matchMed && matchEsp && matchCrm;
      });

      setLinhas(filtrado);
      if (!filtrado.length) setErro("⚠️ Nenhum atendimento encontrado com os filtros aplicados.");
    } catch (err) {
      console.error("Erro no aplicar:", err);
      setErro("Erro ao aplicar filtros: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const limpar = () => {
    setPeriodo("dia");
    setDia(dayjs().format("YYYY-MM-DD"));
    setMes(dayjs().format("YYYY-MM"));
    setAno(dayjs().format("YYYY"));
    setEspecialidadeQuery("");
    setMedicoQuery("");
    setCrmQuery("");
    setMostrarListaMedicos(false);
    setMostrarListaEspecialidades(false);
    // Recarrega dados completos
    try {
      const plantaoData = JSON.parse(localStorage.getItem("plantaoData") || "[]");
      const atendimentosMapeados = mapearParaAtendimentos(plantaoData);
      setLinhas(atendimentosMapeados);
    } catch (err) {
      console.error("Erro no limpar:", err);
      setLinhas([]);
    }
    setErro("");
  };

  // Selecionar medico do dropdown
  const handleSelecionarMedico = (medico) => {
    setMedicoQuery(medico.nome);
    setMostrarListaMedicos(false);
  };

  // Selecionar especialidade do dropdown
  const handleSelecionarEspecialidade = (esp) => {
    setEspecialidadeQuery(esp.nome);
    setMostrarListaEspecialidades(false);
  };

  // Integração com Relatórios: Mapeia filtros atuais para os de Relatórios e navega
  const integrarComRelatorios = () => {
    let dataDe, dataAte, horaDe, horaAte;

    if (periodo === "dia") {
      dataDe = dataAte = dia;
      horaDe = "00:00";
      horaAte = "23:59";
    } else if (periodo === "mes") {
      dataDe = mes + "-01";
      const ultimoDia = dayjs(mes + "-01").add(1, 'month').subtract(1, 'day').format("YYYY-MM-DD");
      dataAte = ultimoDia;
      horaDe = "00:00";
      horaAte = "23:59";
    } else if (periodo === "ano") {
      dataDe = ano + "-01-01";
      dataAte = ano + "-12-31";
      horaDe = "00:00";
      horaAte = "23:59";
    }

    const especialidade = especialidadeQuery && especialidadeQuery.toLowerCase() !== "todas" ? especialidadeQuery : "";
    const medicoQueryFinal = medicoQuery && medicoQuery.toLowerCase() !== "todos" ? medicoQuery : "";

    // Salva filtros no localStorage para Relatórios carregar
    localStorage.setItem("relatorios_filtros", JSON.stringify({
      dataDe, dataAte, horaDe, horaAte, especialidade, medicoQuery: medicoQueryFinal, crmQuery, visao: "profissional", ordem: "alfabetica"
    }));

    navigate("/relatorios");
  };

  const totais = useMemo(() => {
    const totalPeriodo = linhas.reduce((acc, l) => acc + Number(l.atendimentos || 0), 0);
    const dias = new Set(linhas.map(l => l.data));
    const mediaDia = dias.size ? (totalPeriodo / dias.size).toFixed(2) : 0;
    const mediaMes = (totalPeriodo / 30).toFixed(2);
    const mediaEspecialidade = {};
    linhas.forEach(l => {
      mediaEspecialidade[l.especialidade] = (mediaEspecialidade[l.especialidade] || 0) + Number(l.atendimentos || 0);
    });
    return { totalPeriodo, mediaDia, mediaMes, mediaEspecialidade };
  }, [linhas]);

  // Dados para graficos otimizados (como em Relatorios)
  const chartDataPorEspecialidade = useMemo(() => {
    const m = new Map();
    linhas.forEach(l => m.set(l.especialidade, (m.get(l.especialidade) || 0) + Number(l.atendimentos || 0)));
    return [...m.entries()].map(([name, total]) => {
      const info = getEspecialidadeInfo(name);
      return { label: name, data: total, cor: info.cor || "#3b82f6" };
    });
  }, [linhas]);

  const chartDataPorMedico = useMemo(() => {
    const m = new Map();
    linhas.forEach(l => m.set(l.medico || "—", (m.get(l.medico || "—") || 0) + Number(l.atendimentos || 0)));
    return [...m.entries()].map(([name, total]) => ({ label: name, data: total }));
  }, [linhas]);

  const chartDataPorPeriodo = useMemo(() => {
    const m = new Map();
    linhas.forEach(l => m.set(l.periodo, (m.get(l.periodo) || 0) + Number(l.atendimentos || 0)));
    return [...m.entries()].map(([name, total]) => ({ label: name, data: total }));
  }, [linhas]);

  const chartDataPorDia = useMemo(() => {
    const m = new Map();
    linhas.forEach(l => m.set(l.data, (m.get(l.data) || 0) + Number(l.atendimentos || 0)));
    return [...m.entries()].map(([name, total]) => ({ label: name, data: total }));
  }, [linhas]);

  // Renderiza grafico dinâmico otimizado
  const renderGraficoDinamico = (data, titulo) => {
    let GraficoComponent;
    switch (tipoGrafico) {
      case "pizza": GraficoComponent = GraficoPizza; break;
      case "linha": GraficoComponent = GraficoLinha; break;
      case "area": GraficoComponent = GraficoArea; break;
      default: GraficoComponent = GraficoBarra;
    }
    return (
      <div ref={graficoRef}>
        <h3>{titulo}</h3>
        <GraficoComponent data={data} />
      </div>
    );
  };

  const exportarPDF = () => {
    const doc = new jsPDF("p", "mm", "a4");
    const { totalPeriodo, mediaDia, mediaMes, mediaEspecialidade } = totais;

    // Adiciona logo
    const logoImg = new Image();
    logoImg.src = LogoAlpha;
    logoImg.onload = () => {
      doc.addImage(logoImg, "PNG", 14, 10, 40, 15);

      doc.setFontSize(16);
      doc.text("Relatório de Atendimentos Consolidados", 60, 16);
      doc.setFontSize(10);
      doc.text(`Data do relatório: ${fmt(new Date())}`, 60, 22);

      let startY = 32;
      doc.setFontSize(12);
      doc.text(`TOTAL DE ATENDIMENTOS: ${totalPeriodo}`, 14, startY);
      startY += 6;
      doc.text(`MÉDIA DIÁRIA: ${mediaDia}`, 14, startY);
      startY += 6;
      doc.text(`MÉDIA MÊS (aprox.): ${mediaMes}`, 14, startY);
      startY += 8;

      // Resumo por Especialidade (tabela simples)
      doc.text("RESUMO POR ESPECIALIDADE:", 14, startY);
      startY += 6;
      let espData = Object.entries(mediaEspecialidade).map(([esp, valor]) => [esp, valor]);
      doc.autoTable({
        startY,
        head: [["Especialidade", "Total Atendimentos"]],
        body: espData,
        theme: "grid",
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 9 },
        columnStyles: { 0: { cellWidth: 80 } }
      });
      startY = doc.lastAutoTable.finalY + 10;

      // Tabela principal de atendimentos
      doc.text("DETALHAMENTO DE ATENDIMENTOS:", 14, startY);
      startY += 6;
      const tableData = linhas.map(l => [
        dayjs(l.data).format("DD/MM/YYYY"),
        l.periodo,
        l.especialidade,
        l.medico,
        l.crm,
        l.atendimentos
      ]);
      doc.autoTable({
        startY,
        head: [["Data", "Período", "Especialidade", "Médico", "CRM", "Atendimentos"]],
        body: tableData,
        theme: "grid",
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8 },
        columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 15 }, 2: { cellWidth: 30 }, 3: { cellWidth: 40 }, 4: { cellWidth: 20 }, 5: { cellWidth: 15 } }
      });

      // Salva o PDF
      doc.save("relatorio_filtros_consolidado.pdf");
    };
  };

  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(linhas.map(l => ({
      Data: l.data,
      Periodo: l.periodo,
      Especialidade: l.especialidade,
      Medico: l.medico,
      CRM: l.crm,
      Atendimentos: l.atendimentos,
    })));

    const resumoWS = XLSX.utils.json_to_sheet([
      { Total_Periodo: totais.totalPeriodo, Media_Dia: totais.mediaDia, Media_Mes: totais.mediaMes },
      ...Object.entries(totais.mediaEspecialidade).map(([esp, valor]) => ({ Especialidade: esp, Total: valor })),
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Detalhamento");
    XLSX.utils.book_append_sheet(wb, resumoWS, "Resumo");
    XLSX.writeFile(wb, "relatorio_filtros.xlsx");
  };

  return (
    <div className="filtros-container">
      <h2>🔎 Filtros & Consolidados</h2>

      {/* Controles de Filtros - Integrado com Relatorios */}
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
          {/* Especialidade searchável como em Relatorios */}
          <div className="field" style={{ position: "relative" }}>
            <label>Especialidade</label>
            <input
              type="text"
              placeholder="Todas"
              value={especialidadeQuery}
              onChange={(e) => setEspecialidadeQuery(e.target.value)}
              onFocus={() => setMostrarListaEspecialidades(true)}
              onBlur={() => setTimeout(() => setMostrarListaEspecialidades(false), 200)}
            />
            {mostrarListaEspecialidades && (
              <div className="lista-dropdown" style={{ position: "absolute", top: "100%", zIndex: 10, background: "#fff", border: "1px solid #ccc", maxHeight: 200, overflowY: "auto" }}>
                <div onClick={() => { setEspecialidadeQuery("todas"); setMostrarListaEspecialidades(false); }}>Todas</div>
                {especialidadesFiltradas.map((e) => {
                  const info = getEspecialidadeInfo(e.nome);
                  const Icone = info.icone;
                  return (
                    <div key={e.id} onMouseDown={() => handleSelecionarEspecialidade(e)}>
                      {Icone && typeof Icone === "function" && <Icone size={16} style={{ marginRight: 5 }} />}
                      {e.nome}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Medico searchável como em Relatorios */}
          <div className="field" style={{ position: "relative" }}>
            <label>Médico</label>
            <input
              type="text"
              placeholder="Todos"
              value={medicoQuery}
              onChange={(e) => setMedicoQuery(e.target.value)}
              onFocus={() => setMostrarListaMedicos(true)}
              onBlur={() => setTimeout(() => setMostrarListaMedicos(false), 200)}
            />
            {mostrarListaMedicos && (
              <div className="lista-dropdown" style={{ position: "absolute", top: "100%", zIndex: 10, background: "#fff", border: "1px solid #ccc", maxHeight: 200, overflowY: "auto" }}>
                <div onClick={() => { setMedicoQuery("todos"); setMostrarListaMedicos(false); }}>Todos</div>
                {medicosFiltrados.map((m) => (
                  <div key={m.id} onMouseDown={() => handleSelecionarMedico(m)}>
                    {m.nome} - {m.crm}
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
          <button onClick={aplicar} disabled={loading}>{loading ? "Carregando..." : "Aplicar Filtros"}</button>
          <button onClick={limpar}>Limpar</button>
          <button onClick={exportarPDF}>Exportar PDF</button>
          <button onClick={exportarExcel}>Exportar Excel</button>
          <button onClick={integrarComRelatorios}>Ver em Relatórios</button>
        </div>
        {erro && <p className="erro-mensagem" style={{ color: "#b91c1c", marginTop: 8 }}>{erro}</p>}
      </div>

      {/* Totais & Médias */}
      {linhas.length > 0 && (
        <div className="card resumo-totais">
          <h3>📊 Totais & Médias</h3>
          <p><strong>Total de Atendimentos:</strong> {totais.totalPeriodo}</p>
          <p><strong>Média Diária:</strong> {totais.mediaDia}</p>
          <p><strong>Média Mensal (aprox.):</strong> {totais.mediaMes}</p>
          <ul className="lista-media-esp">
            {Object.entries(totais.mediaEspecialidade).map(([esp, valor]) => (
              <li key={esp}>{esp}: {valor}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabela Consolidado */}
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
              {linhas.length === 0 ? (
                <tr><td colSpan="6" className="sem-dados">Sem dados para exibir</td></tr>
              ) : (
                linhas.map((l, i) => (
                  <tr key={i}>
                    <td>{dayjs(l.data).format("DD/MM/YYYY")}</td>
                    <td>{l.periodo}</td>
                    <td style={{ color: getEspecialidadeInfo(l.especialidade)?.cor }}>{l.especialidade}</td>
                    <td>{l.medico}</td>
                    <td>{l.crm}</td>
                    <td>{l.atendimentos}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gráficos Otimizados - Um consolidado por categoria, usando components custom */}
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
  );
}