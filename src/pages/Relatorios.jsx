import React, { useState, useEffect, useRef } from "react";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import Chart from "chart.js/auto";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";

import "./Relatorios.css";

dayjs.locale("pt-br");

export default function Relatorios({ usuarioAtual, empresaAtual }) {
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

  useEffect(() => {
    const dadosMedicos = JSON.parse(localStorage.getItem("medicos") || "[]");
    setMedicosData(Array.isArray(dadosMedicos) ? dadosMedicos : []);

    const dadosPlantoes = JSON.parse(localStorage.getItem("plantaoData") || "[]");
    setPlantoes(Array.isArray(dadosPlantoes) ? dadosPlantoes : []);
  }, []);

  const handleMedicoChange = (value) => {
    setMedicoQuery(value);
    const medico = medicosData.find(
      (m) => m.nome.toLowerCase() === value.toLowerCase()
    );
    setCrmQuery(medico?.crm || "");
    setMostrarListaMedicos(true);
  };

  const medicosComPlantao = medicosData.filter((m) =>
    plantoes.some((p) => p.nome === m.nome)
  );

  const filtrarRelatorio = () => {
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
        quantidade: p.quantidade || 0,
      };
    });

    let filtrados = dadosCompletos.filter((p) => {
      const okEsp = !especialidade || p.especialidade.toLowerCase() === especialidade.toLowerCase();
      const okMed = !nomeBusca || p.medico.toLowerCase().includes(nomeBusca);
      const okCrm = !crmBusca || p.crm.includes(crmBusca);

      let okDataHora = true;
      const registro = new Date(`${p.data}T${p.hora}`);

      // Data/Hora Início
      if (dataDe || horaDe) {
        const inicioData = dataDe || p.data;
        const inicioHora = horaDe || "00:00";
        const inicio = new Date(`${inicioData}T${inicioHora}:00`);
        if (registro < inicio) okDataHora = false;
      }

      // Data/Hora Fim
      if (dataAte || horaAte) {
        const fimData = dataAte || p.data;
        const fimHora = horaAte || "23:59";
        const fim = new Date(`${fimData}T${fimHora}:59`);
        if (registro > fim) okDataHora = false;
      }

      return okEsp && okMed && okCrm && okDataHora;
    });

    const agrupados = {};
    filtrados.forEach((p) => {
      const chavePrincipal = visao === "profissional" ? p.medico : p.especialidade;
      if (!agrupados[chavePrincipal]) agrupados[chavePrincipal] = {};
      const mesAno = dayjs(p.data).format("MM/YYYY");
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

    setTimeout(() => {
      linhasAgrupadas.forEach((grupo) => gerarGrafico(grupo));
    }, 100);
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
    setLinhas([]);
    setGerado(false);
    setMostrarListaMedicos(false);
    graficoRefs.current = {};
  };

  const gerarChartData = (grupo) => {
    const labels = grupo.meses.flatMap((mes) => mes.items.map((i) => i.data));
    const data = grupo.meses.flatMap((mes) => mes.items.map((i) => Number(i.quantidade)));
    const backgroundColor = labels.map(() => "#36A2EB");
    return { labels, datasets: [{ label: "Quantidade", data, backgroundColor }] };
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

    linhas.forEach((grupo, idx) => {
      grupo.meses.forEach((mes, midx) => {
        doc.setFontSize(14);
        doc.text(
          `${visao === "profissional" ? "Médico" : "Especialidade"}: ${grupo.chave} - ${mes.mes} (Total: ${mes.totalMes})`,
          14,
          35 + (idx + midx) * 10
        );
        const tableData = mes.items.map((p) => [
          p.medico,
          p.crm,
          p.especialidade,
          p.data,
          p.hora,
          p.quantidade,
        ]);
        doc.autoTable({
          head: [["Médico", "CRM", "Especialidade", "Data", "Hora", "Quantidade"]],
          body: tableData,
          startY: 40 + (idx + midx) * 10,
        });
      });
    });

    doc.save(`relatorio_${dayjs().format("YYYYMMDD_HHmm")}.pdf`);
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    linhas.forEach((grupo) => {
      grupo.meses.forEach((mes) => {
        const wsData = [
          ["Médico", "CRM", "Especialidade", "Data", "Hora", "Quantidade"],
          ...mes.items.map((p) => [
            p.medico,
            p.crm,
            p.especialidade,
            p.data,
            p.hora,
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

      <div className="relatorios-controles card">
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
              <option value="line">Linha</option>
              <option value="pizza">Pizza</option>
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
            </select>
          </div>
        </div>

        <div className="grid-3">
          <div className="field">
            <label>Especialidade</label>
            <select value={especialidade} onChange={(e) => setEspecialidade(e.target.value)}>
              <option value="">Todas</option>
              {[...new Set(medicosComPlantao.map((m) => m.especialidade))].map((esp) => (
                <option key={esp} value={esp}>{esp}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Médico</label>
            <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
              <input
                ref={inputRef}
                value={medicoQuery}
                onChange={(e) => handleMedicoChange(e.target.value)}
                placeholder="Todos"
                onFocus={() => setMostrarListaMedicos(true)}
                onBlur={() => {
                  const lista = medicosComPlantao.filter((m) =>
                    m.nome.toLowerCase().includes(medicoQuery.toLowerCase())
                  );
                  if (lista.length > 0) {
                    setMedicoQuery(lista[0].nome);
                    setCrmQuery(lista[0].crm || "");
                  }
                  setMostrarListaMedicos(false);
                }}
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
                <div style={{
                  border: "1px solid #ccc",
                  maxHeight: "200px",
                  overflowY: "auto",
                  background: "#fff",
                  position: "absolute",
                  top: "30px",
                  width: "200px",
                  zIndex: 10
                }}>
                  {medicosComPlantao
                    .filter((m) => m.nome.toLowerCase().includes(medicoQuery.toLowerCase()))
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

        <div className="botoes-relatorio" style={{ marginTop: "15px", display: "flex", gap: "20px" }}>
          <button style={{ fontSize: "16px", padding: "10px 60px" }} onClick={filtrarRelatorio}>Gerar Relatórios</button>
          <button style={{ fontSize: "16px", padding: "10px 100px" }} onClick={limpar}>Limpar</button>
          <button style={{ fontSize: "16px", padding: "10px 115px" }} onClick={gerarPDF}>PDF</button>
          <button style={{ fontSize: "16px", padding: "10px 115px" }} onClick={exportExcel}>Excel</button>
        </div>
      </div>

      {gerado && (
        <section className="relatorios-tabela">
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
                <canvas ref={(el) => (graficoRefs.current[grupo.chave] = el)} />
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
