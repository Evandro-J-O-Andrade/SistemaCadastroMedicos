import React, { useState, useEffect, useRef } from "react";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import Chart from "chart.js/auto";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import GraficoBarra from "./GraficoBarra.jsx";
import GraficoPizza from "./GraficoPizza.jsx";
import GraficoLinha from "./GraficoLinha.jsx";
import GraficoArea from "./GraficoArea.jsx";
import "./Relatorios.css";

dayjs.locale("pt-br");

export default function Relatorios() {
  const hoje = dayjs().format("YYYY-MM-DD");

  const [plantoes, setPlantoes] = useState([]);
  const [medicosData, setMedicosData] = useState([]);

  const [medicoQuery, setMedicoQuery] = useState("");
  const [crmQuery, setCrmQuery] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [dataDe, setDataDe] = useState(hoje);
  const [horaDe, setHoraDe] = useState("07:00");
  const [dataAte, setDataAte] = useState(hoje);
  const [horaAte, setHoraAte] = useState("19:00");
  const [visao, setVisao] = useState("profissional");
  const [tipoGrafico, setTipoGrafico] = useState("barra");
  const [linhas, setLinhas] = useState([]);
  const [gerado, setGerado] = useState(false);
  const [mostrarListaMedicos, setMostrarListaMedicos] = useState(false);
  const [ordem, setOrdem] = useState("alfabetica");

  const [mensagemGlobal, setMensagemGlobal] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState(""); // 'erro' ou 'sucesso'

  const graficoRefs = useRef({});
  const inputRef = useRef();

  const CORES_ESPECIALIDADE = {
    Emergencista: "#FF0000",
    Pediátrico: "#FFC0CB",
    Clínico: "#09098f",
    Visitador: "#008000",
    Cinderela: "#800080",
    Fisioterapeuta: "#FFA500",
    Nutricionista: "#00CED1",
  };

  const normalizeString = (str) => {
    if (!str) return "";
    return str.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  useEffect(() => {
    const dadosMedicos = JSON.parse(localStorage.getItem("medicos") || "[]");
    setMedicosData(Array.isArray(dadosMedicos) ? dadosMedicos : []);

    const dadosPlantoes = JSON.parse(localStorage.getItem("plantaoData") || "[]");
    setPlantoes(Array.isArray(dadosPlantoes) ? dadosPlantoes : []);
  }, []);

  const parsePlantaoDate = (dataStr, horaStr) => {
    if (!dataStr) return null;
    if (dataStr.includes("-")) return new Date(`${dataStr}T${horaStr || "00:00"}`);
    const [dia, mes, ano] = dataStr.split("/");
    return new Date(`${ano}-${mes}-${dia}T${horaStr || "00:00"}`);
  };

  const filtrarRelatorio = () => {
    setMensagemGlobal(""); // limpa mensagem anterior

    // Se filtro de médico preenchido e não encontrado mostra aviso
    if (medicoQuery.trim()) {
      const encontrouMedico = medicosData.some(
        (m) => normalizeString(m.nome) === normalizeString(medicoQuery.trim())
      );
      if (!encontrouMedico) {
        setMensagemGlobal("⚠️ Médico não encontrado no sistema.");
        setTipoMensagem("erro");
        setLinhas([]);
        setGerado(false);
        return;
      }
    }

    const nomeBusca = medicoQuery.trim().toLowerCase();
    const crmBusca = crmQuery.trim();

    const dadosCompletos = plantoes.map((p) => {
      const medico = medicosData.find((m) => m.nome === p.nome);
      return {
        medico: p.nome,
        crm: medico?.crm || "—",
        especialidade: medico?.especialidade || "—",
        data: p.data,
        hora: p.hora,
        turno: p.turno || "—",
        quantidade: Number(p.quantidade) || 0,
      };
    });

    const inicio = parsePlantaoDate(dataDe || hoje, horaDe || "07:00");
    const fim = parsePlantaoDate(dataAte || hoje, horaAte || "19:00");

    let filtrados = dadosCompletos.filter((p) => {
      const okEsp = !especialidade || p.especialidade.toLowerCase() === especialidade.toLowerCase();
      const okMed = !nomeBusca || p.medico.toLowerCase().includes(nomeBusca);
      const okCrm = !crmBusca || p.crm.includes(crmBusca);
      const registro = parsePlantaoDate(p.data, p.hora);

      if (!registro) return false;

      let okDataHora = false;
      if (horaDe === "07:00" && horaAte === "19:00") {
        okDataHora = registro >= inicio && registro <= fim;
      } else if (horaDe === "19:00" && horaAte === "07:00") {
        const horaRegistro = registro.getHours() * 60 + registro.getMinutes();
        const limInicio = 19 * 60;
        const limFim = 7 * 60;

        const dataRegistro = new Date(registro);
        dataRegistro.setHours(0, 0, 0, 0);

        if (registro >= inicio && horaRegistro >= limInicio) {
          okDataHora = true;
        } else {
          const inicioDiaSeguinte = new Date(dataRegistro);
          inicioDiaSeguinte.setDate(inicioDiaSeguinte.getDate() + 1);
          inicioDiaSeguinte.setHours(0, 0, 0, 0);
          const fimTurno = new Date(inicioDiaSeguinte);
          fimTurno.setHours(7, 0, 0, 0);
          if (registro >= inicioDiaSeguinte && registro <= fimTurno && horaRegistro <= limFim) {
            okDataHora = true;
          }
        }
      } else {
        okDataHora = registro >= inicio && registro <= fim;
      }

      return okEsp && okMed && okCrm && okDataHora;
    });

    if (filtrados.length === 0) {
      setMensagemGlobal("⚠️ Nenhum dado encontrado com os filtros selecionados.");
      setTipoMensagem("erro");
      setLinhas([]);
      setGerado(false);
      return;
    } else {
      setMensagemGlobal("");
    }

    if (ordem === "alfabetica") {
      filtrados.sort((a, b) => a.medico.localeCompare(b.medico));
    } else if (ordem === "ultimo") {
      filtrados.sort((a, b) => parsePlantaoDate(b.data, b.hora) - parsePlantaoDate(a.data, a.hora));
    }

    const agrupados = {};
    filtrados.forEach((p) => {
      const chavePrincipal = visao === "profissional" ? p.medico : p.especialidade;
      if (!agrupados[chavePrincipal]) agrupados[chavePrincipal] = {};
      const mesAno = dayjs(p.data, ["YYYY-MM-DD", "DD/MM/YYYY"]).format("MM/YYYY");
      if (!agrupados[chavePrincipal][mesAno]) agrupados[chavePrincipal][mesAno] = [];
      agrupados[chavePrincipal][mesAno].push(p);
    });

    const linhasAgrupadas = Object.keys(agrupados).map((chave) => {
      const meses = Object.keys(agrupados[chave]).map((mes) => {
        const totalMes = agrupados[chave][mes].reduce((acc, p) => acc + Number(p.quantidade), 0);
        return { mes, totalMes, items: agrupados[chave][mes] };
      });
      return { chave, meses };
    });

    setLinhas(linhasAgrupadas);
    setGerado(true);
    setTipoMensagem("sucesso");

    setTimeout(() => {
      linhasAgrupadas.forEach((grupo) => gerarGrafico(grupo));
    }, 100);
  };

  const limparResultados = () => {
    setLinhas([]);
    setGerado(false);
    graficoRefs.current = {};
    setMensagemGlobal("");
    setTipoMensagem("");
  };

  const limpar = () => {
    setMedicoQuery("");
    setCrmQuery("");
    setEspecialidade("");
    setDataDe(hoje);
    setHoraDe("07:00");
    setDataAte(hoje);
    setHoraAte("19:00");
    setVisao("profissional");
    setTipoGrafico("barra");
    setOrdem("alfabetica");
    limparResultados();
    setMostrarListaMedicos(false);
  };

  const gerarChartData = (grupo) => {
    const labels = grupo.meses.flatMap((mes) =>
      mes.items.map((i) => `${dayjs(i.data, ["YYYY-MM-DD", "DD/MM/YYYY"]).format("DD/MM/YYYY")} ${dayjs(i.hora, "HH:mm").format("HH:mm")}`)
    );
    const data = grupo.meses.flatMap((mes) => mes.items.map((i) => Number(i.quantidade)));
    const backgroundColor = grupo.meses.flatMap((mes) =>
      mes.items.map((i) => CORES_ESPECIALIDADE[i.especialidade] || "#36A2EB")
    );
    return { labels, datasets: [{ label: "Quantidade de Atendimentos", data, backgroundColor }] };
  };

  const gerarGrafico = (grupo) => {
    const ctx = graficoRefs.current[grupo.chave];
    if (!ctx) return;
    new Chart(ctx, {
      type: tipoGrafico === "pizza" ? "pie" : tipoGrafico,
      data: gerarChartData(grupo),
      options: { responsive: true, plugins: { legend: { position: "bottom" } } },
    });
  };

  const gerarPDF = () => {
    if (!linhas.length) return alert("Não há dados para gerar o PDF.");
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("DASHBOARD DE GESTÃO DE PRODUTIVIDADE MÉDICA", 14, 22);

    let yPos = 35;
    linhas.forEach((grupo) => {
      grupo.meses.forEach((mes) => {
        doc.setFontSize(14);
        doc.text(`${visao === "profissional" ? "Médico" : "Especialidade"}: ${grupo.chave} - ${mes.mes} (Total: ${mes.totalMes})`, 14, yPos);
        const tableData = mes.items.map((p) => [
          p.medico,
          p.crm,
          p.especialidade,
          dayjs(p.data, ["YYYY-MM-DD", "DD/MM/YYYY"]).format("DD/MM/YYYY"),
          dayjs(p.hora, "HH:mm").format("HH:mm"),
          p.quantidade,
        ]);
        doc.autoTable({
          head: [["Médico", "CRM", "Especialidade", "Data", "Hora", "Quantidade"]],
          body: tableData,
          startY: yPos + 10,
        });
        yPos += 10 + 10 * (mes.items.length + 2);
      });
    });

    doc.save(`relatorio_${dayjs().format("DDMMYYYY_HHmm")}.pdf`);
  };

  const exportExcel = () => {
    if (!linhas.length) {
      alert("Não há dados para exportar o Excel.");
      return;
    }
    const wb = XLSX.utils.book_new();
    linhas.forEach((grupo) => {
      grupo.meses.forEach((mes) => {
        const wsData = [
          ["Médico", "CRM", "Especialidade", "Data", "Hora", "Quantidade"],
          ...mes.items.map((p) => [
            p.medico,
            p.crm,
            p.especialidade,
            dayjs(p.data, ["YYYY-MM-DD", "DD/MM/YYYY"]).format("DD/MM/YYYY"),
            dayjs(p.hora, "HH:mm").format("HH:mm"),
            p.quantidade,
          ]),
        ];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, `${grupo.chave}_${mes.mes}`.substring(0, 31));
      });
    });
    XLSX.writeFile(wb, `relatorio_${dayjs().format("YYYYMMDD_HHmm")}.xlsx`);
  };

  return (
    <div className="relatorios-wrap">
      <div className="relatorios-header">
        <h1>DASHBOARD DE GESTÃO DE PRODUTIVIDADE MÉDICA</h1>
      </div>

      {/* Mensagem global com estilo semelhante à página Plantao */}
      {mensagemGlobal && (
        <div className={`mensagem-global ${tipoMensagem}`}>
          <p>{mensagemGlobal}</p>
        </div>
      )}

      <div className="relatorios-controles card">
        {/* CONTROLES DE FILTRO */}
        <div className="grid-3">
          <div className="field">
            <label>Visão</label>
            <select value={visao} onChange={(e) => setVisao(e.target.value)}>
              <option value="profissional">Profissional</option>
              <option value="especialidade">Especialidade</option>
            </select>
          </div>

          <div className="field">
            <label>Tipo de Gráfico</label>
            <select value={tipoGrafico} onChange={(e) => setTipoGrafico(e.target.value)}>
              <option value="barra">Barra</option>
              <option value="linha">Linha</option>
              <option value="pizza">Pizza</option>
              <option value="area">Área</option>
            </select>
          </div>

          <div className="field">
            <label>Intervalo</label>
            <select
              value={`${horaDe}-${horaAte}`}
              onChange={(e) => {
                const [inicio, fim] = e.target.value.split("-");
                setHoraDe(inicio);
                setHoraAte(fim);
              }}
            >
              <option value="07:00-19:00">7h-19h</option>
              <option value="19:00-07:00">19h-7h</option>
              <option value="00:00-23:59">00h-23h59 (completo)</option>
            </select>
          </div>
        </div>

        <div className="grid-3">
          <div className="field">
            <label>Especialidade</label>
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
            <label>Médico</label>
            <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
              <input
                ref={inputRef}
                value={medicoQuery}
                onChange={(e) => setMedicoQuery(e.target.value)}
                placeholder="Todos"
                onFocus={() => setMostrarListaMedicos(true)}
                onBlur={() => setTimeout(() => setMostrarListaMedicos(false), 200)}
              />
              <span
                style={{ cursor: "pointer", marginLeft: "5px" }}
                onClick={() => {
                  setMedicoQuery("");
                  setCrmQuery("");
                  setMostrarListaMedicos(true);
                }}
              >
                🔍
              </span>
              {mostrarListaMedicos && (
                <div
                  style={{
                    border: "1px solid #ccc",
                    maxHeight: "200px",
                    overflowY: "auto",
                    background: "#fff",
                    position: "absolute",
                    top: "30px",
                    width: "200px",
                    zIndex: 10,
                  }}
                >
                  {medicosData
                    .filter((m) =>
                      m.nome.toLowerCase().includes(medicoQuery.toLowerCase())
                    )
                    .map((m) => (
                      <div
                        key={m.id}
                        style={{ padding: "5px", cursor: "pointer" }}
                        onMouseDown={() => {
                          setMedicoQuery(m.nome);
                          setCrmQuery(m.crm || "");
                          setMostrarListaMedicos(false);
                        }}
                      >
                        {m.nome}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div className="field">
            <label>CRM</label>
            <input type="text" value={crmQuery} onChange={(e) => setCrmQuery(e.target.value)} />
          </div>
        </div>

        <div className="grid-3">
          <div className="field">
            <label>Data/Hora Início</label>
            <input type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} />
            <input type="time" value={horaDe} onChange={(e) => setHoraDe(e.target.value)} />
          </div>

          <div className="field">
            <label>Data/Hora Fim</label>
            <input type="date" value={dataAte} onChange={(e) => setDataAte(e.target.value)} />
            <input type="time" value={horaAte} onChange={(e) => setHoraAte(e.target.value)} />
          </div>
        </div>

        <div className="grid-3" style={{ marginTop: "10px" }}>
          <div className="field">
            <label>Ordenar por</label>
            <select value={ordem} onChange={(e) => setOrdem(e.target.value)}>
              <option value="alfabetica">Alfabética</option>
              <option value="ultimo">Último Atendimento</option>
            </select>
          </div>
        </div>

        <div
          className="botoes-relatorio"
          style={{ marginTop: "15px", display: "flex", gap: "20px" }}
        >
          <button
            style={{ fontSize: "16px", padding: "10px 60px" }}
            onClick={() => {
              limparResultados();
              filtrarRelatorio();
            }}
          >
            Gerar Relatórios
          </button>
          <button style={{ fontSize: "16px", padding: "10px 100px" }} onClick={limpar}>
            Limpar
          </button>
          <button style={{ fontSize: "16px", padding: "10px 115px" }} onClick={gerarPDF}>
            Exportar PDF
          </button>
          <button style={{ fontSize: "16px", padding: "10px 115px" }} onClick={exportExcel}>
            Exportar Excel
          </button>
        </div>
      </div>

      {gerado && (
        <section className="relatorios-tabela">
          {linhas.length === 0 && <p>Nenhum dado encontrado com os filtros selecionados.</p>}
          {linhas.map((grupo) => (
            <div key={grupo.chave} className="grupo-relatorio card">
              <h3>{grupo.chave}</h3>
              {grupo.meses.map((mes) => (
                <div key={mes.mes} className="mes-card">
                  <h4>{mes.mes} - Total: {mes.totalMes}</h4>
                  <table>
                    <thead>
                      <tr>
                        <th>Médico</th>
                        <th>CRM</th>
                        <th>Especialidade</th>
                        <th>Data</th>
                        <th>Hora</th>
                        <th>Qt de Atendimento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mes.items.map((p, idx) => (
                        <tr key={idx}>
                          <td>{p.medico}</td>
                          <td>{p.crm}</td>
                          <td>{p.especialidade}</td>
                          <td>{p.data}</td>
                          <td>{p.hora}</td>
                          <td>{p.quantidade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
              <div className="relatorios-grafico">
                {tipoGrafico === "barra" && <GraficoBarra data={gerarChartData(grupo)} />}
                {tipoGrafico === "linha" && <GraficoLinha data={gerarChartData(grupo)} />}
                {tipoGrafico === "pizza" && <GraficoPizza data={gerarChartData(grupo)} />}
                {tipoGrafico === "area" && <GraficoArea data={gerarChartData(grupo)} />}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
