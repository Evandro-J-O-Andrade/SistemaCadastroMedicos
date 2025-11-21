import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function TrocaSenha() {
  const navigate = useNavigate();
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const token = sessionStorage.getItem("token");

  const handleTroca = async (e) => {
    e.preventDefault();
    setErro("");

    if (novaSenha !== confirmarSenha) {
      setErro("As senhas não coincidem");
      return;
    }
    if (novaSenha.length < 6) {
      setErro("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/auth/troca-primeiro-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ novaSenha }),
      });

      const data = await res.json();

      if (res.ok) {
        // Atualiza o usuarioAtual no sessionStorage pra tirar o primeiroLogin
        const usuarioAtual = JSON.parse(sessionStorage.getItem("usuarioAtual"));
        usuarioAtual.primeiroLogin = false;
        sessionStorage.setItem("usuarioAtual", JSON.stringify(usuarioAtual));

        alert("Senha alterada com sucesso! Bem-vindo ao sistema!");
        navigate("/");
      } else {
        setErro(data.erro || "Erro ao alterar senha");
      }
    } catch (err) {
      setErro("Erro de conexão com o servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "100px auto", textAlign: "center" }}>
      <h2>Primeiro Acesso – Troca de Senha Obrigatória</h2>
      <form onSubmit={handleTroca}>
        <input
          type="password"
          placeholder="Nova senha (mín. 6 caracteres)"
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
          required
          style={{ width: "100%", padding: "10px", margin: "10px 0" }}
        />
        <input
          type="password"
          placeholder="Confirme a nova senha"
          value={confirmarSenha}
          onChange={(e) => setConfirmarSenha(e.target.value)}
          required
          style={{ width: "100%", padding: "10px", margin: "10px 0" }}
        />
        {erro && <p style={{ color: "red" }}>{erro}</p>}
        <button type="submit" disabled={loading} style={{ padding: "12px 40px" }}>
          {loading ? "Alterando..." : "Alterar Senha e Entrar"}
        </button>
      </form>
    </div>
  );
}