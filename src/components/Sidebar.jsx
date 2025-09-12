import React from "react";
import { NavLink } from "react-router-dom";

function Sidebar({ usuarioAtual }) {
  if (!usuarioAtual) return null;

  return (
    <aside className="sidebar">
      <h3>Menu</h3>
      <nav>
        <ul>
             {/* Home sempre disponível para todos logados */}
          <li><NavLink to="/">Home</NavLink></li>

          {["admin","suporte"].includes(usuarioAtual.role) && (
            <>
              <li><NavLink to="/medicos">Médicos</NavLink></li>
              <li><NavLink to="/plantao">Plantão</NavLink></li>
            </>
          )}
          <li><NavLink to="/relatorios">Relatórios</NavLink></li>
          <li><NavLink to="/filtros">Filtros</NavLink></li>
          {usuarioAtual.role === "admin" && <li><NavLink to="/cadastro-usuarios">Cadastro de Usuários</NavLink></li>}
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;
