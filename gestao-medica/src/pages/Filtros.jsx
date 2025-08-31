import React, { useEffect, useMemo, useState, useRef } from "react";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend,
} from "recharts";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import LogoAlpha from "../img/Logo_Alpha.png";

const LOGO_URL = LogoAlpha;
dayjs.locale("pt-br");
const fmt = (d) => dayjs(d).format("DD/MM/YYYY");

// Substitua pela URL ou import da sua logo


const API = {
  opcoes: "/api/opcoes",
  consolidado: "/api/relatorios/consolidado",
};

export default function Filtros() {
  const [periodo, setPeriodo] = useState("dia");
  const [dia, setDia] = useState(dayjs().format("YYYY-MM-DD"));
  const [mes, setMes] = useState(dayjs().format("YYYY-MM"));
  const [ano, setAno] = useState(dayjs().format("YYYY"));
  const [especialidadeId, setEspecialidadeId] = useState("");
  const [medicoId, setMedicoId] = useState("");
  const [opcoes, setOpcoes] = useState({ medicos: [], especialidades: [] });
  const [linhas, setLinhas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const tabelaRef = useRef(null);
  const graficoEspecialidadeRef = useRef(null);
  const graficoMedicoRef = useRef(null);
  const graficoPeriodoRef = useRef(null);
  const graficoDiaRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        setErro("");
        const r = await fetch(API.opcoes);
        if (!r.ok) throw new Error("Falha ao carregar opções");
        const data = await r.json();
        setOpcoes({
          medicos: data.medicos ?? [],
          especialidades: data.especialidades ?? [],
        });
      } catch {
        setOpcoes({
          medicos: [
            { id: 1, nome: "DR. ALEXANDRE MAURICIO RODRIGUES DE ARAUJO" },
            { id: 2, nome: "DRA. ADRIANA ESCOBAR" },
            { id: 3, nome: "DR. BRUNO CAVALCANTE" },
            { id: 4, nome: "DRA. CAMILA OLIVEIRA" },
            { id: 5, nome: "DR. DIEGO FERNANDES" },
            { id: 6, nome: "DRA. FABIANA SOUZA" },  
            { id: 7, nome: "DR. GUSTAVO LIMA" },
            { id: 8, nome: "DRA. HELENA RIBEIRO" },
            { id: 9, nome: "DR. IGOR SANTOS" },
          ],
          especialidades: [
            { id: 10, nome: "Clínico Diurno" },
            { id: 11, nome: "Clínico Noturno" },
            { id: 12, nome: "Pediatria Diurno" },
            { id: 13, nome: "Pediatria Noturno" },
            { id: 14, nome: "Emergencista Dia" },
            { id: 15, nome: "Emergencista Noite" },
            { id: 16, nome: "Vistador" },
            { id: 17, nome: "Cinderela" },
          ],
        });
      }
    };
    load();
  }, []);

  const aplicar = async () => {
    setLoading(true);
    setErro("");
    setLinhas([]);
    try {
      const q = new URLSearchParams();
      q.set("periodo", periodo);
      if (periodo === "dia") q.set("dia", dia);
      if (periodo === "mes") q.set("mes", mes);
      if (periodo === "ano") q.set("ano", ano);
      if (especialidadeId) q.set("especialidadeId", especialidadeId);
      if (medicoId) q.set("medicoId", medicoId);

      const url = `${API.consolidado}?${q.toString()}`;
      const r = await fetch(url);
      if (!r.ok) throw new Error("Falha ao consultar consolidado");
      const data = await r.json();
      setLinhas(data.rows ?? []);
    } catch {
      const base = [
        { data: fmt(dia), periodo: "Diurno", especialidade: "Clínico", medico: "DR. ALEXANDRE...", atendimentos: 4 },
        { data: fmt(dia), periodo: "Noturno", especialidade: "Clínico", medico: "DRA. ADRIANA...", atendimentos: 4 },
        { data: fmt(dia), periodo: "Diurno", especialidade: "Pediatria", medico: "DR. ALEXANDRE...", atendimentos: 4 },
        { data: fmt(dia), periodo: "Noturno", especialidade: "Pediatria", medico: "DRA. ADRIANA...", atendimentos: 4 },
        { data: fmt(dia), periodo: "Dia", especialidade: "Emergencista", medico: "—", atendimentos: 1 },
        { data: fmt(dia), periodo: "Noite", especialidade: "Emergencista", medico: "—", atendimentos: 1 },
        { data: fmt(dia), periodo: "Dia", especialidade: "Vistador", medico: "—", atendimentos: 1 },
        { data: fmt(dia), periodo: "Dia", especialidade: "Cinderela", medico: "—", atendimentos: 1 },
        
        
      ];
      setLinhas(base);
      setErro("⚠️ Mostrando dados de demonstração (backend não respondeu).");
    } finally {
      setLoading(false);
    }
  };

  const limpar = () => {
    setPeriodo("dia");
    setDia(dayjs().format("YYYY-MM-DD"));
    setMes(dayjs().format("YYYY-MM"));
    setAno(dayjs().format("YYYY"));
    setEspecialidadeId("");
    setMedicoId("");
    setLinhas([]);
    setErro("");
  };

  // Totais e gráficos
  const totais = useMemo(() => {
    const totalPeriodo = linhas.reduce((acc, l) => acc + Number(l.atendimentos || 0), 0);
    const dias = new Set(linhas.map(l => l.data));
    const mediaDia = dias.size ? (totalPeriodo / dias.size).toFixed(2) : 0;
    const mediaMes = (totalPeriodo / 30).toFixed(2); // aproximado
    const mediaEspecialidade = {};
    linhas.forEach(l => {
      mediaEspecialidade[l.especialidade] = (mediaEspecialidade[l.especialidade] || 0) + Number(l.atendimentos || 0);
    });
    return { totalPeriodo, mediaDia, mediaMes, mediaEspecialidade };
  }, [linhas]);

  const porEspecialidade = useMemo(() => {
    const m = new Map();
    linhas.forEach(l => m.set(l.especialidade, (m.get(l.especialidade) || 0) + Number(l.atendimentos || 0)));
    return [...m.entries()].map(([name, total]) => ({ name, total }));
  }, [linhas]);

  const porMedico = useMemo(() => {
    const m = new Map();
    linhas.forEach(l => m.set(l.medico || "—", (m.get(l.medico || "—") || 0) + Number(l.atendimentos || 0)));
    return [...m.entries()].map(([name, total]) => ({ name, total }));
  }, [linhas]);

  const porPeriodo = useMemo(() => {
    const m = new Map();
    linhas.forEach(l => m.set(l.periodo, (m.get(l.periodo) || 0) + Number(l.atendimentos || 0)));
    return [...m.entries()].map(([name, total]) => ({ name, total }));
  }, [linhas]);

  // Novo: atendimentos por dia
  const porDia = useMemo(() => {
    const m = new Map();
    linhas.forEach(l => m.set(l.data, (m.get(l.data) || 0) + Number(l.atendimentos || 0)));
    return [...m.entries()].map(([name, total]) => ({ name, total }));
  }, [linhas]);

  // Export PDF atualizado
  const exportarPDF = async () => {
    const doc = new jsPDF("p", "mm", "a4");
    const { totalPeriodo, mediaDia, mediaMes, mediaEspecialidade } = totais;

    // Logo
    const logoImg = new Image();
    logoImg.src = LOGO_URL;
    await new Promise(res => { logoImg.onload = res; });
    doc.addImage(logoImg, "PNG", 14, 10, 40, 15);

    // Título
    doc.setFontSize(16);
    doc.text("Relatório de Atendimentos", 60, 16);
    doc.setFontSize(10);
    doc.text(`Data do relatório: ${fmt(new Date())}`, 60, 22);

    // Totais
    let startY = 32;
    doc.setFontSize(12);
    doc.text(`TOTAL DE ATENDIMENTOS: ${totalPeriodo}`, 14, startY);
    startY += 6;
    doc.text(`MÉDIA DIÁRIA: ${mediaDia}`, 14, startY);
    startY += 6;
    doc.text(`MÉDIA MÊS (aprox.): ${mediaMes}`, 14, startY);
    startY += 6;
    doc.text("MÉDIA POR ESPECIALIDADE:", 14, startY);
    startY += 6;
    Object.entries(mediaEspecialidade).forEach(([esp, valor]) => {
      doc.text(`${esp}: ${valor}`, 14, startY);
      startY += 6;
    });

    // Tabela de detalhamento
    doc.autoTable({
      startY,
      head: [["Data", "Período", "Especialidade", "Médico", "Atendimentos"]],
      body: linhas.map(l => [l.data, l.periodo, l.especialidade, l.medico, l.atendimentos]),
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
    });

    // Função para gráficos
    const addGrafico = async (ref, titulo) => {
      if (!ref.current) return;
      const canvas = await html2canvas(ref.current, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      doc.addPage();
      doc.setFontSize(16);
      doc.text(titulo, 14, 16);
      doc.addImage(imgData, "PNG", 15, 25, 180, 100);
    };

    await addGrafico(graficoEspecialidadeRef, "Atendimentos por Especialidade");
    await addGrafico(graficoMedicoRef, "Atendimentos por Médico");
    await addGrafico(graficoPeriodoRef, "Atendimentos por Período");
    await addGrafico(graficoDiaRef, "Atendimentos por Dia");

    doc.save("relatorio_profissional.pdf");
  };

  // Export Excel atualizado
  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(linhas.map(l => ({
      Data: l.data,
      Periodo: l.periodo,
      Especialidade: l.especialidade,
      Medico: l.medico,
      Atendimentos: l.atendimentos,
    })));

    // Adicionando uma aba com resumo
    const resumoWS = XLSX.utils.json_to_sheet([
      { Total_Periodo: totais.totalPeriodo, Media_Dia: totais.mediaDia, Media_Mes: totais.mediaMes },
      ...Object.entries(totais.mediaEspecialidade).map(([esp, valor]) => ({ Especialidade: esp, Total: valor })),
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Detalhamento");
    XLSX.utils.book_append_sheet(wb, resumoWS, "Resumo");
    XLSX.writeFile(wb, "relatorio.xlsx");
  };

  return (
    <div>
      <h2>🔎 Filtros & Consolidados</h2>

      {/* Filtros e totais */}
      <div className="card" style={{ padding: 12, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
          {/* Período */}
          <div>
            <label>Período</label><br />
            <select value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
              <option value="dia">Dia</option>
              <option value="mes">Mês</option>
              <option value="ano">Ano</option>
            </select>
          </div>
          {periodo === "dia" && <div><label>Data</label><br /><input type="date" value={dia} onChange={(e) => setDia(e.target.value)} /></div>}
          {periodo === "mes" && <div><label>Mês</label><br /><input type="month" value={mes} onChange={(e) => setMes(e.target.value)} /></div>}
          {periodo === "ano" && <div><label>Ano</label><br /><input type="number" min="2000" max="2100" value={ano} onChange={(e) => setAno(e.target.value)} style={{ width: 100 }} /></div>}

          {/* Especialidade e médico */}
          <div>
            <label>Especialidade</label><br />
            <select value={especialidadeId} onChange={(e) => setEspecialidadeId(e.target.value)}>
              <option value="">Todas</option>
              {opcoes.especialidades.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <div>
            <label>Médico</label><br />
            <select value={medicoId} onChange={(e) => setMedicoId(e.target.value)}>
              <option value="">Todos</option>
              {opcoes.medicos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={aplicar} disabled={loading}>{loading ? "Carregando..." : "Aplicar"}</button>
            <button onClick={limpar} type="button">Limpar</button>
            <button type="button" onClick={exportarPDF}>PDF</button>
            <button type="button" onClick={exportarExcel}>Excel</button>
          </div>
        </div>

        {erro && <p style={{ color: "#b91c1c", marginTop: 8 }}>{erro}</p>}

        {/* Totais */}
        {linhas.length > 0 && (
          <div style={{ marginTop: 16, padding: 12, border: "1px solid #e5e7eb", borderRadius: 8, background: "#f9fafb" }}>
            <h4>📊 Totais</h4>
            <p>Total no período: {totais.totalPeriodo}</p>
            <p>Média diária: {totais.mediaDia}</p>
            <p>Média mensal (aprox.): {totais.mediaMes}</p>
            <p>Média por especialidade:</p>
            <ul>
              {Object.entries(totais.mediaEspecialidade).map(([esp, valor]) => (
                <li key={esp}>{esp}: {valor}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Tabela */}
      <div ref={tabelaRef} className="card" style={{ padding: 12, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Consolidado</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Data</th>
                <th style={th}>Período</th>
                <th style={th}>Especialidade</th>
                <th style={th}>Médico</th>
                <th style={th}>Atendimentos</th>
              </tr>
            </thead>
            <tbody>
              {linhas.length === 0 && <tr><td colSpan={5} style={{ padding: 12, textAlign: "center" }}>Sem dados</td></tr>}
              {linhas.map((l, i) => <tr key={i}><td style={td}>{l.data}</td><td style={td}>{l.periodo}</td><td style={td}>{l.especialidade}</td><td style={td}>{l.medico}</td><td style={td}>{l.atendimentos}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gráficos */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div ref={graficoEspecialidadeRef}>
          <ChartCard titulo="Atendimentos por Especialidade" data={porEspecialidade} dataKey="total" />
        </div>
        <div ref={graficoMedicoRef}>
          <ChartCard titulo="Atendimentos por Médico" data={porMedico} dataKey="total" />
        </div>
        <div ref={graficoPeriodoRef}>
          <ChartCard titulo="Atendimentos por Período" data={porPeriodo} dataKey="total" />
        </div>
        <div ref={graficoDiaRef}>
          <ChartCard titulo="Atendimentos por Dia" data={porDia} dataKey="total" />
        </div>
      </div>
    </div>
  );
}

const th = { textAlign: "left", padding: 8, background: "#f1f5f9", borderBottom: "1px solid #e5e7eb" };
const td = { padding: 8, borderBottom: "1px solid #e5e7eb" };

const ChartCard = ({ titulo, data, dataKey }) => (
  <div className="card" style={{ padding: 12, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
    <h3 style={{ marginTop: 0 }}>{titulo}</h3>
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey={dataKey} fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);
