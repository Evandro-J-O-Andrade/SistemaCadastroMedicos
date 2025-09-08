import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import LogoAlpha from "../img/Logo_Alpha.png"; // sua logo

export default function Login({ setUsuarioLogado, setUsuarioAtual }) {
  const [usuarioInput, setUsuarioInput] = useState("");
  const [senhaInput, setSenhaInput] = useState("");
  const navigate = useNavigate();

  const handleLogin = () => {
    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
    const usuario = usuarios.find(
      (u) => u.usuario === usuarioInput && u.senha === senhaInput
    );

    if (usuario) {
      localStorage.setItem("usuarioLogado", "true");
      localStorage.setItem("usuarioAtual", JSON.stringify(usuario));
      setUsuarioLogado(true);
      setUsuarioAtual(usuario);

      // Verifica se é o primeiro login para trocar a senha
      if (usuario.primeiroLogin) {
        navigate("/troca-senha");
        return;
      }

      // Redireciona conforme role
      if (usuario.role === "usuario") {
        navigate("/relatorios");
      } else {
        navigate("/");
      }
    } else {
      alert("Usuário ou senha incorretos!");
    }
  };

  return (
    <div
      style={{
        maxWidth: "300px",
        margin: "50px auto",
        padding: "20px",
        border: "1px solid #ccc",
        borderRadius: "10px",
        textAlign: "center",
      }}
    >
      <img
        src={LogoAlpha}
        alt="Logo do Sistema"
        style={{ width: "120px", marginBottom: "20px" }}
      />
      <h2>Login</h2>
      <label>Usuário:</label>
      <input
        type="text"
        value={usuarioInput}
        onChange={(e) => setUsuarioInput(e.target.value)}
        style={{ width: "100%", padding: "6px", marginBottom: "10px" }}
      />
      <label>Senha:</label>
      <input
        type="password"
        value={senhaInput}
        onChange={(e) => setSenhaInput(e.target.value)}
        style={{ width: "100%", padding: "6px", marginBottom: "10px" }}
      />
      <button
        onClick={handleLogin}
        style={{
          width: "100%",
          padding: "8px",
          backgroundColor: "#2980b9",
          color: "#fff",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        Entrar
      </button>
    </div>
  );
}
