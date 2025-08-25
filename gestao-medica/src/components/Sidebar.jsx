import React from "react";
import { NavLink } from "react-router-dom";

function Sidebar() {
  return (
    <aside>
      <h3>Menu</h3>
      <nav>
        <ul>
          <li><NavLink to="/">Home</NavLink></li>
          <li><NavLink to="/medicos">Médicos</NavLink></li>
          <li><NavLink to="/plantao">Plantão</NavLink></li>
          <li><NavLink to="/relatorios">Relatórios</NavLink></li>
            <li><NavLink to="/filtros">Filtros</NavLink></li>
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;
