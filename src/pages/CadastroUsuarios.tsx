// src/pages/CadastroUsuarios.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import './CadastroUsuarios.css';
import './mobile.css';

export default function CadastroUsuarios() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [usuarioInput, setUsuarioInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [confSenhaInput, setConfSenhaInput] = useState('');
  const [roleInput, setRoleInput] = useState('comum');
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('');
  const [usuariosExibir, setUsuariosExibir] = useState<any[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState('');

  const { signIn } = useAuth();

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    try {
      const { data, error } = await supabase
        .from('role_assignments')
        .select('*, person:people(*), roles(nome)')
        .eq('ativo', true);

      if (!error && data) {
        const lista = data.map((a: any) => ({
          id: a.person.id,
          usuario: a.person.nome,
          email: a.person.email,
          role: a.roles?.nome || 'comum',
          ativo: a.ativo,
        }));
        setUsuarios(lista);
        setUsuariosExibir(lista);
      }
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    }
  };

  const salvarUsuario = async () => {
    if (!usuarioInput || !emailInput || !senhaInput || !confSenhaInput) {
      setMensagem('Preencha todos os campos!');
      return;
    }
    if (senhaInput !== confSenhaInput) {
      setMensagem('As senhas não coincidem!');
      return;
    }

    try {
      if (editId) {
        // Atualizar usuário existente via RPC segura
        await supabase.rpc('fn_atualizar_pessoa', {
          p_person_id: editId,
          p_nome: usuarioInput,
          p_email: emailInput
        });
        setMensagem('Usuário atualizado com sucesso!');
      } else {
        // Criar novo usuário via Supabase Auth
        const { data, error } = await supabase.auth.signUp({
          email: emailInput,
          password: senhaInput,
          options: { data: { nome: usuarioInput } },
        });
        if (error) throw error;
        setMensagem('Usuário cadastrado com sucesso!');
      }
      limparCampos();
      await carregarUsuarios();
    } catch (err: any) {
      setMensagem('Erro ao salvar usuário: ' + err.message);
    }
  };

  const editarUsuario = (usuario: any) => {
    setEditId(usuario.id);
    setUsuarioInput(usuario.usuario);
    setEmailInput(usuario.email || '');
    setRoleInput(usuario.role);
    setUsuariosExibir([usuario]);
  };

  const excluirUsuario = async (id: string) => {
    if (window.confirm('Deseja realmente excluir este usuário?')) {
      try {
        await supabase.rpc('fn_desativar_usuario', { p_person_id: id });
        setMensagem('Usuário desativado com sucesso!');
        await carregarUsuarios();
      } catch (err: any) {
        setMensagem('Erro ao excluir usuário: ' + err.message);
      }
    }
  };

  const pesquisarUsuarios = () => {
    const filtrados = usuarios.filter(
      (u) =>
        (busca ? u.usuario.toLowerCase().includes(busca.toLowerCase()) : true) &&
        (filtro ? u.role === filtro : true)
    );
    setUsuariosExibir(filtrados);
  };

  const limparCampos = () => {
    setUsuarioInput('');
    setEmailInput('');
    setSenhaInput('');
    setConfSenhaInput('');
    setRoleInput('comum');
    setEditId(null);
    setUsuariosExibir([]);
    setMensagem('');
  };

  return (
    <div className="cadastro-usuarios-container">
      <h2>{editId !== null ? 'Editar Usuário' : 'Cadastro de Usuário'}</h2>

      {mensagem && (
        <div className="mensagem-container">
          <p className="mensagem-sucesso">{mensagem}</p>
          <button onClick={() => setMensagem('')} className="btn-fechar-mensagem">
            ×
          </button>
        </div>
      )}

      <div className="form-usuario">
        <input
          type="text"
          placeholder="Nome do usuário"
          value={usuarioInput}
          onChange={(e) => setUsuarioInput(e.target.value)}
        />
        <input
          type="email"
          placeholder="E-mail"
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
        />
        <input
          type="password"
          placeholder="Senha"
          value={senhaInput}
          onChange={(e) => setSenhaInput(e.target.value)}
        />
        <input
          type="password"
          placeholder="Confirmar senha"
          value={confSenhaInput}
          onChange={(e) => setConfSenhaInput(e.target.value)}
        />
        <select value={roleInput} onChange={(e) => setRoleInput(e.target.value)}>
          <option value="comum">Usuário Comum</option>
          <option value="suporte">Suporte</option>
          <option value="admin">Administrador</option>
        </select>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={salvarUsuario} style={{ flex: 1 }}>
            {editId !== null ? 'Atualizar' : 'Cadastrar'}
          </button>
          <button
            onClick={limparCampos}
            style={{ flex: 1, backgroundColor: '#e42525ff', color: '#fff' }}
          >
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
          onChange={(e) => setBusca(e.target.value)}
        />
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
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
              <th>E-mail</th>
              <th>Permissão</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuariosExibir.map((u) => (
              <tr key={u.id}>
                <td>{u.usuario}</td>
                <td>{u.email || '—'}</td>
                <td>{u.role}</td>
                <td>
                  <button onClick={() => editarUsuario(u)}>Editar</button>
                  <button
                    onClick={() => excluirUsuario(u.id)}
                    style={{ marginLeft: '5px', backgroundColor: '#e74c3c', color: '#fff' }}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {usuariosExibir.length === 0 && <p style={{ textAlign: 'center', marginTop: '10px' }}>Nenhum usuário para exibir</p>}
    </div>
  );
}
