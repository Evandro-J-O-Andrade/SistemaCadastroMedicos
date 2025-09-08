import React from "react";
import { Navigate } from "react-router-dom";

export default function PrivateRoute({ children }) {
  const usuarioLogado = localStorage.getItem("usuarioLogado") === "true";

  if (!usuarioLogado) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
