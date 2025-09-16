import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import LogoAlpha from "../img/Logo_Alpha.png";
import "./Login.css";

export default function Login({ setUsuarioLogado, setUsuarioAtual }) {
  const [usuarioInput, setUsuarioInput] = useState("");
  const [senhaInput, setSenhaInput] = useState("");
  const [erro, setErro] = useState(false);
  const [recuperarSenha, setRecuperarSenha] = useState(false);
  const [usuarioRecuperacao, setUsuarioRecuperacao] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const isLocal = window.location.hostname === "localhost";
  const phpUrl = "http://localhost/sistemaCadastroMedicos/backend/enviar_email.php";
  const netlifyApiUrl = "/api/enviarEmail"; // Função serverless

  // LOGIN
  const handleLogin = (e) => {
    e.preventDefault();
    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    const usuario = usuarios.find(
      (u) =>
        u.usuario.toLowerCase() === usuarioInput.toLowerCase() &&
        u.senha === senhaInput
    );

    if (usuario) {
      localStorage.setItem("usuarioLogado", "true");
      localStorage.setItem("usuarioAtual", JSON.stringify(usuario));
      setUsuarioLogado(true);
      setUsuarioAtual(usuario);
      setErro(false);

      if (usuario.primeiroLogin) navigate("/troca-senha");
      else if (usuario.role === "usuario") navigate("/relatorios");
      else navigate("/");
    } else {
      setErro(true);
    }
  };

  // RECUPERAR SENHA
  const handleRecuperarSenha = async (e) => {
    e.preventDefault();
    const usuarios = JSON.parse(localStorage.getItem("usuarios") || "[]");
    const usuarioExiste = usuarios.some(
      (u) => u.usuario.toLowerCase() === usuarioRecuperacao.toLowerCase()
    );

    if (!usuarioExiste) {
      alert("Usuário não encontrado!");
      return;
    }

    setLoading(true);

    try {
      if (isLocal) {
        const formData = new FormData();
        formData.append("usuario", usuarioRecuperacao);

        const response = await fetch(phpUrl, { method: "POST", body: formData });
        const result = await response.json();
        if (result.status === "success") alert("Pedido de recuperação enviado com sucesso!");
        else alert("Erro: " + result.message);
      } else {
        // Netlify Serverless
        const response = await fetch(netlifyApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usuario: usuarioRecuperacao }),
        });
        const result = await response.json();
        if (result.status === "success") alert(result.message);
        else alert("Erro: " + result.message);
      }
    } catch (err) {
      alert("Erro ao enviar: " + (err.message || err));
    }

    setUsuarioRecuperacao("");
    setRecuperarSenha(false);
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <img src={LogoAlpha} alt="Logo do Sistema" className="login-logo" />
      </div>
      <div className="login-right">
        {!recuperarSenha ? (
          <form onSubmit={handleLogin} className="login-form">
            <h2 className="login-title">Login</h2>
            <input
              type="text"
              placeholder="Usuário"
              value={usuarioInput}
              onChange={(e) => setUsuarioInput(e.target.value.toUpperCase())}
              className={`login-input ${erro ? "input-erro" : ""}`}
              required
            />
            <input
              type="password"
              placeholder="Senha"
              value={senhaInput}
              onChange={(e) => setSenhaInput(e.target.value)}
              className={`login-input ${erro ? "input-erro" : ""}`}
              required
            />
            <button type="submit" className="login-btn">Entrar</button>
            {erro && <p className="login-erro">Usuário ou senha incorretos!</p>}
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
