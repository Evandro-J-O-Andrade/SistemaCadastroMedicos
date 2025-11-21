import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import LogoAlpha from "../img/Logo_Alpha.png";
import "./mobile.css";
import "./Login.css";

export default function Login({ setUsuarioLogado, setUsuarioAtual }) {
  const [usuarioInput, setUsuarioInput] = useState("");
  const [senhaInput, setSenhaInput] = useState("");
  const [erro, setErro] = useState("");
  const [recuperarSenha, setRecuperarSenha] = useState(false);
  const [usuarioRecuperacao, setUsuarioRecuperacao] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Detecta ambiente
  const isLocal = window.location.hostname === "localhost";
  const isPortfolio = window.location.hostname.includes("portfolio"); // mais flexível
  const isProd = !isLocal && !isPortfolio;

  // URLs do backend
  const backendLocalUrl = "http://localhost:5000";
  const backendProdUrl = "https://seu-backend-aqui.com"; // <<<<<< COLOQUE AQUI QUANDO TIVER

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro("");
    setLoading(true);

    // Modo portfólio (offline/demo)
    if (isPortfolio) {
      const usuarios = JSON.parse(localStorage.getItem("usuarios") || "[]");
      const usuario = usuarios.find(
        (u) => u.usuario.toLowerCase() === usuarioInput.trim().toLowerCase() && u.senha === senhaInput
      );

      if (!usuario) {
        setErro("Usuário ou senha incorretos");
        setLoading(false);
        return;
      }

      sessionStorage.setItem("usuarioLogado", "true");
      sessionStorage.setItem("usuarioAtual", JSON.stringify(usuario));
      setUsuarioLogado(true);
      setUsuarioAtual(usuario);

      if (usuario.primeiroLogin) navigate("/troca-senha");
      else if (usuario.role === "usuario" || usuario.tipo === "usuario") navigate("/relatorios");
      else navigate("/");
      setLoading(false);
      return;
    }

    // Login real com backend
    const url = `${isLocal ? backendLocalUrl : backendProdUrl}/auth/login`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario: usuarioInput.trim(),     // já aceita tudo graças ao backend flexível
          senha: senhaInput
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErro(data.error || data.message || "Erro no login");
        setLoading(false);
        return;
      }

      // Sucesso!
      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("usuarioAtual", JSON.stringify(data.usuario));
      setUsuarioAtual(data.usuario);
      setUsuarioLogado(true);

      if (data.usuario.primeiroLogin) {
        navigate("/troca-senha");
      } else if (data.usuario.role === "usuario") {
        navigate("/relatorios");
      } else {
        navigate("/");
      }
    } catch (err) {
      console.error("Erro fatal no login:", err);
      setErro("Falha na conexão com o servidor");
    } finally {
      setLoading(false);
    }
  };

  // Recuperação de senha (simplificada e limpa)
  const handleRecuperarSenha = async (e) => {
    e.preventDefault();
    setErro("");
    setLoading(true);

    // Em produção você vai usar EmailJS ou sua rota /auth/recuperar-senha
    alert("Funcionalidade em desenvolvimento :)"); // temporário

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
              placeholder="Usuário"
              value={usuarioInput}
              onChange={(e) => setUsuarioInput(e.target.value)}
              className={`login-input ${erro ? "input-erro" : ""}`}
              required
              autoFocus
            />

            <input
              type="password"
              placeholder="Senha"
              value={senhaInput}
              onChange={(e) => setSenhaInput(e.target.value)}
              className={`login-input ${erro ? "input-erro" : ""}`}
              required
            />

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
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
              {loading ? "Enviando..." : "Enviar"}
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