import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import medicosData from "./MedicosData"; 
import "./Plantao.css";

// Função para formatar data e hora
function formatarDataHora(data, hora) {
  if (!data || !hora) return { dataFormatada: "", horaFormatada: "" };
  const [ano, mes, dia] = data.split("-");
  const [hh, mm] = hora.split(":");
  return {
    dataFormatada: `${dia}/${mes}/${ano}`,
    horaFormatada: `${hh}:${mm}`
  };
}

export default function Plantao() {
  const navigate = useNavigate();
  const [medicoInput, setMedicoInput] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [dataAtendimento, setDataAtendimento] = useState("");
  const [horaAtendimento, setHoraAtendimento] = useState("");
  const [plantaoList, setPlantaoList] = useState([]);

  useEffect(() => {
    const dados = localStorage.getItem("plantaoData");
    if (dados) setPlantaoList(JSON.parse(dados));
  }, []);

  useEffect(() => {
    localStorage.setItem("plantaoData", JSON.stringify(plantaoList));
  }, [plantaoList]);

  const medicoSuggestions = medicosData.filter((m) =>
    m.nome.toLowerCase().includes(medicoInput.toLowerCase())
  );

  const handleAddPlantao = () => {
    if (!medicoInput || !especialidade || !quantidade || !dataAtendimento || !horaAtendimento) {
      alert("Preencha todos os campos!");
      return;
    }

    const { dataFormatada, horaFormatada } = formatarDataHora(dataAtendimento, horaAtendimento);
    const novoPlantao = {
      id: Date.now(),
      nome: medicoInput,
      especialidade,
      quantidade,
      data: dataFormatada,
      hora: horaFormatada,
    };

    setPlantaoList([...plantaoList, novoPlantao]);
    setMedicoInput(""); setEspecialidade(""); setQuantidade(""); setDataAtendimento(""); setHoraAtendimento("");
  };

  const handleRemovePlantao = (id) => {
    if (!window.confirm("Deseja realmente excluir este plantão?")) return;
    setPlantaoList(plantaoList.filter((p) => p.id !== id));
  };

  // Função para definir cor do card por especialidade
  const corEspecialidade = (esp) => {
    switch (esp) {
      case "Clinico": return "#6c63ff";
      case "Pediatrico": return "#ff8c42";
      case "Emergencista": return "#ff5c5c";
      case "Cinderela": return "#9b59b6";
      case "Visitador": return "#2ecc71";
      case "Fisioterapeuta": return "#3498db";
      case "Nutricionista": return "#f1c40f";
      default: return "#95a5a6";
    }
  };

  return (
    <div className="plantao-container">
      <h2>Registrar Plantão</h2>

      <div className="form-plantao">
        <label>
          Médico:
          <input
            type="text"
            placeholder="Digite o nome do médico"
            value={medicoInput}
            onChange={(e) => setMedicoInput(e.target.value)}
            list="medicos"
          />
          <datalist id="medicos">
            {medicoSuggestions.map((m) => <option key={m.id} value={m.nome} />)}
          </datalist>
        </label>

        <label>
          Especialidade:
          <select value={especialidade} onChange={(e) => setEspecialidade(e.target.value)}>
            <option value="">Selecione</option>
            <option value="Clinico">Clínico</option>
            <option value="Pediatrico">Pediátrico</option>
            <option value="Emergencista">Emergencista</option>
            <option value="Cinderela">Cinderela</option>
            <option value="Visitador">Visitador</option>
            <option value="Fisioterapeuta">Fisioterapeuta</option>
            <option value="Nutricionista">Nutricionista</option>
          </select>
        </label>

        <label>
          Quantidade de atendimentos:
          <input
            type="number"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            placeholder="0"
          />
        </label>

        <label>
          Data do Atendimento:
          <input type="date" value={dataAtendimento} onChange={(e) => setDataAtendimento(e.target.value)} />
        </label>

        <label>
          Hora do Atendimento:
          <input type="time" value={horaAtendimento} onChange={(e) => setHoraAtendimento(e.target.value)} />
        </label>

        <button className="btn-salvar-plantao" onClick={handleAddPlantao}>Salvar Plantão</button>
      </div>

      {/* Lista de Plantões em cards */}
      {plantaoList.length > 0 ? (
        <div className="plantao-cards">
          {plantaoList.map((p) => (
            <div className="plantao-card" key={p.id} style={{ borderTop: `6px solid ${corEspecialidade(p.especialidade)}` }}>
              <div className="info-plantao">
                <p><span>Médico:</span> {p.nome}</p>
                <p><span>Especialidade:</span> {p.especialidade}</p>
                <p><span>Quantidade:</span> {p.quantidade}</p>
                <p><span>Data:</span> {p.data}</p>
                <p><span>Hora:</span> {p.hora}</p>
              </div>
              <button className="btn-excluir-plantao" onClick={() => handleRemovePlantao(p.id)}>Excluir</button>
            </div>
          ))}
        </div>
      ) : <p>Nenhum plantão registrado ainda.</p>}

      <button className="btn-cadastrar-medico" onClick={() => navigate("/medicos")}>Cadastrar Médico</button>
    </div>
  );
}
