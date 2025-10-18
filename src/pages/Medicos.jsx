// src/pages/Medicos.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch } from "react-icons/fa";
import {
  especialidades,
  ordenarEspecialidades,
  getEspecialidadeInfo,
} from "../api/especialidades.js";
import "./Medicos.css";
import "./mobile.css";
import { toggleVoz, getVozStatus } from "../utils/tts.js";
import {
  getMedicosFromStorage,
  saveMedicosToStorage,
} from "../utils/storagePlantao.js";

const normalizeString = (str) =>
  str ? str.toUpperCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

function Medicos() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const LIMIT = 50;

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
  const [loading, setLoading] = useState(false);

  // Fechar lista ao clicar fora
  useEffect(() => {
    const handleClickFora = (e) => {
      if (inputRef.current && !inputRef.current.contains(e.target)) {
        setListaVisivel(false);
        setListaSelecionadaIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, []);

  // Fala por voz (TTS)
  useEffect(() => {
    if (!mensagem || !vozLigada) return;
    try {
      const synth = window.speechSynthesis;
      const falar = () => {
        const utter = new SpeechSynthesisUtterance(mensagem);
        utter.lang = "pt-BR";
        utter.rate = 1;
        const voice = synth
          .getVoices()
          .find((v) => v.lang === "pt-BR" && v.name.toLowerCase().includes("google"));
        if (voice) utter.voice = voice;
        synth.cancel();
        synth.speak(utter);
      };
      if (synth.getVoices().length === 0)
        synth.addEventListener("voiceschanged", falar);
      else falar();
    } catch (err) {
      console.error("Erro no TTS:", err);
    }
  }, [mensagem, vozLigada]);

  // Lista de especialidades filtrada
  const especialidadesFiltradas = useMemo(() => {
    try {
      const filtrado = especialidades.filter((item) =>
        normalizeString(item.nome).includes(normalizeString(filtro))
      );
      return ordenarEspecialidades(filtrado);
    } catch {
      return [];
    }
  }, [filtro]);

  const handleChange = (e) => {
    const valor = e.target.value.toUpperCase();
    setForm({ ...form, [e.target.name]: valor });
    if (erroCampos[e.target.name]) setErroCampos({ ...erroCampos, [e.target.name]: false });
  };

  // Especialidade
  const handleEspecialidadeChange = (e) => {
    const valor = e.target.value;
    setFiltro(valor);
    setForm({ ...form, especialidade: { nome: valor, cor: "", icone: null } });
    setListaVisivel(true);
  };

  const selecionarEspecialidade = (item) => {
    const espInfo = getEspecialidadeInfo(item.nome);
    setForm((prev) => ({
      ...prev,
      especialidade: {
        nome: espInfo.nome,
        cor: espInfo.cor,
        icone: espInfo.icone,
      },
    }));
    setFiltro("");
    setListaVisivel(false);
    setListaSelecionadaIndex(-1);
  };

  // CRUD
  const handleSubmit = (e) => {
    e.preventDefault();
    const faltando = {};
    if (!form.nome) faltando.nome = true;
    if (!form.crm) faltando.crm = true;
    if (!form.especialidade?.nome) faltando.especialidade = true;

    if (Object.keys(faltando).length) {
      setErroCampos(faltando);
      setMensagem("⚠️ Preencha todos os campos obrigatórios!");
      setTimeout(() => setMensagem(""), 4000);
      return;
    }

    const atuais = getMedicosFromStorage() || [];
    const crmExiste = atuais.some(
      (m) =>
        m.crm?.toString().toUpperCase() === form.crm.toString().toUpperCase() &&
        m.id !== form.id
    );
    if (crmExiste) {
      setErroCampos({ crm: true });
      setMensagem("⚠️ CRM já cadastrado!");
      setTimeout(() => setMensagem(""), 4000);
      return;
    }

    const esp = getEspecialidadeInfo(form.especialidade.nome);
    const novoMedico = {
      ...form,
      especialidade: esp.nome,
      crm: form.crm.toUpperCase(),
    };

    let novos;
    if (form.id) {
      if (!window.confirm("Deseja atualizar este médico?")) return;
      novos = atuais.map((m) => (m.id === form.id ? { ...m, ...novoMedico } : m));
      setMensagem("✅ Médico atualizado com sucesso!");
    } else {
      const novoId = Date.now() + Math.random();
      novos = [...atuais, { ...novoMedico, id: novoId }];
      setMensagem("✅ Médico cadastrado com sucesso!");
    }

    saveMedicosToStorage(novos);
    setForm({
      id: null,
      nome: "",
      especialidade: { nome: "", cor: "", icone: null },
      crm: "",
      observacao: "",
    });
    setErroCampos({});
    handlePesquisar();
    setTimeout(() => setMensagem(""), 5000);
  };

  const handleEditar = (m) => {
    const esp = getEspecialidadeInfo(m.especialidade);
    setForm({
      ...m,
      especialidade: { nome: esp.nome, cor: esp.cor, icone: esp.icone },
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleExcluir = (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este médico?")) return;
    const atuais = getMedicosFromStorage() || [];
    const novos = atuais.filter((m) => m.id !== id);
    saveMedicosToStorage(novos);
    setMedicos((prev) => prev.filter((m) => m.id !== id));
    setMensagem("🗑️ Médico excluído com sucesso!");
    setTimeout(() => setMensagem(""), 4000);
  };

  const handlePesquisar = useCallback(() => {
    const todos = getMedicosFromStorage() || [];
    const nomeQ = pesquisa.nome.trim();
    const espQ = pesquisa.especialidade.trim();
    const crmQ = pesquisa.crm.trim();

    let filtrados = todos.filter((m) => {
      const okNome = !nomeQ || normalizeString(m.nome).includes(normalizeString(nomeQ));
      const okEsp =
        !espQ || normalizeString(m.especialidade).includes(normalizeString(espQ));
      const okCrm = !crmQ || m.crm?.toUpperCase().includes(crmQ.toUpperCase());
      return okNome && okEsp && okCrm;
    });

    const lista = filtrados.slice(0, LIMIT).map((m) => ({
      ...m,
      especialidade: getEspecialidadeInfo(m.especialidade),
    }));

    setMedicos(lista);
    setPagina(0);
    if (lista.length === 0) setMensagem("Nenhum médico encontrado.");
  }, [pesquisa]);

  const handleLimparPesquisa = () => {
    setPesquisa({ nome: "", especialidade: "", crm: "" });
    setMedicos([]);
    setMensagem("");
  };

  const handleToggleVoz = () => {
    const status = toggleVoz();
    setVozLigada(status);
    setMensagem(status ? "🔊 Voz ativada" : "🔈 Voz desativada");
  };

  return (
    <div id="medicos-container">
      <h2>Cadastro de Médicos</h2>

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

        <div ref={inputRef} className="linha-especialidade-crm">
          <div className="input-com-lupa">
            <input
              type="text"
              placeholder="Especialidade"
              value={
                form.especialidade?.nome && !filtro
                  ? form.especialidade.nome
                  : filtro || ""
              }
              onChange={handleEspecialidadeChange}
              onFocus={() => setListaVisivel(true)}
              className={erroCampos.especialidade ? "campo-erro" : ""}
            />
            <button
              type="button"
              className="btn-lupa"
              onClick={() => {
                setFiltro("");
                setListaVisivel(true);
              }}
            >
              <FaSearch />
            </button>
            {listaVisivel && (
              <ul className="lista-suspensa">
                {especialidadesFiltradas.length > 0 ? (
                  especialidadesFiltradas.map((item, idx) => {
                    const Icone = item.icone;
                    return (
                      <li
                        key={item.id}
                        onClick={() => selecionarEspecialidade(item)}
                        style={{
                          color: item.cor,
                          background:
                            idx === listaSelecionadaIndex ? "#f0f0f0" : "white",
                        }}
                      >
                        {Icone && <Icone className="icone" />} {item.nome}
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
            onChange={(e) =>
              setForm({ ...form, crm: e.target.value.replace(/\D/g, "") })
            }
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
      </div>
    </div>
  );
}

export default Medicos;
