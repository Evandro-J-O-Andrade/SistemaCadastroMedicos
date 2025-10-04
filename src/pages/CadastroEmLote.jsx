import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CadastroLote.css";
import "./mobile.css"
function CadastroEmLote() {
  const navigate = useNavigate();
  const [textoLote, setTextoLote] = useState("");
  const [mensagem, setMensagem] = useState("");

  // Cadastrar médicos em lote
  const handleCadastrarLote = () => {
    if (!textoLote.trim()) {
      alert("Digite ao menos um médico para cadastrar!");
      return;
    }

    const linhas = textoLote.split("\n");
    const medicosExistentes = JSON.parse(localStorage.getItem("medicos") || "[]");
    const novosMedicos = [];

    linhas.forEach((linha, index) => {
      const [nome, especialidade, crm, observacao] = linha.split(",").map((x) => x?.trim() || "");
      if (!nome || !especialidade) return; // campos obrigatórios

      // CRM único
      if (crm && medicosExistentes.some((m) => m.crm === crm)) return;

      novosMedicos.push({
        id: Date.now() + Math.random() + index,
        nome,
        especialidade,
        crm,
        observacao,
      });
    });

    const todosMedicos = [...medicosExistentes, ...novosMedicos];
    localStorage.setItem("medicos", JSON.stringify(todosMedicos));
    setMensagem(`Foram cadastrados ${novosMedicos.length} médicos com sucesso!`);
    setTextoLote("");
    setTimeout(() => setMensagem(""), 4000);
  };

  // Limpar textarea
  const handleLimpar = () => {
    setTextoLote("");
    setMensagem("");
  };

  return (
    <div className="cadastro-lote-container">
      <h2>Cadastro de Médicos em Lote</h2>
      {mensagem && <p className="cadastro-lote-mensagem-sucesso">{mensagem}</p>}

      <p>Digite os médicos no formato: <strong>Nome,Especialidade,CRM,Observação</strong></p>
      <textarea
        className="cadastro-lote-textarea"
        rows="10"
        placeholder="Ex: Evandro,Clínico,12345,Observação"
        value={textoLote}
        onChange={(e) => setTextoLote(e.target.value)}
      />

      <div className="cadastro-lote-botoes-container">
        <button className="cadastro-lote-btn" onClick={handleCadastrarLote}>
          Cadastrar Lote
        </button>
        <button className="cadastro-lote-btn-limpar" onClick={handleLimpar}>
          Limpar
        </button>
        <button className="cadastro-lote-btn" onClick={() => navigate("/medicos")}>
          Voltar
        </button>
      </div>
    </div>
  );
}

export default CadastroEmLote;
