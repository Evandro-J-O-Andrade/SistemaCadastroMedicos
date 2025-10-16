// Componente Limpeza.jsx
import React from "react";
import {
  clearPlantaoStorage,
  restorePlantaoStorage,
  debugStorage,
} from "../utils/storagePlantao";

function Limpeza() {
  // Limpa os dados de plantão com backup
  const handleClear = () => {
    if (
      window.confirm(
        "Tem certeza que deseja limpar todos os dados de plantão? Um backup será criado."
      )
    ) {
      clearPlantaoStorage({ backup: true });
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
    }
  };

  // Mostra os dados atuais e backup no console
  const handleDebug = () => {
    debugStorage();
  };

  return (
    <div style={{ display: "flex", gap: "10px" }}>
      <button onClick={handleClear} style={{ background: "#f44336", color: "#fff", padding: "8px 12px", border: "none", borderRadius: "4px" }}>
        Limpar Dados
      </button>

      <button onClick={handleRestore} style={{ background: "#4CAF50", color: "#fff", padding: "8px 12px", border: "none", borderRadius: "4px" }}>
        Restaurar Backup
      </button>

      <button onClick={handleDebug} style={{ background: "#2196F3", color: "#fff", padding: "8px 12px", border: "none", borderRadius: "4px" }}>
        Debug Storage
      </button>
    </div>
  );
}

export default Limpeza;{
    console.log("🔍 Estado atual do localStorage:");
    Object.keys(localStorage).forEach((key) => {
        console.log(`${key}:`, JSON.parse(localStorage.getItem(key)));
    });
  console.log("🔍 Estado do backup (se existir):", JSON.parse(localStorage.getItem("plantaoBackup")));
}   
