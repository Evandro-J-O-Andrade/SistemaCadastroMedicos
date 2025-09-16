import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { FaHome, FaUserMd, FaCalendarAlt, FaChartBar, FaFilter, FaUserPlus } from 'react-icons/fa';

function Sidebar({ usuarioAtual }) {
  const [collapsed, setCollapsed] = useState(false); // controla se a sidebar está colapsada

  if (!usuarioAtual) return null;

  // Função para retornar a imagem padrão de acordo com o role
  const getUserImage = (role) => {
    switch (role) {
      case "admin":
        return "./src/img/admin.jpg";
      case "suporte":
        return "./src/img/suporte.png";
      default:
        return "./src/img/usuario.png";
    }
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Título da sidebar (clicável para colapsar) */}
      <h3 className="sidebar-title" onClick={() => setCollapsed(!collapsed)}>
        Menu
      </h3>

      {/* Menu de navegação */}
      <nav className="menu-nav">
        <ul>
          <li>
            <NavLink to="/">
              <FaHome className="menu-icon" />
              <span className="menu-text">Home</span>
            </NavLink>
          </li>

          {["admin", "suporte"].includes(usuarioAtual.role) && (
            <>
              <li>
                <NavLink to="/medicos">
                  <FaUserMd className="menu-icon" />
                  <span className="menu-text">Médicos</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/plantao">
                  <FaCalendarAlt className="menu-icon" />
                  <span className="menu-text">Plantão</span>
                </NavLink>
              </li>
            </>
          )}

          <li>
            <NavLink to="/relatorios">
              <FaChartBar className="menu-icon" />
              <span className="menu-text">Relatórios</span>
            </NavLink>
          </li>

          <li>
            <NavLink to="/filtros">
              <FaFilter className="menu-icon" />
              <span className="menu-text">Filtros</span>
            </NavLink>
          </li>

          {usuarioAtual.role === "admin" && (
            <li>
              <NavLink to="/cadastro-usuarios">
                <FaUserPlus className="menu-icon" />
                <span className="menu-text">Cadastro de Usuários</span>
              </NavLink>
            </li>
          )}
        </ul>
      </nav>

      {/* Perfil do usuário sempre no final */}
      <div className="user-profile">
        <img
          src={usuarioAtual.foto || getUserImage(usuarioAtual.role)}
          alt="Foto do usuário"
          className="user-photo"
        />
        <div className="user-info">
          <span className="user-name">{usuarioAtual.nome || 'Usuário'}</span>
          {usuarioAtual.role && <span className="user-role">{usuarioAtual.role}</span>}
        </div>
      </div>

      {/* Botão de colapsar/expandir a sidebar */}
      <button className="toggle-btn" onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? '→' : '←'}
      </button>
    </aside>
  );
}

export default Sidebar;
