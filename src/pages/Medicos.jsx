import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch } from "react-icons/fa";
import { especialidades, ordenarEspecialidades, getEspecialidadeInfo } from "../api/especialidades.js";
import "./Medicos.css";
import "./mobile.css";
import { toggleVoz, getVozStatus } from "../utils/tts.js";

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
    especialidade: { nome: "", cor: "", icone: null },
    crm: "",
    observacao: "",
  });
  const [mensagem, setMensagem] = useState("");
  const [erroCampos, setErroCampos] = useState({});
  const [pesquisa, setPesquisa] = useState({ nome: "", especialidade: "", crm: "" });
  const [pagina, setPagina] = useState(0);
  const [listaVisivel, setListaVisivel] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [vozLigada, setVozLigada] = useState(getVozStatus());
  const [listaSelecionadaIndex, setListaSelecionadaIndex] = useState(-1);
  const inputRef = useRef(null);
  const LIMIT = 50;

  useEffect(() => setMedicos([]), []);

  useEffect(() => {
    const handleClickFora = (event) => {
      if (inputRef.current && !inputRef.current.contains(event.target)) {
        setListaVisivel(false);
        setListaSelecionadaIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, []);

  useEffect(() => {
    if (!mensagem || !vozLigada) return;
    const synth = window.speechSynthesis;
    const falar = () => {
      if (!mensagem) return;
      const utterance = new SpeechSynthesisUtterance(mensagem);
      utterance.lang = "pt-BR";
      utterance.rate = 1;
      utterance.pitch = 1;
      const voices = synth.getVoices();
      const vozGoogleBR = voices.find(
        (v) => v.lang === "pt-BR" && v.name.toLowerCase().includes("google")
      );
      if (vozGoogleBR) utterance.voice = vozGoogleBR;
      synth.cancel();
      synth.speak(utterance);
    };
    if (synth.getVoices().length === 0) synth.addEventListener("voiceschanged", falar);
    else falar();
    return () => synth.removeEventListener("voiceschanged", falar);
  }, [mensagem, vozLigada]);

  const handleChange = (e) => {
    let valor = e.target.value.toUpperCase();
    if (e.target.name === "nome") valor = normalizeString(valor);
    setForm({ ...form, [e.target.name]: valor });
    if (erroCampos[e.target.name]) setErroCampos({ ...erroCampos, [e.target.name]: false });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let camposFaltando = {};
    if (!form.nome) camposFaltando.nome = true;
    if (!form.especialidade?.nome) camposFaltando.especialidade = true;
    if (!form.crm) camposFaltando.crm = true;

    if (Object.keys(camposFaltando).length > 0) {
      setErroCampos(camposFaltando);
      setMensagem("Preencha todos os campos (CRM, Nome e Especialidade são obrigatórios)!");
      setTimeout(() => setMensagem(""), 7000);
      return;
    }

    const todosMedicos = JSON.parse(localStorage.getItem("medicos") || "[]");

    if (!form.id) {
      const existeCRM = todosMedicos.some((m) => m.crm === form.crm);
      if (existeCRM) {
        setErroCampos({ crm: true });
        setMensagem("Esse CRM já está cadastrado! Escolha outro.");
        setTimeout(() => setMensagem(""), 3000);
        return;
      }
    }

    const espInfo = getEspecialidadeInfo(form.especialidade.nome);

    const medicoAtualizado = {
      ...form,
      especialidade: {
        nome: espInfo.nome,
        cor: espInfo.cor,
        icone: espInfo.icone,
      },
    };

    let novosMedicos;
    if (form.id) {
      novosMedicos = todosMedicos.map((m) => (m.id === form.id ? medicoAtualizado : m));
      setMensagem("Médico atualizado com sucesso!");
    } else {
      const ids = todosMedicos.map((m) => m.idMedico || 0);
      const novoId = ids.length > 0 ? Math.max(...ids) + 1 : 1;
      const novoMedico = { ...medicoAtualizado, idMedico: novoId, id: Date.now() + Math.random() };
      novosMedicos = [...todosMedicos, novoMedico];
      setMensagem("Médico cadastrado com sucesso!");
    }

    localStorage.setItem("medicos", JSON.stringify(novosMedicos));
    setForm({ id: null, nome: "", especialidade: { nome: "", cor: "", icone: null }, crm: "", observacao: "" });
    setErroCampos({});
    setTimeout(() => setMensagem(""), 3000);
  };

  const handleEditar = (medico) => {
    setForm(medico);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setFiltro("");
  };

  const handleExcluir = (id) => {
    if (!window.confirm("Deseja excluir este médico?")) return;
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
        (!pesquisa.nome || normalizeString(m.nome).includes(normalizeString(pesquisa.nome))) &&
        (!pesquisa.especialidade || normalizeString(m.especialidade?.nome || "")
          .includes(normalizeString(pesquisa.especialidade))) &&
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

  const especialidadesFiltradas = ordenarEspecialidades(especialidades).filter((item) =>
    filtro ? normalizeString(item.nome).includes(normalizeString(filtro)) : true
  );

  const handleEspecialidadeChange = (e) => {
    const valor = e.target.value.toUpperCase();
    setFiltro(valor);
    setListaVisivel(true);
    setListaSelecionadaIndex(-1);
  };

  const handleEspecialidadeKeyDown = (e) => {
    if (!listaVisivel) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setListaSelecionadaIndex((prev) =>
        prev < especialidadesFiltradas.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setListaSelecionadaIndex((prev) =>
        prev > 0 ? prev - 1 : especialidadesFiltradas.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (listaSelecionadaIndex >= 0) {
        const item = especialidadesFiltradas[listaSelecionadaIndex];
        setForm({
          ...form,
          especialidade: { nome: item.nome, cor: item.cor, icone: item.icone },
        });
        setFiltro("");
        setListaVisivel(false);
        setListaSelecionadaIndex(-1);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setListaVisivel(false);
      setListaSelecionadaIndex(-1);
    }
  };

  const selecionarEspecialidade = (item) => {
    setForm({
      ...form,
      especialidade: { nome: item.nome, cor: item.cor, icone: item.icone },
    });
    setFiltro("");
    setListaVisivel(false);
    setListaSelecionadaIndex(-1);
  };

  const handleToggleVoz = () => {
    const status = toggleVoz();
    setVozLigada(status);
    setMensagem(status ? "🔊 Leitor de voz ativado." : "🔈 Leitor de voz desativado.");
  };

  return (
    <div id="medicos-container">
      <h2>Médicos</h2>

      {mensagem && (
        <div className="mensagem-container">
          <p className="mensagem-sucesso">{mensagem}</p>
          <button onClick={handleToggleVoz} className="btn-voz">
            {vozLigada ? "🔊 Desativar voz" : "🔈 Ativar voz"}
          </button>
        </div>
      )}

      <form id="medicos-form" onSubmit={handleSubmit}>
        <input
          type="text"
          name="nome"
          placeholder="Nome do médico"
          value={form.nome}
          onChange={handleChange}
          className={erroCampos.nome ? "campo-erro" : ""}
        />

        <div className="linha-especialidade-crm" ref={inputRef} style={{ position: "relative" }}>
          <div className="input-com-lupa">
            <input
              type="text"
              name="especialidade"
              placeholder="Especialidade"
              value={filtro || form.especialidade?.nome || ""}
              onChange={handleEspecialidadeChange}
              onFocus={() => setListaVisivel(true)}
              onKeyDown={handleEspecialidadeKeyDown}
              className={erroCampos.especialidade ? "campo-erro" : ""}
              autoComplete="off"
            />
            <button
              type="button"
              className="btn-lupa"
              onClick={() => {
                setFiltro("");
                setListaVisivel(true);
                setListaSelecionadaIndex(-1);
                setForm({ ...form, especialidade: { nome: "", cor: "", icone: null } });
              }}
              aria-label="Abrir lista de especialidades"
            >
              <FaSearch />
            </button>

            {listaVisivel && (
              <ul className="lista-suspensa" role="listbox" aria-label="Lista de especialidades">
                {especialidadesFiltradas.length > 0 ? (
                  especialidadesFiltradas.map((item, index) => {
                    const Icone = item.icone;
                    const isSelected = index === listaSelecionadaIndex;
                    return (
                      <li
                        key={item.id}
                        onClick={() => selecionarEspecialidade(item)}
                        style={{ color: item.cor }}
                        className={isSelected ? "selected" : ""}
                        onMouseEnter={() => setListaSelecionadaIndex(index)}
                        role="option"
                        aria-selected={isSelected}
                        tabIndex={-1}
                      >
                        {Icone && <Icone className="icone" />} {item.nome.toUpperCase()}
                      </li>
                    );
                  })
                ) : (
                  <li className="lista-vazia">Nenhuma especialidade encontrada</li>
                )}
              </ul>
            )}
          </div>

          <input
            type="text"
            name="crm"
            placeholder="CRM"
            maxLength={9}
            value={form.crm}
            onChange={(e) => setForm({ ...form, crm: e.target.value.toUpperCase() })}
            className={erroCampos.crm ? "campo-erro" : ""}
          />
        </div>

        <input
          type="text"
          name="observacao"
          placeholder="Observação"
          value={form.observacao}
          onChange={(e) => setForm({ ...form, observacao: e.target.value.toUpperCase() })}
        />

        <button type="submit" className="btn">
          {form.id ? "Atualizar Médico" : "Cadastrar Médico"}
        </button>
        <button type="button" className="btn" onClick={() => navigate("/cadastro-lote")}>
          Cadastrar em Lote
        </button>
      </form>

      <h3>Pesquisar Médicos</h3>
      <div id="buscar-container">
        <input
          type="text"
          placeholder="Nome"
          value={pesquisa.nome}
          onChange={(e) => setPesquisa({ ...pesquisa, nome: e.target.value.toUpperCase() })}
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
          onChange={(e) => setPesquisa({ ...pesquisa, crm: e.target.value.toUpperCase() })}
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
            {medicos.map((m, i) => {
              const Icone = m.especialidade?.icone;
              return (
                <tr key={m.id}>
                  <td>{i + 1 + pagina * LIMIT}</td>
                  <td>{m.nome}</td>
                  <td style={{ color: m.especialidade?.cor || "#000" }}>
                    {Icone && <Icone className="icone" />} {m.especialidade?.nome}
                  </td>
                  <td>{m.crm}</td>
                  <td>{m.observacao}</td>
                  <td>
                    <button onClick={() => handleEditar(m)} className="btn-editar">
                      Editar
                    </button>
                    <button onClick={() => handleExcluir(m.id)} className="btn-excluir">
                      Excluir
                    </button>
                  </td>
                </tr>
              );
            })}
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
