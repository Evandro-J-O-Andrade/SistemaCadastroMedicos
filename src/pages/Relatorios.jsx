import React, { useMemo, useState, useRef } from "react";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

import "./Relatorios.css";
import medicos from "./MedicosData";

import GraficoBarra from "./GraficoBarra";
import GraficoPizza from "./GraficoPizza";
import GraficoLinha from "./GraficoLinha";
import GraficoArea from "./GraficoArea";

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

const CORES_ESPECIALIDADE = {
  Emergencista: "#FF0000",
  Pediátrico: "#FFC0CB",
  Clínico: "#09098fff",
  Visitador: "#008000",
  Cinderela: "#800080",
  Fisioterapeuta: "#FFA500",
  Nutricionista: "#00CED1",
};

const CHART_HEIGHT = 400;
const CHART_WIDTH = 600;

const hojeYYYYMMDD = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const toISO = (date, time) => `${date}T${time}:00`;

export default function Relatorios({ usuarioAtual, empresaAtual }) {
  const [dataDe, setDataDe] = useState(hojeYYYYMMDD());
  const [horaDe, setHoraDe] = useState("07:00");
  const [dataAte, setDataAte] = useState(hojeYYYYMMDD());
  const [horaAte, setHoraAte] = useState("19:00");
  const [especialidade, setEspecialidade] = useState("");
  const [horario, setHorario] = useState("");
  const [medicoQuery, setMedicoQuery] = useState("");
  const [crmQuery, setCrmQuery] = useState("");
  const [tipoGrafico, setTipoGrafico] = useState("pizza");
  const [visao, setVisao] = useState("profissional");
  const [plantoes, setPlantoes] = useState([]);
  const [carregado, setCarregado] = useState(false);
  const [linhas, setLinhas] = useState([]);
  const [gerado, setGerado] = useState(false);

  const relatoriosRef = useRef(null);
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
    const crmBusca = crmQuery.trim();

    const filtrados = plantoes.filter((p) => {
      const data = p.data || hojeYYYYMMDD();
      const hora = p.horaInicio || "00:00";
      const dt = new Date(toISO(data, hora));

      const okPeriodo = dt >= inicio && dt <= fim;
      const okEsp = !especialidade || (p.especialidade || "").toLowerCase() === especialidade.toLowerCase();
      const okMedico = !nomeBusca || (p.medico || "").toLowerCase().includes(nomeBusca);
      const okCrm =
        !crmBusca ||
        (p.crm || medicos.find((m) => m.nome === p.medico)?.crm || "").includes(crmBusca);
      const okHorario = !horario || (horario === "7h-19h" ? p.turno === "Diurno" : p.turno === "Noturno");

      return okPeriodo && okEsp && okMedico && okCrm && okHorario;
    });

    const mapa = new Map();
    filtrados.forEach((p) => {
      const q = Number(p.quantidade || p.atendimentos || 0);
      const key = `${p.medico || "—"}||${p.especialidade || "—"}||${p.data}`;
      mapa.set(key, (mapa.get(key) || 0) + q);
    });

    const arr = Array.from(mapa.entries()).map(([k, total]) => {
      const [med, esp, data] = k.split("||");
      const crm =
        filtrados.find((f) => f.medico === med)?.crm ||
        medicos.find((m) => m.nome === med)?.crm ||
        "—";
      return { medico: med, especialidade: esp, data, total, crm };
    });

    arr.sort((a, b) => b.total - a.total);
    setLinhas(arr);
    setGerado(true);
  };

  const gerarRelatorioFake = () => {
    if (!carregado) carregarProfissionais();

    const fake = [];
    medicos.forEach((medico) => {
      ESPECIALIDADES.forEach((esp) => {
        const total = Math.floor(Math.random() * 10) + 1;
        const turno = Math.random() > 0.5 ? "Diurno" : "Noturno";
        const crmFake = medico.crm || String(Math.floor(Math.random() * 900000) + 100000);
        fake.push({
          medico: medico.nome,
          especialidade: esp,
          data: hojeYYYYMMDD(),
          total,
          turno,
          crm: crmFake,
        });
      });
    });

    setLinhas(fake);
    setGerado(true);
  };

  const limpar = () => {
    setEspecialidade("");
    setVisao("profissional");
    setTipoGrafico("pizza");
    setMedicoQuery("");
    setCrmQuery("");
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

  const chartData = useMemo(() => {
    const backgroundColors = labels.map((label) => {
      if (visao === "especialidade") return CORES_ESPECIALIDADE[label] || "#808080";
      return "#36A2EB";
    });

    return {
      labels,
      datasets: [
        {
          label:
            visao === "especialidade"
              ? "Atendimentos por Especialidade"
              : "Atendimentos por Profissional",
          data: valores,
          fill: tipoGrafico === "area",
          backgroundColor: tipoGrafico === "linha" ? "transparent" : backgroundColors,
          borderColor: backgroundColors,
          borderWidth: 2,
          tension: tipoGrafico === "linha" || tipoGrafico === "area" ? 0.4 : 0,
        },
      ],
    };
  }, [labels, valores, visao, tipoGrafico]);

  const empty = gerado && linhas.length === 0;

  const gerarPDF = async () => {
    if (!linhas || linhas.length === 0) return alert("Não há dados para gerar o PDF.");

    const pdf = new jsPDF("p", "mm", "a4");
    const margem = 10;

    const usuarioLogado = usuarioAtual?.nome || "Usuário";
    const empresa = {
      nome: empresaAtual?.nome || "Instituto Alpha Para Medicina",
      cnpj: empresaAtual?.cnpj || "12.345.678/0001-99",
      logo: empresaAtual?.logo || "../img/Logo_Alpha.png",
    };

    const carregarLogoBase64 = async (url) => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Logo não encontrada");
        const blob = await res.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (err) {
        console.error("Erro ao carregar logo:", err);
        return null;
      }
    };

    const logoBase64 = await carregarLogoBase64(empresa.logo);

    if (logoBase64) pdf.addImage(logoBase64, "PNG", margem, 10, 40, 20);

    pdf.setFontSize(16);
    pdf.text(empresa.nome, margem + 50, 20);
    pdf.setFontSize(12);
    pdf.text(`CNPJ: ${empresa.cnpj}`, margem + 50, 28);
    pdf.text(`Usuário: ${usuarioLogado}`, margem + 50, 36);
    pdf.text(`Período: ${dataDe} ${horaDe} até ${dataAte} ${horaAte}`, margem, 50);
    pdf.text(`Gerado em: ${dayjs().format("DD/MM/YYYY HH:mm")}`, margem, 56);

    const tabela = linhas.map((l) => [l.medico, l.crm || "—", l.especialidade, l.data, l.total]);
    pdf.autoTable({
      head: [["Médico", "CRM", "Especialidade", "Data", "Total Atendimentos"]],
      body: tabela,
      startY: 60,
      margin: { left: margem, right: margem },
      headStyles: { fillColor: [22, 160, 133] },
      styles: { fontSize: 10 },
    });

    const total = linhas.reduce((acc, l) => acc + Number(l.total), 0);
    pdf.setFontSize(12);
    pdf.text(`Total de atendimentos: ${total}`, margem, pdf.lastAutoTable.finalY + 10);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const canvasGrafico =
      graficoRef.current?.querySelector("canvas") || document.querySelector(".relatorios-grafico canvas");
    if (canvasGrafico) {
      const imgData = canvasGrafico.toDataURL("image/png");
      const yPos = pdf.lastAutoTable.finalY + 20;
      const larguraPdf = pdf.internal.pageSize.getWidth() - 2 * margem;
      const alturaPdf = (canvasGrafico.height * larguraPdf) / canvasGrafico.width;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", margem, yPos, larguraPdf, alturaPdf);
    } else {
      console.warn("Canvas do gráfico não encontrado.");
    }

    pdf.save(`relatorio_${dayjs().format("YYYYMMDD_HHmm")}.pdf`);
  };

  const exportExcel = (linhas) => {
    const ws = XLSX.utils.json_to_sheet(
      linhas.map((l) => ({
        Médico: l.medico,
        CRM: l.crm || "—",
        Especialidade: l.especialidade,
        Data: l.data,
        "Total Atendimentos": l.total,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, `relatorio_${dayjs().format("YYYYMMDD_HHmm")}.xlsx`);
  };

  return (
    <div className="relatorios-wrap" ref={relatoriosRef}>
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
              <option value="7h-19h">7h - 19h</option>
              <option value="19h-7h">19h - 7h</option>
            </select>
          </div>
        </div>

        <div className="grid-3">
          <div className="field">
            <label>Especialidade:</label>
            <select value={especialidade} onChange={(e) => setEspecialidade(e.target.value)}>
              <option value="">Todas</option>
              {ESPECIALIDADES.map((esp) => (
                <option key={esp} value={esp}>
                  {esp}
                </option>
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
            <label>CRM:</label>
            <input
              type="text"
              value={crmQuery}
              onChange={(e) => setCrmQuery(e.target.value)}
              placeholder="Todos"
            />
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
          <button onClick={gerarPDF}>PDF</button>
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
                <th>CRM</th>
                <th>Especialidade</th>
                <th>Data</th>
                <th>Total Atendimentos</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l, i) => (
                <tr key={i}>
                  <td>{l.medico}</td>
                  <td>{l.crm || "—"}</td>
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
          <div className="total-atendimentos">
            Total de atendimentos: {valores.reduce((a, b) => a + b, 0)}
          </div>
          {tipoGrafico === "pizza" && <GraficoPizza data={chartData} height={CHART_HEIGHT} width={CHART_WIDTH} />}
          {tipoGrafico === "barra" && <GraficoBarra data={chartData} height={CHART_HEIGHT} width={CHART_WIDTH} />}
          {tipoGrafico === "linha" && <GraficoLinha data={chartData} height={CHART_HEIGHT} width={CHART_WIDTH} />}
          {tipoGrafico === "area" && <GraficoArea data={chartData} height={CHART_HEIGHT} width={CHART_WIDTH} />}
        </section>
      )}
    </div>
  );
}
