import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FaHome, FaUserMd, FaCalendarAlt, FaChartBar, FaFilter, FaUserPlus, FaShieldAlt, FaUsers } from 'react-icons/fa';

import AdminImg from "../img/admin.jpg";
import SuporteImg from "../img/suporte.png";
import UsuarioImg from "../img/usuario.png";
import { useAuth } from "../hooks/useAuth";

function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, authenticated, loading } = useAuth();

  if (loading || !authenticated || !user) return null;

  const roles = Array.isArray(user.roles) ? user.roles : user.role ? [user.role] : [];
  const isAdminOrRoot = roles.includes('admin') || roles.includes('root');
  const isSuporte = roles.includes('suporte');

  const getUserImage = (role) => {
    switch (role) {
      case "admin": return AdminImg;
      case "suporte": return SuporteImg;
      default: return UsuarioImg;
    }
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <h3 className="sidebar-title" onClick={() => setCollapsed(!collapsed)}>
        Menu
      </h3>

      <nav className="menu-nav">
        <ul>
          <li>
            <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setCollapsed(false)}>
              <FaHome className="menu-icon" />
              <span className="menu-text">Home</span>
            </NavLink>
          </li>

          {(isAdminOrRoot || isSuporte) && (
            <>
              <li>
                <NavLink to="/medicos" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setCollapsed(false)}>
                  <FaUserMd className="menu-icon" />
                  <span className="menu-text">Médicos</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/plantao" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setCollapsed(false)}>
                  <FaCalendarAlt className="menu-icon" />
                  <span className="menu-text">Plantão</span>
                </NavLink>
              </li>
            </>
          )}

          <li>
            <NavLink to="/relatorios" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setCollapsed(false)}>
              <FaChartBar className="menu-icon" />
              <span className="menu-text">Relatórios</span>
            </NavLink>
          </li>

          <li>
            <NavLink to="/filtros" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setCollapsed(false)}>
              <FaFilter className="menu-icon" />
              <span className="menu-text">Filtros</span>
            </NavLink>
          </li>

          {isAdminOrRoot && (
            <li>
              <NavLink to="/cadastro-usuarios" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setCollapsed(false)}>
                <FaUserPlus className="menu-icon" />
                <span className="menu-text">Cadastro de Usuários</span>
              </NavLink>
            </li>
          )}

          {roles.includes('root') && (
            <li>
              <NavLink to="/admin/tenants" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setCollapsed(false)}>
                <FaShieldAlt className="menu-icon" />
                <span className="menu-text">Tenants</span>
              </NavLink>
            </li>
          )}

          {roles.includes('root') && (
            <li>
              <NavLink to="/admin/auditoria" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setCollapsed(false)}>
                <FaUsers className="menu-icon" />
                <span className="menu-text">Auditoria</span>
              </NavLink>
            </li>
          )}
        </ul>
      </nav>

      <div className="user-profile">
        <img
          src={user.foto || getUserImage(roles[0] || '')}
          alt="Foto do usuário"
          className="user-photo"
        />
        <div className="user-info">
          <span className="user-name">{user.nome || 'Usuário'}</span>
          {roles.length > 0 && <span className="user-role">{roles.join(', ')}</span>}
        </div>
      </div>

      <button className="toggle-btn" onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? '→' : '←'}
      </button>
    </aside>
  );
}

export default Sidebar;
