import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function TrocaSenha() {
  const navigate = useNavigate();
  const usuarioAtual = JSON.parse(localStorage.getItem("usuarioAtual"));
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  const handleTroca = () => {
    if (!novaSenha || !confirmarSenha) {
      alert("Preencha todos os campos!");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      alert("As senhas não coincidem!");
      return;
    }

    const usuarios = JSON.parse(localStorage.getItem("usuarios"));
    const index = usuarios.findIndex(u => u.usuario === usuarioAtual.usuario);

    usuarios[index].senha = novaSenha;
    usuarios[index].primeiroLogin = false;

    localStorage.setItem("usuarios", JSON.stringify(usuarios));
    localStorage.setItem("usuarioAtual", JSON.stringify(usuarios[index]));

    alert("Senha alterada com sucesso!");
    navigate("/"); // volta para home
  };

  return (
    <div className="cadastro-container">
      <h2>Trocar Senha - Primeiro Login</h2>
      <label>Nova Senha:</label>
      <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} />
      <label>Confirmar Nova Senha:</label>
      <input type="password" value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} />
      <button onClick={handleTroca}>Atualizar Senha</button>
    </div>
  );
}
