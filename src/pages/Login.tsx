// src/pages/Login.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LogoAlpha from '../img/Logo_Alpha.png';
import { useAuth } from '../hooks/useAuth';
import { AUTH_ERRORS } from '../lib/authConfig';
import './mobile.css';
import './Login.css';

export default function Login() {
  const [usuarioInput, setUsuarioInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [erro, setErro] = useState('');
  const [recuperarSenha, setRecuperarSenha] = useState(false);
  const [usuarioRecuperacao, setUsuarioRecuperacao] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { signIn, error } = useAuth();

  // Propaga erros globais de auth (ex: sessão expirada) para o erro do formulário
  useEffect(() => {
    if (error && !erro) {
      setErro(error.message);
    }
  }, [error, erro]);

  const clearErro = () => setErro('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErro();
    setLoading(true);

    try {
      await signIn(usuarioInput.trim(), senhaInput);
      navigate('/');
    } catch (err: unknown) {
      const mapped =
        err && typeof err === 'object' && 'code' in err && 'message' in err
          ? (err as { code: string; message: string })
          : { code: AUTH_ERRORS.SERVICE_ERROR, message: String(err ?? 'Erro desconhecido') };

      if (mapped.code === AUTH_ERRORS.EMAIL_NOT_CONFIRMED) {
        setErro('E-mail não confirmado. Verifique sua caixa de entrada.');
      } else if (mapped.code === AUTH_ERRORS.IDENTITY_NOT_LINKED) {
        setErro('Sua conta não está vinculada a uma pessoa cadastrada. Procure o administrador.');
      } else if (mapped.code === AUTH_ERRORS.PESSOA_INATIVA) {
        setErro('Sua pessoa está desativada. Procure o administrador.');
      } else if (mapped.code === AUTH_ERRORS.NO_ACTIVE_ROLE) {
        setErro('Você não possui papel/permissão ativo no sistema.');
      } else if (mapped.code === AUTH_ERRORS.INVALID_CREDENTIALS) {
        setErro('E-mail ou senha inválidos, ou conta não disponível.');
      } else {
        setErro(mapped.message || 'Não foi possível autenticar. Verifique suas credenciais e o status da conta.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRecuperarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErro();
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
              onChange={(e) => { setUsuarioInput(e.target.value); clearErro(); }}
              className={`login-input ${erro ? 'input-erro' : ''}`}
              required
              autoFocus
            />

            <input
              type="password"
              placeholder="Senha"
              value={senhaInput}
              onChange={(e) => { setSenhaInput(e.target.value); clearErro(); }}
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
