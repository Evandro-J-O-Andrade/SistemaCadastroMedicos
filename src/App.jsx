import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";
import PrivateRoute from "./components/PrivateRoute"; // ← AQUI VAI O COMPONENTE QUE A GENTE CRIOU

import Login from "./pages/Login";
import Home from "./pages/Home";
import Medicos from "./pages/Medicos";
import Plantao from "./pages/Plantao";
import Relatorios from "./pages/Relatorios";
import Filtros from "./pages/Filtros";
import CadastroEmLote from "./pages/CadastroEmLote";
import CadastroUsuarios from "./pages/CadastroUsuarios";
import TrocaSenha from "./pages/TrocaSenha";

import "./App.css";
import "./pages/mobile.css";

function App() {
  const navigate = useNavigate();

  const [usuarioLogado, setUsuarioLogado] = useState(false);
  const [usuarioAtual, setUsuarioAtual] = useState(null);

  // Verifica login ao carregar a página
  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const usuario = JSON.parse(sessionStorage.getItem("usuarioAtual") || "null");

    if (token && usuario) {
      setUsuarioLogado(true);
      setUsuarioAtual(usuario);

      // Redireciona pra troca de senha se for primeiro login
      if (usuario.primeiroLogin && window.location.pathname !== "/troca-senha") {
        navigate("/troca-senha");
      }
    } else {
      setUsuarioLogado(false);
      setUsuarioAtual(null);
      if (window.location.pathname !== "/login") {
        navigate("/login");
      }
    }
  }, [navigate]);

  const handleLogoff = () => {
    sessionStorage.clear();
    setUsuarioLogado(false);
    setUsuarioAtual(null);
    navigate("/login");
  };

  return (
    <div className="app">
      <Header usuarioAtual={usuarioAtual} handleLogoff={handleLogoff} />

      <div className="main-layout">
        {usuarioLogado && <Sidebar usuarioAtual={usuarioAtual} />}

        <main>
          <Routes>
            {/* Página pública */}
            <Route path="/login" element={<Login setUsuarioLogado={setUsuarioLogado} setUsuarioAtual={setUsuarioAtual} />} />

            {/* Troca de senha (acessível só se primeiroLogin = true) */}
            <Route path="/troca-senha" element={<TrocaSenha />} />

            {/* Rotas protegidas com PrivateRoute */}
            <Route element={<PrivateRoute />}>
              <Route path="/" element={<Home />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/filtros" element={<Filtros />} />
            </Route>

            {/* Só admin e suporte */}
            <Route element={<PrivateRoute allowedRoles={["admin", "suporte"]} />}>
              <Route path="/medicos" element={<Medicos />} />
              <Route path="/plantao" element={<Plantao />} />
              <Route path="/cadastro-lote" element={<CadastroEmLote />} />
            </Route>

            {/* Apenas admin */}
            <Route element={<PrivateRoute allowedRoles={["admin"]} />}>
              <Route path="/cadastro-usuarios" element={<CadastroUsuarios />} />
            </Route>

            {/* 404 - Página não encontrada */}
            <Route path="*" element={<div style={{ padding: "50px", textAlign: "center" }}><h2>Página não encontrada</h2></div>} />
          </Routes>
        </main>
      </div>

      <Footer />
    </div>
  );
}

export default App;