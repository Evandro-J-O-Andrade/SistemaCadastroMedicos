import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import medicosData from "./MedicosData"; 
import "./Plantao.css";

export default function Plantao() {
  const navigate = useNavigate();

  const [medicoInput, setMedicoInput] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [plantaoList, setPlantaoList] = useState([]);

  // Carregar plantões do localStorage ao iniciar
  useEffect(() => {
    const dados = localStorage.getItem("plantaoData");
    if (dados) {
      setPlantaoList(JSON.parse(dados));
    }
  }, []);

  // Salvar plantões no localStorage sempre que mudar
  useEffect(() => {
    localStorage.setItem("plantaoData", JSON.stringify(plantaoList));
  }, [plantaoList]);

  const medicoSuggestions = medicosData.filter((m) =>
    m.nome.toLowerCase().includes(medicoInput.toLowerCase())
  );

  const handleAddPlantao = () => {
    if (!medicoInput || !especialidade || !quantidade) {
      alert("Preencha todos os campos!");
      return;
    }
    const novoPlantao = {
      id: Date.now(), 
      nome: medicoInput,
      especialidade,
      quantidade,
    };
    setPlantaoList([...plantaoList, novoPlantao]);
    setMedicoInput("");
    setEspecialidade("");
    setQuantidade("");
  };

  const handleRemovePlantao = (id) => {
    const confirmado = window.confirm("Deseja realmente excluir este plantão?");
    if (!confirmado) return;
    setPlantaoList(plantaoList.filter((p) => p.id !== id));
  };

  return (
    <div className="plantao-container">
      <h2>Registrar Plantão</h2>

      <div className="form-plantao">
        <label>
          Médico:
          <input
            type="text"
            className="input-medico"
            placeholder="Digite o nome do médico"
            value={medicoInput}
            onChange={(e) => setMedicoInput(e.target.value)}
            list="medicos"
          />
          <datalist id="medicos">
            {medicoSuggestions.map((m) => (
              <option key={m.id} value={m.nome} />
            ))}
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
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="number"
              className="input-quantidade"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              placeholder="0"
            />
            <button className="btn-salvar-plantao" onClick={handleAddPlantao}>
              Salvar Plantão
            </button>
          </div>
        </label>
      </div>

      {/* Lista de Plantões */}
      {plantaoList.length > 0 ? (
        <table className="tabela-plantao">
          <thead>
            <tr>
              <th>Médico</th>
              <th>Especialidade</th>
              <th>Quantidade</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {plantaoList.map((p) => (
              <tr key={p.id}>
                <td>{p.nome}</td>
                <td>{p.especialidade}</td>
                <td>{p.quantidade}</td>
                <td>
                  <button
                    className="btn-excluir-plantao"
                    onClick={() => handleRemovePlantao(p.id)}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Nenhum plantão registrado ainda.</p>
      )}

      {/* Botão Cadastrar Médico */}
      <button
        className="btn-cadastrar-medico"
        onClick={() => navigate("/medicos")}
      >
        Cadastrar Médico
      </button>
    </div>
  );
}
