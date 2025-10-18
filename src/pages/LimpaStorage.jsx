// src/pages/Limpeza.jsx
import React, { useState } from "react";
import {
  clearPlantaoStorage,
  restorePlantaoStorage,
  debugStorage,
} from "../utils/storagePlantao";

function Limpeza() {
  const [mensagem, setMensagem] = useState("");

  // Limpa os dados de plantão com backup
  const handleClear = () => {
    if (
      window.confirm(
        "Tem certeza que deseja limpar todos os dados de plantão? Um backup será criado."
      )
    ) {
      clearPlantaoStorage({ backup: true });
      setMensagem("✅ Dados limpos e backup criado!");
    }
  };

  // Restaura os dados a partir do backup
  const handleRestore = () => {
    if (
      window.confirm(
        "Deseja restaurar os dados de plantão a partir do backup?"
      )
    ) {
      restorePlantaoStorage();
      setMensagem("🔄 Backup restaurado com sucesso!");
    }
  };

  // Mostra os dados atuais e backup no console
  const handleDebug = () => {
    debugStorage();
    setMensagem("🔍 Verifique o console para debug do storage.");
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Gerenciamento de Plantão</h1>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button
          onClick={handleClear}
          style={{
            background: "#f44336",
            color: "#fff",
            padding: "8px 12px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Limpar Dados
        </button>

        <button
          onClick={handleRestore}
          style={{
            background: "#4CAF50",
            color: "#fff",
            padding: "8px 12px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Restaurar Backup
        </button>

        <button
          onClick={handleDebug}
          style={{
            background: "#2196F3",
            color: "#fff",
            padding: "8px 12px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Debug Storage
        </button>
      </div>

      {mensagem && (
        <div
          style={{
            marginBottom: "20px",
            padding: "10px",
            background: "#f0f0f0",
            borderRadius: "4px",
          }}
        >
          {mensagem}
        </div>
      )}
    </div>
  );
}

export default Limpeza;
