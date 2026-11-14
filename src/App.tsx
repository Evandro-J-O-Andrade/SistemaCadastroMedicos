// src/App.tsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Home from './pages/Home';
import Medicos from './pages/Medicos';
import Plantao from './pages/Plantao';
import Relatorios from './pages/Relatorios';
import Filtros from './pages/Filtros';
import CadastroEmLote from './pages/CadastroEmLote';
import CadastroUsuarios from './pages/CadastroUsuarios';
import TrocaSenha from './pages/TrocaSenha';

import './App.css';
import './pages/mobile.css';

function App() {
  const navigate = useNavigate();

  const [usuarioLogado, setUsuarioLogado] = useState(false);
  const [usuarioAtual, setUsuarioAtual] = useState<any>(null);

  useEffect(() => {
    // Com Supabase Auth, a sessão é gerenciada pelo useAuth hook.
    // Este estado é mantido para compatibilidade com o Header/Sidebar existentes.
  }, []);

  const handleLogoff = () => {
    setUsuarioLogado(false);
    setUsuarioAtual(null);
    navigate('/login');
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

            {/* Troca de senha (primeiro login) */}
            <Route path="/troca-senha" element={<TrocaSenha />} />

            {/* Rotas protegidas (qualquer usuário autenticado) */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Home />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/filtros" element={<Filtros />} />
            </Route>

            {/* Só admin e suporte */}
            <Route element={<ProtectedRoute allowedRoles={['admin', 'suporte']} />}>
              <Route path="/medicos" element={<Medicos />} />
              <Route path="/plantao" element={<Plantao />} />
              <Route path="/cadastro-lote" element={<CadastroEmLote />} />
            </Route>

            {/* Apenas admin */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/cadastro-usuarios" element={<CadastroUsuarios />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<div style={{ padding: '50px', textAlign: 'center' }}><h2>Página não encontrada</h2></div>} />
          </Routes>
        </main>
      </div>

      <Footer />
    </div>
  );
}

export default App;
