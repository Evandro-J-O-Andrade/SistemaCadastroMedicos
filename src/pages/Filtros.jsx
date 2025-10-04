import React, { useEffect, useMemo, useState, useRef } from "react";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import LogoAlpha from "../img/Logo_Alpha.png";
import GraficoBarra from "./GraficoBarra.jsx";
import GraficoPizza from "./GraficoPizza.jsx";
import GraficoLinha from "./GraficoLinha.jsx";
import GraficoArea from "./GraficoArea.jsx";
import { especialidades as especialidadesList, getEspecialidadeInfo } from "../api/especialidades.js";

dayjs.locale("pt-br");
const fmt = (d) => dayjs(d).format("DD/MM/YYYY");

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
    try {
      const medicos = JSON.parse(localStorage.getItem("medicos")) || [];
      setOpcoes({
        medicos,
        especialidades: especialidadesList || [],
      });
    } catch {
      setOpcoes({ medicos: [], especialidades: especialidadesList || [] });
    }

    const atendimentos = JSON.parse(localStorage.getItem("atendimentos")) || [];
    setLinhas(atendimentos);
  }, []);

  const aplicar = () => {
    setLoading(true);
    setErro("");
    const data = JSON.parse(localStorage.getItem("atendimentos")) || [];
    if (!data.length) {
      setLinhas([]);
      setErro("⚠️ Nenhum atendimento registrado para este período.");
      setLoading(false);
      return;
    }

    let filtrado = [...data];

    // Filtra por período
    if (periodo === "dia") filtrado = filtrado.filter(l => l.data === dia);
    if (periodo === "mes") filtrado = filtrado.filter(l => l.data.startsWith(mes));
    if (periodo === "ano") filtrado = filtrado.filter(l => l.data.startsWith(ano));

    const nomeEsp = especialidadeId ? getEspecialidadeInfo(especialidadeId)?.nome : "";
    const nomeMed = medicoId ? opcoes.medicos.find(m => m.id === medicoId)?.nome : "";

    // Lógica combinada de filtros
    if (nomeEsp && nomeMed) {
      // Especialidade + Médico
      filtrado = filtrado.filter(l => l.especialidade === nomeEsp && l.medico === nomeMed);
    } else if (nomeEsp && !nomeMed) {
      // Apenas especialidade
      filtrado = filtrado.filter(l => l.especialidade === nomeEsp);
    } else if (!nomeEsp && nomeMed) {
      // Apenas médico
      filtrado = filtrado.filter(l => l.medico === nomeMed);
    }
    // else -> tudo vazio = traz todos

    setLinhas(filtrado);
    if (!filtrado.length) setErro("⚠️ Nenhum atendimento encontrado com os filtros aplicados.");
    setLoading(false);
  };

  const limpar = () => {
    setPeriodo("dia");
    setDia(dayjs().format("YYYY-MM-DD"));
    setMes(dayjs().format("YYYY-MM"));
    setAno(dayjs().format("YYYY"));
    setEspecialidadeId("");
    setMedicoId("");
    setLinhas(JSON.parse(localStorage.getItem("atendimentos")) || []);
    setErro("");
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

  const porEspecialidade = useMemo(() => {
    const m = new Map();
    linhas.forEach(l => m.set(l.especialidade, (m.get(l.especialidade) || 0) + Number(l.atendimentos || 0)));
    return [...m.entries()].map(([name, total]) => {
      const info = especialidadesList.find(e => e.nome === name) || {};
      return { name, total, color: info.cor || "#3b82f6" };
    });
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

  const porDia = useMemo(() => {
    const m = new Map();
    linhas.forEach(l => m.set(l.data, (m.get(l.data) || 0) + Number(l.atendimentos || 0)));
    return [...m.entries()].map(([name, total]) => ({ name, total }));
  }, [linhas]);

  const exportarPDF = async () => {
    const doc = new jsPDF("p", "mm", "a4");
    const { totalPeriodo, mediaDia, mediaMes, mediaEspecialidade } = totais;

    const logoImg = new Image();
    logoImg.src = LogoAlpha;
    await new Promise(res => { logoImg.onload = res; });
    doc.addImage(logoImg, "PNG", 14, 10, 40, 15);

    doc.setFontSize(16);
    doc.text("Relatório de Atendimentos", 60, 16);
    doc.setFontSize(10);
    doc.text(`Data do relatório: ${fmt(new Date())}`, 60, 22);

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

    doc.autoTable({
      startY,
      head: [["Data", "Período", "Especialidade", "Médico", "Atendimentos"]],
      body: linhas.map(l => [l.data, l.periodo, l.especialidade, l.medico, l.atendimentos]),
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
    });

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

  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(linhas.map(l => ({
      Data: l.data,
      Periodo: l.periodo,
      Especialidade: l.especialidade,
      Medico: l.medico,
      Atendimentos: l.atendimentos,
    })));

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

      {/* Filtros */}
      <div className="card" style={{ padding: 12, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
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
            <button onClick={limpar}>Limpar</button>
            <button onClick={exportarPDF}>PDF</button>
            <button onClick={exportarExcel}>Excel</button>
          </div>
        </div>
        {erro && <p style={{ color: "#b91c1c", marginTop: 8 }}>{erro}</p>}
      </div>

      {/* Totais & Médias */}
      {linhas.length > 0 && (
        <div className="card" style={{ padding: 12, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, marginBottom: 16 }}>
          <h3>📊 Totais & Médias</h3>
          <p><strong>Total de Atendimentos:</strong> {totais.totalPeriodo}</p>
          <p><strong>Média Diária:</strong> {totais.mediaDia}</p>
          <p><strong>Média Mensal (aprox.):</strong> {totais.mediaMes}</p>
          <p><strong>Média por Especialidade:</strong></p>
          <ul>
            {Object.entries(totais.mediaEspecialidade).map(([esp, valor]) => (
              <li key={esp}>{esp}: {valor}</li>
            ))}
          </ul>
        </div>
      )}

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
              {linhas.map((l, i) => (
                <tr key={i}>
                  <td style={td}>{l.data}</td>
                  <td style={td}>{l.periodo}</td>
                  <td style={td}>{l.especialidade}</td>
                  <td style={td}>{l.medico}</td>
                  <td style={td}>{l.atendimentos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gráficos */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div ref={graficoEspecialidadeRef}>
          <ChartCard titulo="Atendimentos por Especialidade" data={porEspecialidade} dataKey="total" useColor />
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

const ChartCard = ({ titulo, data, dataKey, useColor = false }) => (
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
          <Bar dataKey={dataKey} fill="#3b82f6">
            {data.map((entry, index) => (
              <cell key={`cell-${index}`} fill={useColor ? entry.color : "#3b82f6"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);
