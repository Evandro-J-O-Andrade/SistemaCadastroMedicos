import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch } from "react-icons/fa";
import { especialidades, ordenarEspecialidades } from "../api/especialidades";
import "./Medicos.css";

const normalizeString = (str) => {
  if (!str) return "";
  return str.toUpperCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

function Medicos() {
  const navigate = useNavigate();
  const [medicos, setMedicos] = useState([]);
  const [form, setForm] = useState({
    id: null,
    nome: "",
    especialidade: "",
    crm: "",
    observacao: "",
  });
  const [mensagem, setMensagem] = useState("");
  const [erroCampos, setErroCampos] = useState({});
  const [pesquisa, setPesquisa] = useState({
    nome: "",
    especialidade: "",
    crm: "",
  });
  const [pagina, setPagina] = useState(0);
  const [listaVisivel, setListaVisivel] = useState(false);
  const [filtro, setFiltro] = useState("");
  const inputRef = useRef(null);
  const LIMIT = 50;

  useEffect(() => {
    setMedicos([]);
  }, []);

  useEffect(() => {
    const handleClickFora = (event) => {
      if (inputRef.current && !inputRef.current.contains(event.target)) {
        setListaVisivel(false);
      }
    };
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, []);

  const handleChange = (e) => {
    let valor = e.target.value.toUpperCase();
    if (e.target.name === "nome") {
      valor = normalizeString(valor); // Normaliza nome
    }
    setForm({ ...form, [e.target.name]: valor });
    if (erroCampos[e.target.name]) {
      setErroCampos({ ...erroCampos, [e.target.name]: false });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let camposFaltando = {};

    if (!form.nome) camposFaltando.nome = true;
    if (!form.especialidade) camposFaltando.especialidade = true;
    if (!form.crm) camposFaltando.crm = true;

    if (Object.keys(camposFaltando).length > 0) {
      setErroCampos(camposFaltando);
      setMensagem(
        "Preencha todos os campos obrigatórios (CRM, Nome e Especialidade)!"
      );
      setTimeout(() => setMensagem(""), 3000);
      return;
    }

    const todosMedicos = JSON.parse(localStorage.getItem("medicos") || "[]");

    if (!form.id) {
      const existeCRM = todosMedicos.some((m) => m.crm === form.crm);
      if (existeCRM) {
        setErroCampos({ crm: true });
        setMensagem("CRM já cadastrado! Escolha outro.");
        setTimeout(() => setMensagem(""), 3000);
        return;
      }
    }

    const espIndex = especialidades.findIndex(
      (e) => e.nome === form.especialidade
    );
    if (espIndex !== -1) {
      especialidades[espIndex].cadastros += 1;
    }

    let novosMedicos;
    if (form.id) {
      novosMedicos = todosMedicos.map((m) =>
        m.id === form.id ? { ...form } : m
      );
      setMensagem("Médico atualizado com sucesso!");
    } else {
      let novoId = 1;
      if (todosMedicos.length > 0) {
        const ids = todosMedicos.map((m) => m.idMedico || 0);
        novoId = Math.max(...ids) + 1;
      }

      const novoMedico = { ...form, idMedico: novoId, id: Date.now() + Math.random() };
      novosMedicos = [...todosMedicos, novoMedico];
      setMensagem("Médico cadastrado com sucesso!");
    }

    localStorage.setItem("medicos", JSON.stringify(novosMedicos));
    setForm({ id: null, nome: "", especialidade: "", crm: "", observacao: "" });
    setErroCampos({});
    setTimeout(() => setMensagem(""), 3000);
  };

  const handleEditar = (medico) => {
    setForm(medico);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleExcluir = (id) => {
    const confirmado = window.confirm(
      "Tem certeza que deseja excluir este médico?"
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
        (!pesquisa.nome ||
          normalizeString(m.nome).includes(normalizeString(pesquisa.nome))) &&
        (!pesquisa.especialidade ||
          normalizeString(m.especialidade).includes(normalizeString(pesquisa.especialidade))) &&
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
      setMedicos(
        todosMedicos.slice(novaPagina * LIMIT, (novaPagina + 1) * LIMIT)
      );
      setPagina(novaPagina);
    }
  };

  const handlePaginaAnterior = () => {
    const todosMedicos = JSON.parse(localStorage.getItem("medicos") || "[]");
    if (pagina > 0) {
      const novaPagina = pagina - 1;
      setMedicos(
        todosMedicos.slice(novaPagina * LIMIT, (novaPagina + 1) * LIMIT)
      );
      setPagina(novaPagina);
    }
  };

  const especialidadesFiltradas = ordenarEspecialidades(especialidades).filter(
    (item) =>
      filtro
        ? normalizeString(item.nome).includes(normalizeString(filtro))
        : true
  );

  return (
    <div id="medicos-container">
      <h2>Médicos</h2>

      {mensagem && <p className="mensagem-sucesso">{mensagem}</p>}

      <form id="medicos-form" onSubmit={handleSubmit}>
        <input
          type="text"
          name="nome"
          placeholder="Nome do médico"
          value={form.nome}
          onChange={handleChange}
          className={erroCampos.nome ? "campo-erro" : ""}
        />

        <div className="linha-especialidade-crm" ref={inputRef}>
          <div className="input-com-lupa">
            <input
              type="text"
              name="especialidade"
              placeholder="Especialidade"
              value={form.especialidade}
              onChange={(e) => {
                handleChange(e);
                setFiltro(e.target.value.toUpperCase());
                setListaVisivel(true);
              }}
              onFocus={() => setListaVisivel(true)}
              className={erroCampos.especialidade ? "campo-erro" : ""}
            />
            <button
              type="button"
              className="btn-lupa"
              onClick={() => {
                setFiltro("");
                setListaVisivel(true);
                setForm({ ...form, especialidade: "" });
              }}
            >
              <FaSearch />
            </button>

            {listaVisivel && (
              <ul className="lista-suspensa">
                {especialidadesFiltradas.length > 0 ? (
                  especialidadesFiltradas.map((item) => (
                    <li
                      key={item.id}
                      onClick={() => {
                        setForm({
                          ...form,
                          especialidade: item.nome.toUpperCase(),
                        });
                        setListaVisivel(false);
                        setFiltro("");
                      }}
                    >
                      {item.nome.toUpperCase()}
                    </li>
                  ))
                ) : filtro.trim() !== "" ? (
                  <li className="lista-vazia">Nenhuma especialidade encontrada</li>
                ) : null}
              </ul>
            )}
          </div>

          <input
            type="text"
            name="crm"
            placeholder="CRM"
            maxLength={9}
            value={form.crm}
            onChange={(e) =>
              setForm({ ...form, crm: e.target.value.toUpperCase() })
            }
            className={erroCampos.crm ? "campo-erro" : ""}
          />
        </div>

        <input
          type="text"
          name="observacao"
          placeholder="Observação"
          value={form.observacao}
          onChange={(e) =>
            setForm({ ...form, observacao: e.target.value.toUpperCase() })
          }
        />

        <button type="submit" className="btn">
          {form.id ? "Atualizar Médico" : "Cadastrar Médico"}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => navigate("/cadastro-lote")}
        >
          Cadastrar em Lote
        </button>
      </form>

      <h3>Pesquisar Médicos</h3>
      <div id="buscar-container">
        <input
          type="text"
          placeholder="Nome"
          value={pesquisa.nome}
          onChange={(e) =>
            setPesquisa({ ...pesquisa, nome: e.target.value.toUpperCase() })
          }
        />
        <input
          type="text"
          placeholder="Especialidade"
          value={pesquisa.especialidade}
          onChange={(e) =>
            setPesquisa({ ...pesquisa, especialidade: e.target.value.toUpperCase() })
          }
        />
        <input
          type="text"
          placeholder="CRM"
          value={pesquisa.crm}
          onChange={(e) =>
            setPesquisa({ ...pesquisa, crm: e.target.value.toUpperCase() })
          }
        />
        <button onClick={handlePesquisar} className="btn-pesquisar">
          Pesquisar
        </button>
        <button onClick={handleLimparPesquisa} className="btn-limpar">
          Limpar
        </button>
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
                  <button onClick={() => handleEditar(m)} className="btn-editar">
                    Editar
                  </button>
                  <button
                    onClick={() => handleExcluir(m.id)}
                    className="btn-excluir"
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {medicos.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: "center" }}>
                  Nenhum médico encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {medicos.length > 0 && (
          <div id="paginacao-container">
            <button onClick={handlePaginaAnterior} className="btn">
              Página Anterior
            </button>
            <button onClick={handleProximaPagina} className="btn">
              Próxima Página
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Medicos;