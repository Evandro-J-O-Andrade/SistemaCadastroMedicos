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

function CardMedico({ medico, dias, totalOverall }) {
  const totalAtendimentos = dias.reduce((acc, d) => acc + d.totalDia, 0);
  const allItems = dias.flatMap((d) => d.items);
  const especialidade = allItems.length ? allItems[0].especialidade : "—";
  const crm = allItems.length ? allItems[0].crm : "—";

  return (
    <div
      style={{
        border: "1px solid #1f4e78",
        borderRadius: 8,
        padding: 20,
        margin: 10,
        maxWidth: 350,
        backgroundColor: "#F7FBFF",
        color: "#003366",
        fontSize: 13,
        textAlign: "center",
        fontFamily: "Arial, sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <h2 style={{ fontWeight: "700", fontSize: 18, marginBottom: 15 }}>{medico}</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-around" }}>
        <div>
          <strong>CRM</strong>
          <div>{crm}</div>
        </div>
        <div>
          <strong>ATENDIMENTOS</strong>
          <div>{totalAtendimentos}</div>
        </div>
        <div>
          <strong>ATENDIMENTOS DE OUTROS PROFISSIONAIS</strong>
          <div>{totalOverall - totalAtendimentos}</div>
        </div>
        <div>
          <strong>ESPECIALIDADE</strong>
          <div>{especialidade}</div>
        </div>
      </div>
    </div>
  );
}

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
  const [tipoGrafico, setTipoGrafico] = useState("pizza");
  const [linhas, setLinhas] = useState([]);
  const [gerado, setGerado] = useState(false);
  const [mostrarListaMedicos, setMostrarListaMedicos] = useState(false);
  const [ordem, setOrdem] = useState("alfabetica");

  const [mensagemGlobal, setMensagemGlobal] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("");

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

  const normalizeString = (str) =>
    !str ? "" : str.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

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

  useEffect(() => {
    if (!gerado || !linhas.length) return;

    const getLastTimestamp = (grupo) => {
      const all = grupo.dias.flatMap((d) => d.items);
      if (!all.length) return 0;
      return Math.max(...all.map((i) => parsePlantaoDate(i.data, i.hora).getTime()));
    };

    let newLinhas = [...linhas];
    if (ordem === "alfabetica") {
      newLinhas.sort((a, b) => a.chave.localeCompare(b.chave));
    } else if (ordem === "ultimo") {
      newLinhas.sort((a, b) => getLastTimestamp(b) - getLastTimestamp(a));
    }
    setLinhas(newLinhas);
  }, [ordem]);

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
    setTipoGrafico("pizza");
    setOrdem("alfabetica");
    limparResultados();
    setMostrarListaMedicos(false);
  };

  const filtrarRelatorio = () => {
    setMensagemGlobal("");

    const nomeBusca = normalizeString(medicoQuery);
    const crmBusca = crmQuery.trim();
    const espBusca = normalizeString(especialidade);

    if (nomeBusca) {
      const encontrouMedico = medicosData.some(
        (m) => normalizeString(m.nome) === nomeBusca
      );
      if (!encontrouMedico) {
        setMensagemGlobal("⚠️ Médico não encontrado no sistema.");
        setTipoMensagem("erro");
        setLinhas([]);
        setGerado(false);
        return;
      }
    }

    const dadosCompletos = plantoes.map((p) => {
      const medico = medicosData.find(
        (m) => m.crm === p.crm || normalizeString(m.nome) === normalizeString(p.nome)
      );
      return {
        medico: p.nome,
        crm: p.crm || medico?.crm || "—",
        especialidade: medico?.especialidade || p.especialidade || "—",
        data: p.data,
        hora: p.hora,
        turno: p.turno || "—",
        quantidade: Number(p.quantidade) || 0,
      };
    });

    const inicio = parsePlantaoDate(dataDe || hoje, horaDe || "07:00");
    const fim = parsePlantaoDate(dataAte || hoje, horaAte || "19:00");

    let filtrados = dadosCompletos.filter((p) => {
      const okEsp = !espBusca || normalizeString(p.especialidade) === espBusca;
      const okMed = !nomeBusca || normalizeString(p.medico) === nomeBusca;
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
      let mensagem = "⚠️ Nenhum dado encontrado com os filtros selecionados.";
      if (nomeBusca && espBusca) {
        mensagem = "⚠️ Especialidade sem registro para esse médico.";
      } else if (nomeBusca && !espBusca) {
        mensagem = "⚠️ Médico sem registros.";
      } else if (!nomeBusca && espBusca) {
        mensagem = "⚠️ Especialidade sem registros.";
      }
      setMensagemGlobal(mensagem);
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
      const dia = dayjs(p.data, ["YYYY-MM-DD", "DD/MM/YYYY"]).format("DD/MM/YYYY");
      if (!agrupados[chavePrincipal][dia]) agrupados[chavePrincipal][dia] = [];
      agrupados[chavePrincipal][dia].push(p);
    });


    const linhasAgrupadas = Object.keys(agrupados).map((chave) => {
      const dias = Object.keys(agrupados[chave]).map((dia) => {
        const totalDia = agrupados[chave][dia].reduce((acc, p) => acc + Number(p.quantidade), 0);
        return { dia, totalDia, items: agrupados[chave][dia] };
      });
      return { chave, dias };
    });


    setLinhas(linhasAgrupadas);
    setGerado(true);
    setTipoMensagem("sucesso");


    setTimeout(() => {
      linhasAgrupadas.forEach((grupo) => gerarGrafico(grupo));
    }, 100);
  };


  const gerarChartData = (grupo) => {
    const labels = grupo.dias.flatMap((dia) =>
      dia.items.map((i) => `${dayjs(i.data, ["YYYY-MM-DD", "DD/MM/YYYY"]).format("DD/MM/YYYY")} ${i.hora}`)
    );
    const data = grupo.dias.flatMap((dia) => dia.items.map((i) => Number(i.quantidade)));
    const backgroundColor = grupo.dias.flatMap((dia) =>
      dia.items.map((i) => CORES_ESPECIALIDADE[i.especialidade] || "#36A2EB")
    );
    return { labels, datasets: [{ label: "Quantidade de Atendimentos", data, backgroundColor }] };
  };


  const gerarGrafico = (grupo) => {
    const ctx = graficoRefs.current[grupo.chave];
    if (!ctx) return;


    new Chart(ctx, {
      type: tipoGrafico === "pizza" ? "pie" : tipoGrafico,
      data: gerarChartData(grupo),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#003366",
              font: { size: 14, weight: "500" },
            },
          },
        },
        layout: {
          padding: { top: 20, bottom: 20 },
        },
        scales:
          tipoGrafico !== "pizza" && {
            x: { ticks: { color: "#003366" }, grid: { color: "#e0e0e0" } },
            y: { ticks: { color: "#003366" }, grid: { color: "#e0e0e0" } },
          },
      },
      plugins: [
        {
          id: "fundoBranco",
          beforeDraw: (chart) => {
            const ctx = chart.ctx;
            ctx.save();
            ctx.globalCompositeOperation = "destination-over";
            ctx.fillStyle = "white"; // fundo branco
            ctx.fillRect(0, 0, chart.width, chart.height);
            ctx.restore();
          },
        },
      ],
    });
  };


  const gerarChartDataConsolidadoPorMedico = (linhas) => {
    const totais = {};
    linhas.forEach((grupo) => {
      const medico = grupo.chave;
      totais[medico] = 0;
      grupo.dias.forEach((dia) => {
        totais[medico] += dia.totalDia;
      });
    });
    const labels = Object.keys(totais);
    const data = labels.map((label) => totais[label]);
    const backgroundColor = labels.map((label) => CORES_ESPECIALIDADE[medicosData.find((m) => m.nome === label)?.especialidade] || "#36A2EB");
    return { labels, datasets: [{ label: "Quantidade", data, backgroundColor }] };
  };


  const gerarChartDataConsolidadoPorEspecialidade = (linhas) => {
    const totais = {};
    linhas.forEach((grupo) => {
      grupo.dias.forEach((dia) => {
        dia.items.forEach((item) => {
          if (!totais[item.especialidade]) totais[item.especialidade] = 0;
          totais[item.especialidade] += item.quantidade;
        });
      });
    });
    const labels = Object.keys(totais);
    const data = labels.map((lab) => totais[lab]);
    const backgroundColor = labels.map((lab) => CORES_ESPECIALIDADE[lab] || "#36A2EB");
    return { labels, datasets: [{ label: "Quantidade", data, backgroundColor }] };
  };


  const renderGraficoDinamico = (data) => {
    switch (tipoGrafico) {
      case "barra":
        return <GraficoBarra data={data} />;
      case "linha":
        return <GraficoLinha data={data} />;
      case "area":
        return <GraficoArea data={data} />;
      case "pizza":
      default:
        return <GraficoPizza data={data} />;
    }
  };


  const gerarPDF = () => {
    if (!linhas.length) return alert("Não há dados para gerar o PDF.");
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("DASHBOARD DE GESTÃO DE PRODUTIVIDADE MÉDICA", 14, 22);


    let yPos = 35;
    linhas.forEach((grupo) => {
      grupo.dias.forEach((dia) => {
        doc.setFontSize(14);
        doc.text(`${visao === "profissional" ? "Médico" : "Especialidade"}: ${grupo.chave} - ${dia.dia} (Total: ${dia.totalDia})`, 14, yPos);
        const tableData = dia.items.map((p) => [
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
        yPos += 10 + 10 * (dia.items.length + 2);
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
      grupo.dias.forEach((dia) => {
        const wsData = [
          ["Médico", "CRM", "Especialidade", "Data", "Hora", "Quantidade"],
          ...dia.items.map((p) => [
            p.medico,
            p.crm,
            p.especialidade,
            dayjs(p.data, ["YYYY-MM-DD", "DD/MM/YYYY"]).format("DD/MM/YYYY"),
            dayjs(p.hora, "HH:mm").format("HH:mm"),
            p.quantidade,
          ]),
        ];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, `${grupo.chave}_${dia.dia}`.substring(0, 31));
      });
    });
    XLSX.writeFile(wb, `relatorio_${dayjs().format("YYYYMMDD_HHmm")}.xlsx`);
  };


  return (
    <div className="relatorios-wrap">
      <div className="relatorios-header">
        <h1>DASHBOARD DE GESTÃO DE PRODUTIVIDADE MÉDICA</h1>
      </div>


      {mensagemGlobal && (
        <div className={`mensagem-global ${tipoMensagem}`}>
          <p>{mensagemGlobal}</p>
        </div>
      )}


      <div className="relatorios-controles card">
        {/* CONTROLES */}
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
              <option value="07:00-19:00">07:00h-19:00h</option>
              <option value="19:00-07:00">19:00h-07:00h</option>
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
                    border: "1px solid #5f5a5aff",
                    maxHeight: "310px",
                    overflowY: "auto",
                    background: "#fcf1f1ff",
                    position: "absolute",
                    top: "30px",
                    width: "350px",
                    zIndex: 10,
                  }}
                >
                  {medicosData
                    .filter((m) => normalizeString(m.nome).includes(normalizeString(medicoQuery)))
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

        <div className="botoes-relatorio" style={{ marginTop: "15px", display: "flex", gap: "20px" }}>
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


      {gerado && visao === "profissional" && (
        <section className="relatorios-tabela" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center" }}>
          {linhas.map((grupo) => (
            <CardMedico
              key={grupo.chave}
              medico={grupo.chave}
              dias={grupo.dias}
              totalOverall={linhas.reduce((acc, g) => acc + g.dias.reduce((a, d) => a + d.totalDia, 0), 0)}
            />
          ))}
        </section>
      )}

      {gerado && linhas.length > 0 && (
        <div
          className="grafico-container"
          style={{ maxWidth: 1200, margin: "40px auto 20px", padding: "0 15px" }}
        >
          <h3 style={{ textAlign: "center", marginBottom: 20 }}>
            Gráfico Consolidado {visao === "profissional" ? "por Médico" : "por Especialidade"}
          </h3>
          {renderGraficoDinamico(
            visao === "profissional"
              ? gerarChartDataConsolidadoPorMedico(linhas)
              : gerarChartDataConsolidadoPorEspecialidade(linhas)
          )}
        </div>
      )}
    </div>
  );
}
