// src/pages/TrocaSenha.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './mobile.css';
import './Login.css';

export default function TrocaSenha() {
  const [senhaInput, setSenhaInput] = useState('');
  const [confSenhaInput, setConfSenhaInput] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [loading, setLoading] = useState(false);

  const { updatePassword, signOut } = useAuth();
  const navigate = useNavigate();

  const handleTrocarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setSucesso(false);
    setLoading(true);

    if (!senhaInput || senhaInput.length < 6) {
      setErro('A senha deve ter no mínimo 6 caracteres');
      setLoading(false);
      return;
    }
    if (senhaInput !== confSenhaInput) {
      setErro('As senhas não coincidem');
      setLoading(false);
      return;
    }

    try {
      await updatePassword(senhaInput);
      setSucesso(true);
      setTimeout(() => {
        signOut();
        navigate('/login');
      }, 1500);
    } catch (err: any) {
      setErro(err.message || 'Erro ao trocar senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-left" />
      <div className="login-right">
        <form onSubmit={handleTrocarSenha} className="login-form">
          <h2 className="login-title">Troca de Senha</h2>

          <input
            type="password"
            placeholder="Nova senha"
            value={senhaInput}
            onChange={(e) => setSenhaInput(e.target.value)}
            className={`login-input ${erro ? 'input-erro' : ''}`}
            required
            autoFocus
          />

          <input
            type="password"
            placeholder="Confirmar nova senha"
            value={confSenhaInput}
            onChange={(e) => setConfSenhaInput(e.target.value)}
            className={`login-input ${erro ? 'input-erro' : ''}`}
            required
          />

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Atualizando...' : 'Atualizar Senha'}
          </button>

          {erro && <p className="login-erro">{erro}</p>}
          {sucesso && <p className="login-erro" style={{ color: '#27ae60' }}>Senha atualizada com sucesso! Redirecionando...</p>}
        </form>
      </div>
    </div>
  );
}
