// src/pages/Login.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LogoAlpha from '../img/Logo_Alpha.png';
import { useAuth } from '../hooks/useAuth';
import './mobile.css';
import './Login.css';

interface LoginProps {
  setUsuarioLogado: (v: boolean) => void;
  setUsuarioAtual: (u: any | null) => void;
}

export default function Login({ setUsuarioLogado, setUsuarioAtual }: LoginProps) {
  const [usuarioInput, setUsuarioInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [erro, setErro] = useState('');
  const [recuperarSenha, setRecuperarSenha] = useState(false);
  const [usuarioRecuperacao, setUsuarioRecuperacao] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { signIn } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setLoading(true);

    try {
      await signIn(usuarioInput.trim(), senhaInput);
      // useAuth já define o usuário. Aqui apenas redirecionamos.
      navigate('/');
      setUsuarioLogado(true);
    } catch (err: any) {
      setErro(err.message || 'Falha na conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleRecuperarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setLoading(true);
    alert('Funcionalidade em desenvolvimento :)');
    setLoading(false);
    setRecuperarSenha(false);
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <img src={LogoAlpha} alt="Logo Alpha" className="login-logo" />
      </div>

      <div className="login-right">
        {!recuperarSenha ? (
          <form onSubmit={handleLogin} className="login-form">
            <h2 className="login-title">Login</h2>

            <input
              type="text"
              placeholder="Usuário / E-mail"
              value={usuarioInput}
              onChange={(e) => setUsuarioInput(e.target.value)}
              className={`login-input ${erro ? 'input-erro' : ''}`}
              required
              autoFocus
            />

            <input
              type="password"
              placeholder="Senha"
              value={senhaInput}
              onChange={(e) => setSenhaInput(e.target.value)}
              className={`login-input ${erro ? 'input-erro' : ''}`}
              required
            />

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            {erro && <p className="login-erro">{erro}</p>}

            <p className="recuperar-senha" onClick={() => setRecuperarSenha(true)}>
              Esqueci minha senha
            </p>
          </form>
        ) : (
          <form onSubmit={handleRecuperarSenha} className="login-form">
            <h2 className="login-title">Recuperar Senha</h2>

            <input
              type="text"
              placeholder="Digite seu usuário"
              value={usuarioRecuperacao}
              onChange={(e) => setUsuarioRecuperacao(e.target.value)}
              className="login-input"
              required
            />

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar'}
            </button>

            <p className="recuperar-senha" onClick={() => setRecuperarSenha(false)}>
              Voltar ao login
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
