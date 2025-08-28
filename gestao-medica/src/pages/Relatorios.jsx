// src/pages/Relatorios.jsx
import React, { useState } from "react";
import medicos from "./MedicosData";
import "./Relatorios.css";

import { Pie, Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
} from "chart.js";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement
);

export default function Relatorios() {
  const [filtros, setFiltros] = useState({
    dataInicio: new Date().toISOString().slice(0, 10),
    dataFim: new Date().toISOString().slice(0, 10),
    medico: "",
    especialidade: ""
  });

  const [plantaoData] = useState([
    { id: 1, data: "2025-08-25", medico: "Dr. João Silva", especialidade: "Clínico", quantidade: 12, observacao: "" },
    { id: 2, data: "2025-08-25", medico: "Dra. Maria Souza", especialidade: "Pediátrico", quantidade: 8, observacao: "Plantão noturno" },
    // ...carregar todos os plantões
  ]);

  const [graficoTipo, setGraficoTipo] = useState("pizza");

  const handleFiltroChange = (e) => {
    setFiltros({ ...filtros, [e.target.name]: e.target.value });
  };

  const limparCampos = () => {
    setFiltros({
      dataInicio: new Date().toISOString().slice(0, 10),
      dataFim: new Date().toISOString().slice(0, 10),
      medico: "",
      especialidade: ""
    });
  };

  const filtrarPlantao = () => {
    return plantaoData.filter(p =>
      (!filtros.dataInicio || p.data >= filtros.dataInicio) &&
      (!filtros.dataFim || p.data <= filtros.dataFim) &&
      (!filtros.medico || p.medico.toLowerCase().includes(filtros.medico.toLowerCase())) &&
      (!filtros.especialidade || p.especialidade === filtros.especialidade)
    );
  };

  const somatorioPorMedico = () => {
    const resumo = {};
    filtrarPlantao().forEach(p => {
      resumo[p.medico] = (resumo[p.medico] || 0) + p.quantidade;
    });
    return resumo;
  };

  const dadosGrafico = () => {
    const filtered = filtrarPlantao();
    const resumo = {};
    filtered.forEach(p => {
      const chave = p.medico + " - " + p.especialidade;
      resumo[chave] = (resumo[chave] || 0) + p.quantidade;
    });
    const labels = Object.keys(resumo);
    const data = Object.values(resumo);

    // cores diferentes por especialidade
    const cores = filtered.map(p => {
      switch (p.especialidade) {
        case "Clínico": return "#36A2EB";
        case "Pediátrico": return "#FF6384";
        case "Emergencista": return "#FFCE56";
        case "Cinderela": return "#9966FF";
        case "Visitador": return "#4BC0C0";
        case "Fisioterapeuta": return "#FF9F40";
        case "Nutricionista": return "#8AFF33";
        default: return "#CCCCCC";
      }
    });

    return {
      labels,
      datasets: [
        {
          label: "Quantidade de Atendimentos",
          data,
          backgroundColor: cores,
          borderWidth: 1,
        },
      ],
    };
  };

  const salvarCSV = () => {
    const filtered = filtrarPlantao();
    let csv = "Data,Medico,Especialidade,Quantidade,Observacao\n";
    filtered.forEach(p => {
      csv += `${p.data},${p.medico},${p.especialidade},${p.quantidade},${p.observacao}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "relatorio_plantao.csv";
    link.click();
  };

  const resumoMedicos = somatorioPorMedico();

  return (
    <div className="relatorio-container">
      <h2>Relatórios de Plantão</h2>

      <div className="relatorio-form">
        <label>Data Início:</label>
        <input type="date" name="dataInicio" value={filtros.dataInicio} onChange={handleFiltroChange} />
        <label>Data Fim:</label>
        <input type="date" name="dataFim" value={filtros.dataFim} onChange={handleFiltroChange} />
        <input
          type="text"
          placeholder="Pesquisar médico"
          name="medico"
          value={filtros.medico}
          onChange={handleFiltroChange}
          list="medicosList"
        />
        <datalist id="medicosList">
          {medicos.map(m => (
            <option key={m.id} value={m.nome} />
          ))}
        </datalist>
        <select name="especialidade" value={filtros.especialidade} onChange={handleFiltroChange}>
          <option value="">Todas especialidades</option>
          <option value="Clínico">Clínico</option>
          <option value="Pediátrico">Pediátrico</option>
          <option value="Emergencista">Emergencista</option>
          <option value="Cinderela">Cinderela</option>
          <option value="Visitador">Visitador</option>
          <option value="Fisioterapeuta">Fisioterapeuta</option>
          <option value="Nutricionista">Nutricionista</option>
        </select>
      </div>

      <div className="relatorio-buttons">
        <button onClick={salvarCSV}>Gerar Relatório CSV</button>
        <button onClick={limparCampos}>Limpar Campos</button>
      </div>

      <table className="tabela-plantao">
        <thead>
          <tr>
            <th>Data</th>
            <th>Médico</th>
            <th>Especialidade</th>
            <th>Quantidade</th>
            <th>Observação</th>
          </tr>
        </thead>
        <tbody>
          {filtrarPlantao().map(p => (
            <tr key={p.id}>
              <td>{p.data}</td>
              <td>{p.medico}</td>
              <td>{p.especialidade}</td>
              <td>{p.quantidade}</td>
              <td>{p.observacao}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="resumo-medicos">
        <h3>Resumo por Médico</h3>
        <ul>
          {Object.keys(resumoMedicos).map(m => (
            <li key={m}>{m}: {resumoMedicos[m]} atendimentos</li>
          ))}
        </ul>
      </div>

      <div className="grafico-section">
        <h3>Gráfico de Atendimentos</h3>
        <div className="grafico-options">
          <button onClick={() => setGraficoTipo("pizza")} className={graficoTipo === "pizza" ? "active" : ""}>Pizza</button>
          <button onClick={() => setGraficoTipo("barra")} className={graficoTipo === "barra" ? "active" : ""}>Barra</button>
          <button onClick={() => setGraficoTipo("linha")} className={graficoTipo === "linha" ? "active" : ""}>Linha</button>
        </div>
        <div className="grafico-container">
          {graficoTipo === "pizza" && <Pie data={dadosGrafico()} />}
          {graficoTipo === "barra" && <Bar data={dadosGrafico()} />}
          {graficoTipo === "linha" && <Line data={dadosGrafico()} />}
        </div>
      </div>
    </div>
  );
}
