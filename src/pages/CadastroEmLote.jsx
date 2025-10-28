import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CadastroLote.css";
import "./mobile.css";

function CadastroEmLote() {
  const navigate = useNavigate();
  const [textoLote, setTextoLote] = useState("");
  const [mensagem, setMensagem] = useState("");

  // ==========================================
  // 📦 Cadastrar médicos em lote
  // ==========================================
  const handleCadastrarLote = () => {
    if (!textoLote.trim()) {
      alert("Digite ao menos um médico para cadastrar!");
      return;
    }

    const linhas = textoLote.split("\n").filter((l) => l.trim() !== "");
    const medicosExistentes = JSON.parse(localStorage.getItem("medicos") || "[]");
    const novosMedicos = [];

    linhas.forEach((linha, index) => {
      const [nome, especialidade, crm, observacao] = linha
        .split(",")
        .map((x) => x?.trim() || "");

      if (!nome || !especialidade) return; // campos obrigatórios

      // Evita CRM duplicado
      if (
        crm &&
        medicosExistentes.some(
          (m) => m.crm?.toUpperCase() === crm.toUpperCase()
        )
      ) {
        console.warn(`CRM duplicado ignorado: ${crm}`);
        return;
      }

      novosMedicos.push({
        id: Date.now() + Math.random() + index,
        nome: nome.toUpperCase(),
        especialidade: especialidade.toUpperCase(),
        crm: crm ? crm.toUpperCase() : "",
        observacao: observacao ? observacao.toUpperCase() : "",
      });
    });

    if (novosMedicos.length === 0) {
      alert("Nenhum médico válido encontrado para cadastrar.");
      return;
    }

    // Junta e salva no storage local “medicos”
    const todosMedicos = [...medicosExistentes, ...novosMedicos];
    localStorage.setItem("medicos", JSON.stringify(todosMedicos));

    // 🔄 Notifica todas as páginas (Médicos, Relatórios, etc.)
    window.dispatchEvent(new Event("dadosAtualizados"));

    setMensagem(`✅ Foram cadastrados ${novosMedicos.length} médicos com sucesso!`);
    setTextoLote("");
    setTimeout(() => setMensagem(""), 4000);
  };

  // ==========================================
  // 🧹 Limpar textarea
  // ==========================================
  const handleLimpar = () => {
    setTextoLote("");
    setMensagem("");
  };

  return (
    <div className="cadastro-lote-container">
      <h2>Cadastro de Médicos em Lote</h2>
      {mensagem && <p className="cadastro-lote-mensagem-sucesso">{mensagem}</p>}

      <p>
        Digite os médicos no formato:{" "}
        <strong>Nome,Especialidade,CRM,Observação</strong>
      </p>
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
