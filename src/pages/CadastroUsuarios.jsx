import React, { useState } from "react";
import "./CadastroUsuarios.css";

export default function CadastroUsuarios() {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [role, setRole] = useState("usuario"); // padrão usuário comum

  const handleCadastro = () => {
    if (!usuario || !senha || !confirmarSenha) {
      alert("Preencha todos os campos!");
      return;
    }

    if (senha !== confirmarSenha) {
      alert("As senhas não coincidem!");
      return;
    }

    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
    if (usuarios.find(u => u.usuario === usuario)) {
      alert("Usuário já existe!");
      return;
    }

    // adiciona campo 'primeiroLogin' para forçar troca de senha
    usuarios.push({ usuario, senha, role, primeiroLogin: true });
    localStorage.setItem("usuarios", JSON.stringify(usuarios));

    alert(`Usuário "${usuario}" cadastrado com sucesso como ${role}!`);
    
    setUsuario("");
    setSenha("");
    setConfirmarSenha("");
    setRole("usuario");
  };

  return (
    <div className="cadastro-container">
      <h2>Cadastro de Usuário</h2>

      <label>Nome do Usuário:</label>
      <input 
        type="text" 
        value={usuario} 
        onChange={e => setUsuario(e.target.value)} 
        placeholder="Digite o nome do usuário"
      />

      <label>Senha:</label>
      <input 
        type="password" 
        value={senha} 
        onChange={e => setSenha(e.target.value)} 
        placeholder="Digite a senha"
      />

      <label>Confirmar Senha:</label>
      <input 
        type="password" 
        value={confirmarSenha} 
        onChange={e => setConfirmarSenha(e.target.value)} 
        placeholder="Confirme a senha"
      />

      <label>Função / Permissão:</label>
      <select value={role} onChange={e => setRole(e.target.value)}>
        <option value="admin">Administrador</option>
        <option value="suporte">Suporte</option>
        <option value="usuario">Usuário Comum</option>
      </select>

      <button onClick={handleCadastro}>Cadastrar</button>
    </div>
  );
}
