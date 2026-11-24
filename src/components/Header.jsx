import React from "react";
import { useAuth } from "../hooks/useAuth";

function Header() {
  const { user, signOut, authenticated, loading } = useAuth();

  if (loading) return null;

  const handleLogoff = () => {
    signOut();
  };

  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 20px",
        backgroundColor: "#021e3aff",
        color: "#fff",
      }}
    >
      <h1 style={{ margin: 0 }}>Gestão de Produtividade Médica</h1>

      {authenticated && user && (
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "14px", opacity: 0.9 }}>{user.nome || user.email || 'Usuário'}</span>
          {user.roles && user.roles.length > 0 && (
            <span style={{ fontSize: "12px", opacity: 0.7, background: "rgba(255,255,255,0.2)", padding: "2px 8px", borderRadius: "12px" }}>
              {user.roles.join(', ')}
            </span>
          )}
          <button
            onClick={handleLogoff}
            style={{
              padding: "6px 12px",
              backgroundColor: "#c0392b",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Logoff
          </button>
        </div>
      )}
    </header>
  );
}

export default Header;
