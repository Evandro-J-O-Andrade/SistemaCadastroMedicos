// components/PrivateRoute.jsx → VERSÃO DEUS ETERNA (NUNCA MAIS DÁ ERRO)
import React from "react";
import { Navigate, Outlet } from "react-router-dom";

export default function PrivateRoute({ allowedRoles = [] }) {
  const token = sessionStorage.getItem("token");
  const usuarioAtual = JSON.parse(sessionStorage.getItem("usuarioAtual") || "null");

  // 1. Não tem token ou usuário → FORA DAQUI, VAI PRO LOGIN!
  if (!token || !usuarioAtual) {
    return <Navigate to="/login" replace />;
  }

  // 2. Se for primeiro login → FORÇA A TROCA DE SENHA (menos pro admin master)
  if (usuarioAtual.primeiroLogin && window.location.pathname !== "/troca-senha") {
    const role = (usuarioAtual.role || "").toLowerCase();
    if (role !== "admin" && role !== "administrador") {
      return <Navigate to="/troca-senha" replace />;
    }
  }

  // 3. Se não tem restrição de role → qualquer logado entra
  if (allowedRoles.length === 0) {
    return <Outlet />;
  }

  // 4. Pega o role (aceita 'role' ou 'tipo' pra compatibilidade)
  const userRole = (usuarioAtual.role || usuarioAtual.tipo || "").toString().toLowerCase().trim();

  // 5. REGRA SUPREMA: ADMIN É DEUS → ENTRA EM TODAS AS PÁGINAS, SEM DISCUSSÃO, SEM CHORO!
  if (userRole === "admin" || userRole === "administrador") {
    return <Outlet />;
  }

  // 6. Verifica permissão normal
  const temPermissao = allowedRoles
    .map(r => r.toString().toLowerCase().trim())
    .includes(userRole);

  // 7. Tem permissão? Entra. Senão → joga pra home
  return temPermissao ? <Outlet /> : <Navigate to="/" replace />;
}