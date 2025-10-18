import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch } from "react-icons/fa";
import { especialidades, ordenarEspecialidades, getEspecialidadeInfo } from "../api/especialidades.js";
import "./Medicos.css";
import "./mobile.css";
import { toggleVoz, getVozStatus } from "../utils/tts.js";
import { getMedicosFromStorage } from "../utils/storagePlantao.js";

const normalizeString = (str) => str ? str.toUpperCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

function Medicos() {
  const navigate = useNavigate();
  const [medicos, setMedicos] = useState([]);
  const [form, setForm] = useState({ id: null, nome: "", especialidade: { nome: "", cor: "", icone: null }, crm: "", observacao: "" });
  const [mensagem, setMensagem] = useState("");
  const [erroCampos, setErroCampos] = useState({});
  const [pesquisa, setPesquisa] = useState({ nome: "", especialidade: "", crm: "" });
  const [pagina, setPagina] = useState(0);
  const [listaVisivel, setListaVisivel] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [vozLigada, setVozLigada] = useState(getVozStatus());
  const [listaSelecionadaIndex, setListaSelecionadaIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const LIMIT = 50;

  // Debounce pra live search SÓ se tiver algo digitado (não roda no mount vazio!)
  useEffect(() => {
    // Condição: só ativa live se pelo menos um campo tem valor
    if (!pesquisa.nome && !pesquisa.especialidade && !pesquisa.crm) return;  // <- CORREÇÃO: Fica hidden no mount/vazio

    const timeoutId = setTimeout(() => {
      if (!loading) handlePesquisar();
    }, 300);  // Delay suave pro digitar
    return () => clearTimeout(timeoutId);
  }, [pesquisa.nome, pesquisa.especialidade, pesquisa.crm]);  // Dependências

  // Click fora da lista
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

  // TTS com try-catch
  useEffect(() => {
    if (!mensagem || !vozLigada) return;
    try {
      const synth = window.speechSynthesis;
      const falar = () => {
        if (!mensagem) return;
        const utterance = new SpeechSynthesisUtterance(mensagem);
        utterance.lang = "pt-BR";
        utterance.rate = 1;
        utterance.pitch = 1;
        const voices = synth.getVoices();
        const vozGoogleBR = voices.find(v => v.lang === "pt-BR" && v.name.toLowerCase().includes("google"));
        if (vozGoogleBR) utterance.voice = vozGoogleBR;
        synth.cancel();
        synth.speak(utterance);
      };
      if (synth.getVoices().length === 0) synth.addEventListener("voiceschanged", falar);
      else falar();
      return () => synth.removeEventListener("voiceschanged", falar);
    } catch (err) {
      console.error("Erro no TTS:", err);
    }
  }, [mensagem, vozLigada]);

  // Especialidades filtradas (useMemo)
  const especialidadesFiltradas = useMemo(() => {
    try {
      const filtrado = especialidades.filter(item => 
        normalizeString(item.nome).includes(normalizeString(filtro))
      );
      return ordenarEspecialidades(filtrado);
    } catch (err) {
      console.error("Erro no filtro de especialidades:", err);
      return [];
    }
  }, [filtro]);

  const handleChange = (e) => {
    let valor = e.target.value.toUpperCase();
    if (e.target.name === "nome") valor = normalizeString(valor);
    setForm({ ...form, [e.target.name]: valor });
    if (erroCampos[e.target.name]) setErroCampos({ ...erroCampos, [e.target.name]: false });
  };

  const handleEspecialidadeChange = (e) => {
    const valor = e.target.value.toUpperCase();
    setFiltro(valor);
    setForm({ ...form, especialidade: { nome: valor, cor: "", icone: null } });
    setListaVisivel(true);
  };

  const handleEspecialidadeKeyDown = (e) => {
    if (e.key === 'Escape') {
      setListaVisivel(false);
      setFiltro("");
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setListaSelecionadaIndex(i => (i + 1) % especialidadesFiltradas.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setListaSelecionadaIndex(i => (i - 1 + especialidadesFiltradas.length) % especialidadesFiltradas.length);
    } else if (e.key === 'Enter' && listaSelecionadaIndex >= 0) {
      e.preventDefault();
      selecionarEspecialidade(especialidadesFiltradas[listaSelecionadaIndex]);
    }
  };

  const selecionarEspecialidade = (item) => {
    const espInfo = getEspecialidadeInfo(item.nome);
    setForm({ ...form, especialidade: { nome: espInfo.nome, cor: espInfo.cor, icone: espInfo.icone } });
    setFiltro(item.nome);
    setListaVisivel(false);
    setListaSelecionadaIndex(-1);
  };

  // Submit (CRM só números)
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (form.crm && (form.crm.length < 4 || form.crm.length > 6 || !/^\d+$/.test(form.crm))) {
        setErroCampos({ crm: true });
        setMensagem("CRM inválido — use só 4-6 números (ex: 1234).");
        setTimeout(() => setMensagem(""), 5000);
        return;
      }

      let camposFaltando = {};
      if (!form.nome) camposFaltando.nome = true;
      if (!form.especialidade?.nome) camposFaltando.especialidade = true;
      if (!form.crm) camposFaltando.crm = true;

      if (Object.keys(camposFaltando).length > 0) {
        setErroCampos(camposFaltando);
        setMensagem("Preencha todos os campos obrigatórios!");
        setTimeout(() => setMensagem(""), 7000);
        return;
      }

      const todosMedicosRaw = JSON.parse(localStorage.getItem("medicos") || "[]");
      let todosSan = [];
      for (const m of todosMedicosRaw) {
        if (m && m.crm) todosSan.push(m);
      }

      if (!form.id) {
        const existeCRM = todosSan.some(m => m.crm === form.crm);
        if (existeCRM) {
          setErroCampos({ crm: true });
          setMensagem("CRM já cadastrado!");
          setTimeout(() => setMensagem(""), 3000);
          return;
        }
      }

      const espInfo = getEspecialidadeInfo(form.especialidade.nome);
      const medicoAtualizado = {
        ...form,
        especialidade: { nome: espInfo.nome, cor: espInfo.cor, icone: espInfo.icone },
      };

      let novosMedicos;
      if (form.id) {
        novosMedicos = todosSan.map(m => m.id === form.id ? medicoAtualizado : m);
        setMensagem("Atualizado com sucesso!");
      } else {
        const ids = todosSan.map(m => m.idMedico || 0);
        const novoId = ids.length > 0 ? Math.max(...ids) + 1 : 1;
        const novoMedico = { ...medicoAtualizado, idMedico: novoId, id: Date.now() + Math.random() };
        novosMedicos = [...todosSan, novoMedico];
        setMensagem("Cadastrado com sucesso!");
      }

      localStorage.setItem("medicos", JSON.stringify(novosMedicos));
      setForm({ id: null, nome: "", especialidade: { nome: "", cor: "", icone: null }, crm: "", observacao: "" });
      setErroCampos({});
      setTimeout(() => setMensagem(""), 3000);
    } catch (err) {
      console.error("Erro no submit:", err);
      setMensagem("Erro ao salvar — recarregue a página.");
      setTimeout(() => setMensagem(""), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleEditar = (medico) => {
    setForm(medico);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setFiltro("");
  };

  const handleExcluir = (id) => {
    if (!window.confirm("Excluir? Afeta consolidados antigos.")) return;
    try {
      const todosMedicos = JSON.parse(localStorage.getItem("medicos") || "[]");
      const novosMedicos = todosMedicos.filter(m => m.id !== id);
      localStorage.setItem("medicos", JSON.stringify(novosMedicos));
      setMedicos(prev => prev.filter(m => m.id !== id));
      setMensagem("Excluído com sucesso!");
      setTimeout(() => setMensagem(""), 3000);
    } catch (err) {
      console.error("Erro na exclusão:", err);
      setMensagem("Erro ao excluir.");
    }
  };

  // Pesquisa: Filtra em tempo real ou mostra todos (agora só se chamado)
  const handlePesquisar = useCallback(async () => {
    try {
      setLoading(true);
      const todosMedicosRaw = getMedicosFromStorage();
      let todosSan = [];
      for (const m of todosMedicosRaw || []) {
        if (m && m.nome && (m.crm || m.especialidade)) {
          todosSan.push({ ...m, nome: normalizeString(m.nome), crm: (m.crm || '').replace(/\D/g, '') });
        }
      }

      let filtrados = todosSan;

      // Se vazio, carrega TODOS (pro botão vazio)
      if (pesquisa.nome || pesquisa.especialidade || pesquisa.crm) {
        filtrados = todosSan.filter((m) => (
          (!pesquisa.nome || normalizeString(m.nome).includes(normalizeString(pesquisa.nome))) &&
          (!pesquisa.especialidade || normalizeString(m.especialidade?.nome || "").includes(normalizeString(pesquisa.especialidade))) &&
          (!pesquisa.crm || m.crm.toLowerCase().includes(pesquisa.crm.toLowerCase()))
        ));
      }  // Senão, filtrados = todosSan

      setMedicos(filtrados.slice(0, LIMIT));
      setPagina(0);
      if (filtrados.length === 0) {
        setMensagem("Nenhum encontrado — cadastre um!");
      } else {
        setMensagem("");
      }
    } catch (err) {
      console.error("Erro na pesquisa:", err);
      setMedicos([]);
      setMensagem("Erro na busca.");
    } finally {
      setLoading(false);
    }
  }, [pesquisa, pagina]);

  // Enter em qualquer campo de pesquisa dispara (mesmo vazio, carrega todos)
  const handleKeyDownPesquisa = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlePesquisar();  // Chama sempre, mesmo vazio
    }
  };

  const handleLimparPesquisa = () => {
    setPesquisa({ nome: "", especialidade: "", crm: "" });
    setMedicos([]);  // Volta hidden
    setPagina(0);
    setMensagem("");
  };

  const handleProximaPagina = () => {
    if (loading) return;
    const todosMedicos = getMedicosFromStorage();
    const totalPaginas = Math.ceil(todosMedicos.length / LIMIT);
    if (pagina + 1 < totalPaginas) {
      const novaPagina = pagina + 1;
      let filtrados = todosMedicos;
      if (pesquisa.nome || pesquisa.especialidade || pesquisa.crm) {
        filtrados = todosMedicos.filter((m) => (
          (!pesquisa.nome || normalizeString(m.nome).includes(normalizeString(pesquisa.nome))) &&
          (!pesquisa.especialidade || normalizeString(m.especialidade?.nome || "").includes(normalizeString(pesquisa.especialidade))) &&
          (!pesquisa.crm || m.crm.toLowerCase().includes(pesquisa.crm.toLowerCase()))
        ));
      }
      setMedicos(filtrados.slice(novaPagina * LIMIT, (novaPagina + 1) * LIMIT));
      setPagina(novaPagina);
    }
  };

  const handlePaginaAnterior = () => {
    if (loading || pagina === 0) return;
    const todosMedicos = getMedicosFromStorage();
    const novaPagina = pagina - 1;
    let filtrados = todosMedicos;
    if (pesquisa.nome || pesquisa.especialidade || pesquisa.crm) {
      filtrados = todosMedicos.filter((m) => (
        (!pesquisa.nome || normalizeString(m.nome).includes(normalizeString(pesquisa.nome))) &&
        (!pesquisa.especialidade || normalizeString(m.especialidade?.nome || "").includes(normalizeString(pesquisa.especialidade))) &&
        (!pesquisa.crm || m.crm.toLowerCase().includes(pesquisa.crm.toLowerCase()))
      ));
    }
    setMedicos(filtrados.slice(novaPagina * LIMIT, (novaPagina + 1) * LIMIT));
    setPagina(novaPagina);
  };

  const handleToggleVoz = () => {
    try {
      const status = toggleVoz();
      setVozLigada(status);
      setMensagem(status ? "🔊 Voz ativada." : "🔈 Voz desativada.");
    } catch (err) {
      console.error("Erro no toggle voz:", err);
    }
  };

  // Fallback pro render
  try {
    if (loading) return <div className="loading">Filtrando consolidados...</div>;

    return (
      <div id="medicos-container">
        <h2>Médicos (Consolidados por Dia)</h2>

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
            disabled={loading}
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
                disabled={loading}
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
                disabled={loading}
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
              placeholder="CRM (só números, ex: 1234)"
              maxLength={6}
              value={form.crm}
              onChange={(e) => {
                const soNumeros = e.target.value.replace(/\D/g, '');
                setForm({ ...form, crm: soNumeros.toUpperCase() });
              }}
              className={erroCampos.crm ? "campo-erro" : ""}
              disabled={loading}
            />
          </div>

          <input
            type="text"
            name="observacao"
            placeholder="Observação"
            value={form.observacao}
            onChange={(e) => setForm({ ...form, observacao: e.target.value.toUpperCase() })}
            disabled={loading}
          />

          <button type="submit" className="btn" disabled={loading}>
            {form.id ? "Atualizar Médico" : "Cadastrar Médico"}
          </button>
          <button type="button" className="btn" onClick={() => navigate("/cadastro-lote")} disabled={loading}>
            Cadastrar em Lote
          </button>
        </form>

        <h3>Pesquisar Médicos</h3>
        <div id="buscar-container">
          <input
            type="text"
            placeholder="Nome (digite pra filtrar ao vivo)"
            value={pesquisa.nome}
            onChange={(e) => setPesquisa({ ...pesquisa, nome: e.target.value.toUpperCase() })}
            onKeyDown={handleKeyDownPesquisa}
            disabled={loading}
          />
          <input
            type="text"
            placeholder="Especialidade (ex: Cli pra Clínica)"
            value={pesquisa.especialidade}
            onChange={(e) => setPesquisa({ ...pesquisa, especialidade: e.target.value.toUpperCase() })}
            onKeyDown={handleKeyDownPesquisa}
            disabled={loading}
          />
          <input
            type="text"
            placeholder="CRM (ex: 1234)"
            value={pesquisa.crm}
            onChange={(e) => setPesquisa({ ...pesquisa, crm: e.target.value.toUpperCase() })}
            onKeyDown={handleKeyDownPesquisa}
            disabled={loading}
          />
          <button onClick={handlePesquisar} className="btn-pesquisar" disabled={loading}>
            Pesquisar
          </button>
          <button onClick={handleLimparPesquisa} className="btn-limpar" disabled={loading}>
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
                      <button onClick={() => handleEditar(m)} className="btn-editar" disabled={loading}>Editar</button>
                      <button onClick={() => handleExcluir(m.id)} className="btn-excluir" disabled={loading}>Excluir</button>
                    </td>
                  </tr>
                );
              })}
              {medicos.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center" }}>
                    Nenhum médico encontrado. Digite nos campos ou aperte "Pesquisar" pra carregar e cadastrar consolidados!
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {medicos.length > 0 && (
            <div id="paginacao-container">
              <button onClick={handlePaginaAnterior} className="btn" disabled={pagina === 0 || loading}>
                Anterior
              </button>
              <button onClick={handleProximaPagina} className="btn" disabled={loading}>
                Próxima
              </button>
            </div>
          )}
        </div>
      </div>
    );
  } catch (renderErr) {
    console.error("Erro no render da página:", renderErr);
    return <div className="erro-render">Ops! Erro na tela — recarregue (F5). Detalhes no console.</div>;
  }
}

export default Medicos;