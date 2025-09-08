import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";

import Login from "./pages/Login";
import Home from "./pages/Home";
import Medicos from "./pages/Medicos";
import Plantao from "./pages/Plantao";
import Relatorios from "./pages/Relatorios";
import Filtros from "./pages/Filtros";
import CadastroEmLote from "./pages/CadastroEmLote";
import CadastroUsuarios from "./pages/CadastroUsuarios";

import "./App.css";

function App() {
  const navigate = useNavigate();

  // estados globais
  const [usuarioLogado, setUsuarioLogado] = useState(false);
  const [usuarioAtual, setUsuarioAtual] = useState(null);

  // checa login ao iniciar
  useEffect(() => {
    const logado = localStorage.getItem("usuarioLogado") === "true";
    const atual = JSON.parse(localStorage.getItem("usuarioAtual"));
    setUsuarioLogado(logado);
    setUsuarioAtual(atual);

    if (!logado && window.location.pathname !== "/login") {
      navigate("/login");
    }
  }, [navigate]);

  // função de logoff
  const handleLogoff = () => {
    localStorage.removeItem("usuarioLogado");
    localStorage.removeItem("usuarioAtual");
    setUsuarioLogado(false);
    setUsuarioAtual(null);
    navigate("/login");
  };

  return (
    <div className="app">
      {/* Header com logoff */}
      <Header usuarioAtual={usuarioAtual} handleLogoff={handleLogoff} />

      <div className="main-layout">
        {/* Sidebar com roles */}
        <Sidebar usuarioAtual={usuarioAtual} />

        <main>
          <Routes>
            <Route path="/login" element={<Login setUsuarioLogado={setUsuarioLogado} setUsuarioAtual={setUsuarioAtual} />} />
            <Route path="/" element={usuarioLogado ? <Home /> : <Login setUsuarioLogado={setUsuarioLogado} setUsuarioAtual={setUsuarioAtual} />} />
            <Route path="/medicos" element={usuarioAtual && (usuarioAtual.role === "admin" || usuarioAtual.role === "suporte") ? <Medicos /> : <Login setUsuarioLogado={setUsuarioLogado} setUsuarioAtual={setUsuarioAtual} />} />
            <Route path="/plantao" element={usuarioAtual && (usuarioAtual.role === "admin" || usuarioAtual.role === "suporte") ? <Plantao /> : <Login setUsuarioLogado={setUsuarioLogado} setUsuarioAtual={setUsuarioAtual} />} />
            <Route path="/relatorios" element={usuarioLogado ? <Relatorios /> : <Login setUsuarioLogado={setUsuarioLogado} setUsuarioAtual={setUsuarioAtual} />} />
            <Route path="/filtros" element={usuarioLogado ? <Filtros /> : <Login setUsuarioLogado={setUsuarioLogado} setUsuarioAtual={setUsuarioAtual} />} />
            <Route path="/cadastro-lote" element={usuarioAtual && (usuarioAtual.role === "admin" || usuarioAtual.role === "suporte") ? <CadastroEmLote /> : <Login setUsuarioLogado={setUsuarioLogado} setUsuarioAtual={setUsuarioAtual} />} />
            <Route path="/cadastro-usuarios" element={usuarioAtual && usuarioAtual.role === "admin" ? <CadastroUsuarios /> : <Login setUsuarioLogado={setUsuarioLogado} setUsuarioAtual={setUsuarioAtual} />} />
          </Routes>
        </main>
      </div>

      <Footer />
    </div>
  );
}

export default App;
