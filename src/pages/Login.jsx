import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import emailjs from "emailjs-com";
import LogoAlpha from "../img/Logo_Alpha.png"; // imagem estática na pasta src/img
import "./mobile.css"
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
  const isNetlify = window.location.hostname === "gestaomedicaalpha.netlify.app";
  const phpUrl = "http://localhost/sistemaCadastroMedicos/backend/enviar_email.php";

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
      // sessionStorage com expiração de 1 hora
      const expiracao = Date.now() + 60 * 60 * 1000; // 1 hora em ms
      sessionStorage.setItem("usuarioLogado", "true");
      sessionStorage.setItem("usuarioAtual", JSON.stringify(usuario));
      sessionStorage.setItem("expiracao", expiracao);

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
        if (result.status === "success")
          alert("Pedido de recuperação enviado com sucesso!");
        else alert("Erro: " + result.message);
      } else if (isNetlify) {
        await emailjs.send(
          "service_trkfvyq",
          "template_9dfcv64",
          { usuario: usuarioRecuperacao },
          "X7aajxkKsYymYEHI1"
        );
        alert("Pedido de recuperação enviado com sucesso!");
      } else {
        alert("Ambiente não configurado para recuperação de senha.");
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
      {/* Lado esquerdo - Logo maior */}
      <div className="login-left">
        <img src={LogoAlpha} alt="Logo do Sistema" className="login-logo" />
      </div>

      {/* Lado direito - Formulário */}
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
