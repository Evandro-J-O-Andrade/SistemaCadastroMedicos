import React from "react";

function Header({ usuarioAtual, handleLogoff }) {
  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 20px",
        backgroundColor: "#021e3aff", // cor original
        color: "#fff",
      }}
    >
      <h1 style={{ margin: 0 }}>Gestão de Produtividade Médica</h1>

      {usuarioAtual && (
        <button
          onClick={handleLogoff}
          style={{
            padding: "6px 12px",
            backgroundColor: "#c0392b", // vermelho suave
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Logoff
        </button>
      )}
    </header>
  );
}

export default Header;
