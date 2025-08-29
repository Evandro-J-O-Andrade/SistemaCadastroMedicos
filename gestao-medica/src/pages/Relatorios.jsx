import React, { useMemo, useState, useRef } from "react";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { Pie, Bar, Line } from "react-chartjs-2";
import "./Relatorios.css";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  ArcElement,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

import GraficoBarra from "./GraficoBarra";
import GraficoPizza from "./GraficoPizza";
import GraficoLinha from "./GraficoLinha";
import GraficoArea from "./GraficoArea";
import medicos from "./MedicosData";

ChartJS.register(
  CategoryScale,
  LinearScale,
  ArcElement,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

dayjs.locale("pt-br");

const ESPECIALIDADES = [
  "Clínico",
  "Pediátrico",
  "Emergencista",
  "Cinderela",
  "Visitador",
  "Fisioterapeuta",
  "Nutricionista",
];

const hojeYYYYMMDD = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const toISO = (date, time) => `${date}T${time}:00`;

export default function Relatorios() {
  const [dataDe, setDataDe] = useState(hojeYYYYMMDD());
  const [horaDe, setHoraDe] = useState("07:00");
  const [dataAte, setDataAte] = useState(hojeYYYYMMDD());
  const [horaAte, setHoraAte] = useState("19:00");
  const [especialidade, setEspecialidade] = useState(""); 
  const [horario, setHorario] = useState(""); 
  const [medicoQuery, setMedicoQuery] = useState(""); 
  const [tipoGrafico, setTipoGrafico] = useState("pizza"); 
  const [visao, setVisao] = useState("profissional"); 
  const [plantoes, setPlantoes] = useState([]);
  const [carregado, setCarregado] = useState(false);
  const [linhas, setLinhas] = useState([]);
  const [gerado, setGerado] = useState(false);

  const graficoRef = useRef(null);

  const carregarProfissionais = () => {
    try {
      const raw = localStorage.getItem("plantaoData");
      const arr = raw ? JSON.parse(raw) : [];
      setPlantoes(Array.isArray(arr) ? arr : []);
      setCarregado(true);
      setGerado(false);
    } catch {
      setPlantoes([]);
      setCarregado(true);
      setGerado(false);
    }
  };

  const gerarRelatorio = () => {
    if (!carregado) carregarProfissionais();

    const inicio = new Date(toISO(dataDe, horaDe));
    const fim = new Date(toISO(dataAte, horaAte));
    const nomeBusca = medicoQuery.trim().toLowerCase();

    const filtrados = plantoes.filter((p) => {
      const data = p.data || hojeYYYYMMDD();
      const hora = p.horaInicio || "00:00";
      const dt = new Date(toISO(data, hora));

      const okPeriodo = dt >= inicio && dt <= fim;
      const okEsp = !especialidade || (p.especialidade || "").toLowerCase() === especialidade.toLowerCase();
      const okMedico = !nomeBusca || (p.medico || "").toLowerCase().includes(nomeBusca);
      const okHorario = !horario || (horario === "7-19" ? p.turno === "Diurno" : p.turno === "Noturno");

      return okPeriodo && okEsp && okMedico && okHorario;
    });

    const mapa = new Map();
    filtrados.forEach((p) => {
      const q = Number(p.quantidade || p.atendimentos || 0);
      const key = `${p.medico || "—"}||${p.especialidade || "—"}||${p.data}`;
      mapa.set(key, (mapa.get(key) || 0) + q);
    });

    const arr = Array.from(mapa.entries()).map(([k, total]) => {
      const [med, esp, data] = k.split("||");
      return { medico: med, especialidade: esp, data, total };
    });

    arr.sort((a, b) => b.total - a.total);
    setLinhas(arr);
    setGerado(true);
  };

  // ======= RELATÓRIO FAKE =======
  const gerarRelatorioFake = () => {
    if (!carregado) carregarProfissionais();

    const fake = [];
    medicos.forEach((medico) => {
      ESPECIALIDADES.forEach((esp) => {
        const total = Math.floor(Math.random() * 10) + 1; // 1 a 10 atendimentos
        const turno = Math.random() > 0.5 ? "Diurno" : "Noturno";
        fake.push({
          medico: medico.nome,
          especialidade: esp,
          data: hojeYYYYMMDD(),
          total,
          turno,
        });
      });
    });

    setLinhas(fake);
    setGerado(true);
  };
  // =====================================

  const limpar = () => {
    setEspecialidade("");
    setVisao("profissional");
    setTipoGrafico("pizza");
    setMedicoQuery("");
    setHorario("");
    setLinhas([]);
    setGerado(false);
  };

  const { labels, valores } = useMemo(() => {
    if (!gerado || linhas.length === 0) return { labels: [], valores: [] };

    if (visao === "especialidade") {
      const m = new Map();
      linhas.forEach((l) => m.set(l.especialidade, (m.get(l.especialidade) || 0) + l.total));
      return { labels: Array.from(m.keys()), valores: Array.from(m.values()) };
    } else {
      const m = new Map();
      linhas.forEach((l) => m.set(l.medico, (m.get(l.medico) || 0) + l.total));
      return { labels: Array.from(m.keys()), valores: Array.from(m.values()) };
    }
  }, [linhas, visao, gerado]);

  const chartData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: visao === "especialidade" ? "Atendimentos por Especialidade" : "Atendimentos por Profissional",
          data: valores,
          fill: tipoGrafico === "area",
        },
      ],
    }),
    [labels, valores, visao, tipoGrafico]
  );

  const empty = gerado && linhas.length === 0;

  return (
    <div className="relatorios-wrap">
      <header className="relatorios-header">
        <h1>DASHBOARD DE GESTÃO DE PRODUTIVIDADE MÉDICA</h1>
      </header>

      {/* CONTROLES */}
      <section className="relatorios-controles card">
        <div className="grid-3">
          <div className="field">
            <label>Data/Hora Inicial:</label>
            <input type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} />
            <input type="time" value={horaDe} onChange={(e) => setHoraDe(e.target.value)} />
          </div>
          <div className="field">
            <label>Data/Hora Final:</label>
            <input type="date" value={dataAte} onChange={(e) => setDataAte(e.target.value)} />
            <input type="time" value={horaAte} onChange={(e) => setHoraAte(e.target.value)} />
          </div>
          <div className="field">
            <label>Horário do Plantão:</label>
            <select value={horario} onChange={(e) => setHorario(e.target.value)}>
              <option value="">Todos</option>
              <option value="7-19">7h - 19h</option>
              <option value="19-7">19h - 7h</option>
            </select>
          </div>
        </div>

        <div className="grid-3">
          <div className="field">
            <label>Especialidade:</label>
            <select value={especialidade} onChange={(e) => setEspecialidade(e.target.value)}>
              <option value="">Todas</option>
              {ESPECIALIDADES.map((esp) => (
                <option key={esp} value={esp}>{esp}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Médico:</label>
            <input
              list="medicos"
              value={medicoQuery}
              onChange={(e) => setMedicoQuery(e.target.value)}
              style={{ width: "100%" }}
              placeholder="Todos"
            />
            <datalist id="medicos">
              {medicos.map((m) => (
                <option key={m.id} value={m.nome} />
              ))}
            </datalist>
          </div>
          <div className="field">
            <label>Visão:</label>
            <select value={visao} onChange={(e) => setVisao(e.target.value)}>
              <option value="profissional">Profissional</option>
              <option value="especialidade">Especialidade</option>
            </select>
          </div>
          <div className="field">
            <label>Tipo de Gráfico:</label>
            <select value={tipoGrafico} onChange={(e) => setTipoGrafico(e.target.value)}>
              <option value="pizza">Pizza</option>
              <option value="barra">Barra</option>
              <option value="linha">Linha</option>
              <option value="area">Área</option>
            </select>
          </div>
        </div>

        <div className="grid-3" style={{ marginTop: 12 }}>
          <button onClick={gerarRelatorio}>Gerar Relatório</button>
          <button onClick={limpar}>Limpar</button>
          <button onClick={() => exportPDF(chartData, linhas)}>PDF</button>
          <button onClick={() => exportExcel(linhas)}>Excel</button>
          <button onClick={gerarRelatorioFake}>Relatório Fake</button>
        </div>
      </section>

      {/* TABELA */}
      {empty && <p>Sem dados para este filtro.</p>}
      {linhas.length > 0 && (
        <section className="relatorios-tabela card">
          <table>
            <thead>
              <tr>
                <th>Médico</th>
                <th>Especialidade</th>
                <th>Data</th>
                <th>Total Atendimentos</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l, i) => (
                <tr key={i}>
                  <td>{l.medico}</td>
                  <td>{l.especialidade}</td>
                  <td>{l.data}</td>
                  <td>{l.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

     {/* GRÁFICO */}
{linhas.length > 0 && (
  <section className="relatorios-grafico card" ref={graficoRef}>
    <div className="tipo-grafico-select">
      <label>Tipo de Gráfico:</label>
      <select value={tipoGrafico} onChange={(e) => setTipoGrafico(e.target.value)}>
        <option value="pizza">Pizza</option>
        <option value="barra">Barra</option>
        <option value="linha">Linha</option>
        <option value="area">Área</option>
      </select>
    </div>

    <div className="total-atendimentos">
      Total de atendimentos: {valores.reduce((a, b) => a + b, 0)}
    </div>

    {tipoGrafico === "pizza" && <GraficoPizza data={chartData} />}
    {tipoGrafico === "barra" && <GraficoBarra data={chartData} />}
    {tipoGrafico === "linha" && <GraficoLinha data={chartData} />}
    {tipoGrafico === "area" && <GraficoArea data={chartData} />}
  </section>
)}
    </div>
  );
}

// Funções de export
const exportPDF = async (chartData, linhas) => {
  const doc = new jsPDF("p", "mm", "a4");
  doc.text("Relatório de Atendimentos", 14, 16);
  doc.autoTable({
    startY: 24,
    head: [["Médico", "Especialidade", "Data", "Total Atendimentos"]],
    body: linhas.map((l) => [l.medico, l.especialidade, l.data, l.total]),
  });
  doc.save("relatorio.pdf");
};

const exportExcel = (linhas) => {
  const ws = XLSX.utils.json_to_sheet(linhas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Relatório");
  XLSX.writeFile(wb, "relatorio.xlsx");
};
