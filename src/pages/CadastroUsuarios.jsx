import React, { useState, useEffect } from "react";
import "./CadastroUsuarios.css";

export default function CadastroUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioInput, setUsuarioInput] = useState("");
  const [senhaInput, setSenhaInput] = useState("");
  const [confSenhaInput, setConfSenhaInput] = useState("");
  const [roleInput, setRoleInput] = useState("comum");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("");
  const [usuariosExibir, setUsuariosExibir] = useState([]);
  const [editId, setEditId] = useState(null);

  // Carregar usuários do localStorage
  useEffect(() => {
    const dados = JSON.parse(localStorage.getItem("usuarios") || "[]");
    setUsuarios(dados);
  }, []);

  const salvarUsuario = () => {
    if (!usuarioInput || !senhaInput || !confSenhaInput) {
      alert("Preencha todos os campos!");
      return;
    }
    if (senhaInput !== confSenhaInput) {
      alert("As senhas não coincidem!");
      return;
    }

    if (editId !== null) {
      // Atualiza usuário existente
      const novosUsuarios = usuarios.map(u =>
        u.id === editId
          ? { ...u, usuario: usuarioInput, senha: senhaInput, role: roleInput }
          : u
      );
      setUsuarios(novosUsuarios);
      localStorage.setItem("usuarios", JSON.stringify(novosUsuarios));
      setEditId(null);
    } else {
      // Cria novo usuário
      const novoUsuario = {
        id: Date.now(),
        usuario: usuarioInput,
        senha: senhaInput,
        role: roleInput
      };
      const novosUsuarios = [...usuarios, novoUsuario];
      setUsuarios(novosUsuarios);
      localStorage.setItem("usuarios", JSON.stringify(novosUsuarios));
    }

    limparCampos();
  };

  const editarUsuario = (usuario) => {
    setEditId(usuario.id);
    setUsuarioInput(usuario.usuario);
    setSenhaInput(usuario.senha);
    setConfSenhaInput(usuario.senha);
    setRoleInput(usuario.role);
    setUsuariosExibir([usuario]); // mostra apenas o usuário selecionado
  };

  const excluirUsuario = (id) => {
    if (window.confirm("Deseja realmente excluir este usuário?")) {
      const novosUsuarios = usuarios.filter(u => u.id !== id);
      setUsuarios(novosUsuarios);
      localStorage.setItem("usuarios", JSON.stringify(novosUsuarios));
      setUsuariosExibir([]);
      limparCampos();
    }
  };

  const pesquisarUsuarios = () => {
    const filtrados = usuarios.filter(u =>
      (busca ? u.usuario.toLowerCase().includes(busca.toLowerCase()) : true) &&
      (filtro ? u.role === filtro : true)
    );
    setUsuariosExibir(filtrados);
  };

  const limparCampos = () => {
    setUsuarioInput("");
    setSenhaInput("");
    setConfSenhaInput("");
    setRoleInput("comum");
    setEditId(null);
    setUsuariosExibir([]);
  };

  return (
    <div className="cadastro-usuarios-container">
      <h2>{editId !== null ? "Editar Usuário" : "Cadastro de Usuário"}</h2>

      <div className="form-usuario">
        <input
          type="text"
          placeholder="Nome do usuário"
          value={usuarioInput}
          onChange={e => setUsuarioInput(e.target.value)}
        />
        <input
          type="password"
          placeholder="Senha"
          value={senhaInput}
          onChange={e => setSenhaInput(e.target.value)}
        />
        <input
          type="password"
          placeholder="Confirmar senha"
          value={confSenhaInput}
          onChange={e => setConfSenhaInput(e.target.value)}
        />
        <select value={roleInput} onChange={e => setRoleInput(e.target.value)}>
          <option value="comum">Usuário Comum</option>
          <option value="suporte">Suporte</option>
          <option value="admin">Administrador</option>
        </select>

        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={salvarUsuario} style={{ flex: 1 }}>
            {editId !== null ? "Atualizar" : "Cadastrar"}
          </button>
          <button onClick={limparCampos} style={{ flex: 1, backgroundColor: "#e42525ff" }}>
            Limpar
          </button>
        </div>
      </div>

      <div className="busca-usuario">
        <h3>Buscar usuários</h3>
        <input
          type="text"
          placeholder="Buscar por nome"
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
        <select value={filtro} onChange={e => setFiltro(e.target.value)}>
          <option value="">Todos</option>
          <option value="comum">Comum</option>
          <option value="suporte">Suporte</option>
          <option value="admin">Admin</option>
        </select>
        <button onClick={pesquisarUsuarios}>Pesquisar</button>
      </div>

      {usuariosExibir.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Permissão</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuariosExibir.map(u => (
              <tr key={u.id}>
                <td>{u.usuario}</td>
                <td>{u.role}</td>
                <td>
                  <button onClick={() => editarUsuario(u)}>Editar</button>
                  <button onClick={() => excluirUsuario(u.id)} style={{ marginLeft: "5px", backgroundColor: "#e74c3c", color: "#fff" }}>
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {usuariosExibir.length === 0 && <p style={{ textAlign: "center", marginTop: "10px" }}>Nenhum usuário para exibir</p>}
    </div>
  );
}
