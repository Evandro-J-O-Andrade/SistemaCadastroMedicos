import React, { useMemo, useState, useEffect, useRef } from "react";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

import "./Relatorios.css";

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

const CHART_HEIGHT = 200;
const CHART_WIDTH = 300;

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

  const [medicosData, setMedicosData] = useState([]);
  const [plantoes, setPlantoes] = useState([]);
  const [linhas, setLinhas] = useState([]);
  const [gerado, setGerado] = useState(false);

  const relatoriosRef = useRef(null);
  const graficoRefs = useRef({});

  // Puxa médicos cadastrados do localStorage
  useEffect(() => {
    const dados = JSON.parse(localStorage.getItem("medicos") || "[]");
    setMedicosData(Array.isArray(dados) ? dados : []);
  }, []);

  // Puxa plantões do localStorage
  useEffect(() => {
    const dados = JSON.parse(localStorage.getItem("plantaoData") || "[]");
    setPlantoes(Array.isArray(dados) ? dados : []);
  }, []);

  const CORES_ESPECIALIDADE = {
    Emergencista: "#FF0000",
    Pediátrico: "#FFC0CB",
    Clínico: "#09098fff",
    Visitador: "#008000",
    Cinderela: "#800080",
    Fisioterapeuta: "#FFA500",
    Nutricionista: "#00CED1",
  };

  // Filtra e agrupa os dados para o relatório
  const filtrarRelatorio = () => {
    const inicio = new Date(toISO(dataDe, horaDe));
    const fim = new Date(toISO(dataAte, horaAte));
    const nomeBusca = medicoQuery.trim().toLowerCase();
    const crmBusca = crmQuery.trim();

    // Combina dados do plantão com dados do médico
    const dadosCompletos = medicosData.map((m) => {
      const plantao = plantoes.find(
        (p) =>
          p.medico === m.nome &&
          new Date(toISO(p.data || hojeYYYYMMDD(), p.hora || "00:00")) >= inicio &&
          new Date(toISO(p.data || hojeYYYYMMDD(), p.hora || "00:00")) <= fim
      );

      return {
        medico: m.nome,
        crm: m.crm || "—",
        especialidade: m.especialidade || "—",
        data: plantao?.data || "—",
        hora: plantao?.hora || "—",
        turno: plantao?.turno || "—",
        quantidade: plantao?.quantidade || 0,
      };
    });

    // Aplica filtros
    const filtrados = dadosCompletos.filter((p) => {
      const okEsp = !especialidade || p.especialidade.toLowerCase() === especialidade.toLowerCase();
      const okMedico = !nomeBusca || p.medico.toLowerCase().includes(nomeBusca);
      const okCrm = !crmBusca || p.crm.includes(crmBusca);
      const okHorario =
        !horario ||
        (horario === "7h-19h" ? p.turno === "Diurno" : p.turno === "Noturno");

      return okEsp && okMedico && okCrm && okHorario;
    });

    // Agrupa por médico ou especialidade
    const agrupados = new Map();
    filtrados.forEach((p) => {
      const key = visao === "profissional" ? p.medico : p.especialidade;
      const prev = agrupados.get(key) || [];
      agrupados.set(key, [...prev, p]);
    });

    const arr = Array.from(agrupados.entries()).map(([chave, items]) => {
      const total = items.reduce((acc, p) => acc + Number(p.quantidade || 0), 0);
      return { chave, items, total };
    });

    setLinhas(arr);
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

    let yPos = 60;

    for (const grupo of linhas) {
      pdf.setFontSize(14);
      pdf.text(`${visao === "profissional" ? "Médico" : "Especialidade"}: ${grupo.chave}`, margem, yPos);
      yPos += 6;

      const tabela = grupo.items.map((l) => [
        l.medico,
        l.crm || "—",
        l.especialidade,
        l.data,
        l.quantidade,
      ]);

      pdf.autoTable({
        head: [["Médico", "CRM", "Especialidade", "Data", "Total Atendimentos"]],
        body: tabela,
        startY: yPos,
        margin: { left: margem, right: margem },
        headStyles: { fillColor: [22, 160, 133] },
        styles: { fontSize: 10 },
      });

      yPos = pdf.lastAutoTable.finalY + 10;

      const canvasGrafico = graficoRefs.current[grupo.chave]?.querySelector("canvas");
      if (canvasGrafico) {
        const imgData = canvasGrafico.toDataURL("image/png");
        const larguraPdf = pdf.internal.pageSize.getWidth() - 2 * margem;
        const alturaPdf = (canvasGrafico.height * larguraPdf) / canvasGrafico.width;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", margem, 20, larguraPdf, alturaPdf);
        yPos = 10;
      }
    }

    pdf.save(`relatorio_${dayjs().format("YYYYMMDD_HHmm")}.pdf`);
  };

  const exportExcel = () => {
    const dados = [];
    linhas.forEach((grupo) => {
      grupo.items.forEach((l) => {
        dados.push({
          Médico: l.medico,
          CRM: l.crm || "—",
          Especialidade: l.especialidade,
          Data: l.data,
          "Total Atendimentos": l.quantidade,
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, `relatorio_${dayjs().format("YYYYMMDD_HHmm")}.xlsx`);
  };

  const gerarChartData = (grupo) => {
    const labels = grupo.items.map((i) => i.medico);
    const valores = grupo.items.map((i) => i.quantidade);

    const backgroundColors = labels.map((label) => {
      if (visao === "especialidade") return CORES_ESPECIALIDADE[label] || "#808080";
      return "#36A2EB";
    });

    return {
      labels,
      datasets: [
        {
          label: visao === "especialidade" ? "Atendimentos por Especialidade" : "Atendimentos por Profissional",
          data: valores,
          fill: tipoGrafico === "area",
          backgroundColor: tipoGrafico === "linha" ? "transparent" : backgroundColors,
          borderColor: backgroundColors,
          borderWidth: 2,
          tension: tipoGrafico === "linha" || tipoGrafico === "area" ? 0.4 : 0,
        },
      ],
    };
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
              {[...new Set(medicosData.map((m) => m.especialidade))].map((esp) => (
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
              onChange={(e) => {
                setMedicoQuery(e.target.value);
                const medicoEncontrado = medicosData.find(
                  (m) => m.nome.toLowerCase() === e.target.value.toLowerCase()
                );
                if (medicoEncontrado) {
                  setCrmQuery(medicoEncontrado.crm || "");
                }
              }}
              placeholder="Todos"
            />
            <datalist id="medicos">
              {medicosData.map((m) => (
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
              placeholder="Digite ou selecione um médico"
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
          <button onClick={filtrarRelatorio}>Gerar Relatório</button>
          <button onClick={limpar}>Limpar</button>
          <button onClick={gerarPDF}>PDF</button>
          <button onClick={exportExcel}>Excel</button>
        </div>
      </section>

      {/* CARDS E GRÁFICOS */}
      {gerado && linhas.length === 0 && <p>Sem dados para este filtro.</p>}

      {visao === "profissional" ? (
        <div className="cards-profissionais">
          {linhas.map((grupo) => (
            <div key={grupo.chave} className="relatorios-tabela card">
              <h3>Médico: {grupo.chave}</h3>
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
                  {grupo.items.map((l, i) => (
                    <tr key={i}>
                      <td>{l.medico}</td>
                      <td>{l.crm || "—"}</td>
                      <td>{l.especialidade}</td>
                      <td>{l.data}</td>
                      <td>{l.quantidade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : (
        <div className="graficos">
          {linhas.map((grupo) => (
            <div key={grupo.chave} className="relatorios-tabela card" ref={(el) => (graficoRefs.current[grupo.chave] = el)}>
              <h3>Especialidade: {grupo.chave}</h3>
              <div className="relatorios-grafico">
                {tipoGrafico === "pizza" && <GraficoPizza data={gerarChartData(grupo)} height={CHART_HEIGHT} width={CHART_WIDTH} />}
                {tipoGrafico === "barra" && <GraficoBarra data={gerarChartData(grupo)} height={CHART_HEIGHT} width={CHART_WIDTH} />}
                {tipoGrafico === "linha" && <GraficoLinha data={gerarChartData(grupo)} height={CHART_HEIGHT} width={CHART_WIDTH} />}
                {tipoGrafico === "area" && <GraficoArea data={gerarChartData(grupo)} height={CHART_HEIGHT} width={CHART_WIDTH} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
