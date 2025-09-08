import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Medicos.css";

function Medicos() {
  const navigate = useNavigate();
  const [medicos, setMedicos] = useState([]); // tabela exibida
  const [form, setForm] = useState({
    id: null,
    nome: "",
    especialidade: "",
    crm: "",
    observacao: "",
  });
  const [mensagem, setMensagem] = useState("");
  const [pesquisa, setPesquisa] = useState({
    nome: "",
    especialidade: "",
    crm: "",
  });
  const [pagina, setPagina] = useState(0);
  const LIMIT = 50;

  // Inicialmente tabela vazia
  useEffect(() => {
    setMedicos([]);
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nome || !form.especialidade) {
      alert("Nome e Especialidade são obrigatórios!");
      return;
    }

    const todosMedicos = JSON.parse(localStorage.getItem("medicos") || "[]");
    let novosMedicos;

    if (form.id) {
      novosMedicos = todosMedicos.map((m) => (m.id === form.id ? { ...form } : m));
      setMensagem("Médico atualizado com sucesso!");
    } else {
      if (form.crm) {
        const existeCRM = todosMedicos.some((m) => m.crm === form.crm);
        if (existeCRM) {
          alert("CRM já cadastrado!");
          return;
        }
      }
      const novoMedico = { ...form, id: Date.now() + Math.random() };
      novosMedicos = [...todosMedicos, novoMedico];
      setMensagem("Médico cadastrado com sucesso!");
    }

    localStorage.setItem("medicos", JSON.stringify(novosMedicos));
    setForm({ id: null, nome: "", especialidade: "", crm: "", observacao: "" });
    setTimeout(() => setMensagem(""), 3000);
  };

  const handleEditar = (medico) => {
    setForm(medico);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleExcluir = (id) => {
    const confirmado = window.confirm(
      "Tem certeza que deseja excluir este médico cadastrado?"
    );
    if (!confirmado) return;

    const todosMedicos = JSON.parse(localStorage.getItem("medicos") || "[]");
    const novosMedicos = todosMedicos.filter((m) => m.id !== id);
    localStorage.setItem("medicos", JSON.stringify(novosMedicos));
    setMedicos((prev) => prev.filter((m) => m.id !== id));

    setMensagem("Médico excluído com sucesso!");
    setTimeout(() => setMensagem(""), 3000);
  };

  const handlePesquisar = () => {
    const todosMedicos = JSON.parse(localStorage.getItem("medicos") || "[]");
    const filtrados = todosMedicos.filter((m) => {
      return (
        (!pesquisa.nome || m.nome.toLowerCase().includes(pesquisa.nome.toLowerCase())) &&
        (!pesquisa.especialidade || m.especialidade.toLowerCase().includes(pesquisa.especialidade.toLowerCase())) &&
        (!pesquisa.crm || m.crm.toLowerCase().includes(pesquisa.crm.toLowerCase()))
      );
    });

    setMedicos(filtrados.slice(0, LIMIT));
    setPagina(0);
  };

  const handleLimparPesquisa = () => {
    setPesquisa({ nome: "", especialidade: "", crm: "" });
    setMedicos([]);
    setPagina(0);
  };

  const handleProximaPagina = () => {
    const todosMedicos = JSON.parse(localStorage.getItem("medicos") || "[]");
    const totalPaginas = Math.ceil(todosMedicos.length / LIMIT);
    if (pagina + 1 < totalPaginas) {
      const novaPagina = pagina + 1;
      setMedicos(todosMedicos.slice(novaPagina * LIMIT, (novaPagina + 1) * LIMIT));
      setPagina(novaPagina);
    }
  };

  const handlePaginaAnterior = () => {
    const todosMedicos = JSON.parse(localStorage.getItem("medicos") || "[]");
    if (pagina > 0) {
      const novaPagina = pagina - 1;
      setMedicos(todosMedicos.slice(novaPagina * LIMIT, (novaPagina + 1) * LIMIT));
      setPagina(novaPagina);
    }
  };

  return (
    <div id="medicos-container">
      <h2>Médicos</h2>

      {mensagem && <p className="mensagem-sucesso">{mensagem}</p>}

      <form id="medicos-form" onSubmit={handleSubmit}>
        <input type="text" name="nome" placeholder="Nome do médico" value={form.nome} onChange={handleChange} />
        <input type="text" name="especialidade" placeholder="Especialidade" value={form.especialidade} onChange={handleChange} />
        <input type="text" name="crm" placeholder="CRM (opcional)" value={form.crm} onChange={handleChange} />
        <input type="text" name="observacao" placeholder="Observação" value={form.observacao} onChange={handleChange} />
        <button type="submit" className="btn">{form.id ? "Atualizar Médico" : "Cadastrar Médico"}</button>
        <button type="button" className="btn" onClick={() => navigate("/cadastro-lote")}>Cadastrar em Lote</button>
      </form>

      <h3>Pesquisar Médicos</h3>
      <div id="buscar-container">
        <input type="text" placeholder="Nome" value={pesquisa.nome} onChange={(e) => setPesquisa({ ...pesquisa, nome: e.target.value })} />
        <input type="text" placeholder="Especialidade" value={pesquisa.especialidade} onChange={(e) => setPesquisa({ ...pesquisa, especialidade: e.target.value })} />
        <input type="text" placeholder="CRM" value={pesquisa.crm} onChange={(e) => setPesquisa({ ...pesquisa, crm: e.target.value })} />
        <button onClick={handlePesquisar} className="btn-pesquisar">Pesquisar</button>
        <button onClick={handleLimparPesquisa} className="btn-limpar">Limpar</button>
      </div>

      <div id="tabela-container">
        <table id="tabela-medicos">
          <thead>
            <tr>
              <th>#</th>
              <th>Nome</th>
              <th>Especialidade</th>
              <th>CRM</th>
              <th>Observação</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {medicos.map((m, i) => (
              <tr key={m.id}>
                <td>{i + 1 + pagina * LIMIT}</td>
                <td>{m.nome}</td>
                <td>{m.especialidade}</td>
                <td>{m.crm}</td>
                <td>{m.observacao}</td>
                <td>
                  <button onClick={() => handleEditar(m)} className="btn-editar">Editar</button>
                  <button onClick={() => handleExcluir(m.id)} className="btn-excluir">Excluir</button>
                </td>
              </tr>
            ))}
            {medicos.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: "center" }}>Nenhum médico encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>

        <div id="paginacao-container">
          <button onClick={handlePaginaAnterior} className="btn">Página Anterior</button>
          <button onClick={handleProximaPagina} className="btn">Próxima Página</button>
        </div>
      </div>
    </div>
  );
}

export default Medicos;
