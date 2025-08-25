// src/pages/Relatorios.jsx
import React, { useState } from "react";
import medicos from "./MedicosData"; // Importando a base de médicos
import "./Relatorios.css";

export default function Relatorios() {
  const [plantaoData, setPlantaoData] = useState([
    { id: 1, data: "2025-08-25", medico: "Dr. João Silva", especialidade: "Clínico", quantidade: 12, observacao: "" },
    { id: 2, data: "2025-08-25", medico: "Dra. Maria Souza", especialidade: "Pediátrico", quantidade: 8, observacao: "Plantão noturno" },
  ]);

  const [filtros, setFiltros] = useState({
    data: "",
    medico: "",
    especialidade: ""
  });

  const handleFiltroChange = (e) => {
    setFiltros({ ...filtros, [e.target.name]: e.target.value });
  };

  const filtrarPlantao = () => {
    return plantaoData.filter(p =>
      (!filtros.data || p.data === filtros.data) &&
      (!filtros.medico || p.medico.toLowerCase().includes(filtros.medico.toLowerCase())) &&
      (!filtros.especialidade || p.especialidade === filtros.especialidade)
    );
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

  return (
    <div className="relatorios-container">
      <h2>Relatórios de Plantão</h2>

      {/* FILTROS */}
      <div className="filtros">
        <input type="date" name="data" value={filtros.data} onChange={handleFiltroChange} />
        <input type="text" placeholder="Pesquisar médico" name="medico" value={filtros.medico} onChange={handleFiltroChange} />
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

      {/* TABELA */}
      <table className="tabela-plantao">
        <thead>
          <tr>
            <th>Data</th>
            <th>Medico</th>
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

      {/* BOTÃO */}
      <div className="botoes-relatorio">
        <button onClick={salvarCSV}>Exportar CSV</button>
      </div>
    </div>
  );
}
