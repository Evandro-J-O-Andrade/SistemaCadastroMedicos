// src/pages/Plantao.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "./Plantao.css";
import "./mobile.css"
import { falarMensagem, toggleVoz, getVozStatus } from "../utils/tts.js";
import {
  getEspecialidadeInfo,
  especialidades as especialidadesList,
} from "../api/especialidades.js";

import { savePlantaoToStorage, getPlantaoFromStorage } from "../utils/storagePlantao";

const handleAdicionarPlantao = (novoPlantao) => {
  const plantaoAtual = getPlantaoFromStorage();
  plantaoAtual.push(novoPlantao); // ou merge se quiser evitar duplicados
  savePlantaoToStorage(plantaoAtual);
};

/**
 * Formata data/hora para salvar no localStorage (YYYY-MM-DD e HH:mm)
 */
function formatarDataHora(data, hora) {
  if (!data || !hora) return { dataFormatada: "", horaFormatada: "" };
  return {
    dataFormatada: dayjs(data).format("YYYY-MM-DD"),
    horaFormatada: hora,
  };
}

function salvarPlantao(novosDados) {
  storageManager.setPlantao(novosDados);
  window.dispatchEvent(new Event("dadosAtualizados"));
}
/**
 * Normaliza string removendo acentos e espaços, retornando lowercase.
 * Se receber objeto com .nome, usa isso.
 */
const normalizeString = (str) => {
  if (!str) return "";
  if (typeof str === "object" && str.nome) str = str.nome;
  return String(str)
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

/**
 * Retorna o nome "textual" de uma especialidade, tratando objeto ou string
 */
const getEspecialidadeNome = (esp) => {
  if (!esp) return "";
  if (typeof esp === "object") return esp.nome || "";
  return String(esp);
};

// Helper pra data de hoje
const getHoje = () => dayjs().format("YYYY-MM-DD");

// Função pra carregar full dados e filtrar só hoje pra tela
const carregarEFiltrarPlantao = (setPlantaoList) => {
  const hoje = getHoje();
  const dadosFull = JSON.parse(localStorage.getItem("plantaoData") || "[]");
  
  // Filtra só itens de hoje pra tela (mantém full no storage)
  const paraTela = dadosFull.filter((p) => p?.data === hoje);
  setPlantaoList(paraTela);
  
  // NÃO salva aqui - só lê
};

export default function Plantao() {
  const navigate = useNavigate();

  // plantões gravados (persistidos) - inicia vazio, carrega no useEffect
  const [plantaoList, setPlantaoList] = useState([]);

  // médicos cadastrados (vindos do localStorage via página Medicos)
  const [medicosData, setMedicosData] = useState([]);
  const [medicoInput, setMedicoInput] = useState("");
  const [medicoId, setMedicoId] = useState(null);
  const [crm, setCrm] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [dataAtendimento, setDataAtendimento] = useState("");
  const [horaAtendimento, setHoraAtendimento] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [dataAtual, setDataAtual] = useState(new Date().toLocaleDateString());
  const [mensagemGlobal, setMensagemGlobal] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("");
  const [plantaoParaExcluir, setPlantaoParaExcluir] = useState(null);

  const [mostrarListaMedicos, setMostrarListaMedicos] = useState(false);
  const [lupaInput, setLupaInput] = useState("");
  const [mostrarListaLupa, setMostrarListaLupa] = useState(false);
  const [listaFiltradaLupa, setListaFiltradaLupa] = useState([]);

  // Estado da voz (utilitário tts.js)
  const [vozLigada, setVozLigada] = useState(() => {
    try {
      return getVozStatus ? getVozStatus() : false;
    } catch {
      return false;
    }
  });

  const handleToggleVoz = () => {
    const status = toggleVoz();
    setVozLigada(status);
    setMensagemGlobal(status ? "🔊 Leitor de voz ativado." : "🔈 Leitor de voz desativado.");
    setTipoMensagem("info");
  };

  // Carrega médicos do localStorage ao montar
  useEffect(() => {
    const dados = JSON.parse(localStorage.getItem("medicos") || "[]");
    setMedicosData(Array.isArray(dados) ? dados : []);
  }, []);

  // Carrega e filtra plantão só de hoje (mantém full no storage)
  useEffect(() => {
    carregarEFiltrarPlantao(setPlantaoList);
  }, []);

  // Auto-filtro a cada mudança de dia (refiltra se data mudou)
  useEffect(() => {
    const interval = setInterval(() => {
      const agora = new Date();
      const novaData = agora.toLocaleDateString();
      if (novaData !== dataAtual) {
        carregarEFiltrarPlantao(setPlantaoList); // Refiltra com nova data
        setDataAtual(novaData);
      }
    }, 60 * 1000); // Checa a cada minuto
    return () => clearInterval(interval);
  }, [dataAtual]);

  // Mensagem global autodestrói
  useEffect(() => {
    if (mensagemGlobal) {
      const timer = setTimeout(() => setMensagemGlobal(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [mensagemGlobal]);

  // Fecha dropdowns ao clicar fora (usa classes já existentes)
  useEffect(() => {
    const handleClickFora = (event) => {
      const medicoWrapper = document.querySelector(".medico-wrapper");
      const lupaWrapper = document.querySelector(".lupa-wrapper");

      if (medicoWrapper && !medicoWrapper.contains(event.target)) {
        setMostrarListaMedicos(false);
      }

      if (lupaWrapper && !lupaWrapper.contains(event.target)) {
        setMostrarListaLupa(false);
      }
    };

    document.addEventListener("click", handleClickFora);
    return () => document.removeEventListener("click", handleClickFora);
  }, []);

  // TTS: fala a mensagemGlobal (se houver)
  useEffect(() => {
    const falar = () => {
      if (!mensagemGlobal) return;

      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(mensagemGlobal);
      utterance.lang = "pt-BR";
      utterance.rate = 1;
      utterance.pitch = 1;

      const voices = synth.getVoices();
      const vozGoogleBR = voices.find((v) => v.lang === "pt-BR" && v.name.toLowerCase().includes("google"));
      if (vozGoogleBR) utterance.voice = vozGoogleBR;

      try {
        synth.speak(utterance);
      } catch (e) {
        console.warn("TTS erro:", e);
      }
    };

    window.speechSynthesis.addEventListener("voiceschanged", falar);
    falar();

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", falar);
    };
  }, [mensagemGlobal]);

  // --- Monta lista única de especialidades (médicos + lista fixa) ---
  const uniqueSpecialties = (() => {
    const map = {};
    medicosData.forEach((m) => {
      const nome = getEspecialidadeNome(m.especialidade);
      if (!nome) return;
      const key = normalizeString(nome);
      if (!map[key]) map[key] = nome;
    });
    especialidadesList.forEach((e) => {
      if (!e || !e.nome) return;
      const key = normalizeString(e.nome);
      if (!map[key]) map[key] = e.nome;
    });
    return Object.values(map).sort((a, b) => a.localeCompare(b, "pt-BR"));
  })();

  // ------------------- interações com inputs -------------------
  const filtrarMedicosInput = (valor) => {
    setMedicoInput(valor);
    setMostrarListaMedicos(true);
  };

  const handleSelecionarMedico = (medico, e) => {
    if (e) e.stopPropagation();
    setMedicoInput(medico.nome);
    // alguns registros antigos podem usar idMedico ou id
    setMedicoId(medico.id || medico.idMedico || null);
    setCrm(medico.crm || "");
    const nomeEsp = getEspecialidadeNome(medico.especialidade);
    if (nomeEsp) {
      const match = uniqueSpecialties.find((esp) => normalizeString(esp) === normalizeString(nomeEsp));
      setEspecialidade(match || nomeEsp);
    }
    setMostrarListaMedicos(false);
  };

  const handleSelecionarMedicoDaLupa = (medico) => {
    setMedicoInput(medico.nome);
    setMedicoId(medico.id || medico.idMedico || null);
    setCrm(medico.crm || "");
    const nomeEsp = getEspecialidadeNome(medico.especialidade);
    if (nomeEsp) {
      const match = uniqueSpecialties.find((esp) => normalizeString(esp) === normalizeString(nomeEsp));
      setEspecialidade(match || nomeEsp);
    }
    setLupaInput("");
    setListaFiltradaLupa([]);
    setMostrarListaLupa(false);
  };

  const abrirListaLupa = () => {
    if (!lupaInput.trim()) {
      setListaFiltradaLupa(medicosData);
    } else {
      const filtro = medicosData.filter((m) =>
        normalizeString(m.nome).includes(normalizeString(lupaInput))
      );
      setListaFiltradaLupa(filtro);
      if (filtro.length === 0) {
        setMensagemGlobal("Médico não encontrado ou erro de digitação!");
        setTipoMensagem("erro");
      }
    }
    setMostrarListaLupa(true);
  };

  // valida se há conflito de plantão (mesmo médico + especialidade < 12h)
  const validarConflito = (novoPlantao) => {
    // Usa full dados do storage pro conflito (não só tela)
    const dadosFull = JSON.parse(localStorage.getItem("plantaoData") || "[]");
    return dadosFull.some((p) => {
      if (p.id === editandoId) return false;
      if (normalizeString(p.nome) !== normalizeString(novoPlantao.nome)) return false;
      if (normalizeString(p.especialidade) !== normalizeString(novoPlantao.especialidade)) return false;

      const registroP = dayjs(p.data + " " + p.hora);
      const registroN = dayjs(novoPlantao.data + " " + novoPlantao.hora);
      const diffHoras = Math.abs(registroN.diff(registroP, "hour"));
      return diffHoras < 12;
    });
  };

  // salvar (novo) ou atualizar plantão
  const handleAddPlantao = () => {
    if (!medicoInput || !crm || !especialidade || !quantidade || !dataAtendimento || !horaAtendimento) {
      setMensagemGlobal("Preencha todos os campos obrigatórios.");
      setTipoMensagem("erro");
      return;
    }

    const medicoExiste = medicosData.some((m) => {
      // compara por id (id ou idMedico) ou por nome+crm
      const idMatch = (m.id === medicoId) || (m.idMedico === medicoId);
      const nomeMatch = normalizeString(m.nome) === normalizeString(medicoInput);
      const crmMatch = (m.crm || "") === crm;
      return idMatch || (nomeMatch && crmMatch);
    });

    if (!medicoExiste) {
      setMensagemGlobal("Médico não encontrado ou não está cadastrado!");
      setTipoMensagem("erro");
      return;
    }

    const { dataFormatada, horaFormatada } = formatarDataHora(dataAtendimento, horaAtendimento);

    const novoPlantao = {
      id: editandoId || Date.now(),
      medicoId,
      nome: medicoInput,
      crm,
      especialidade,
      quantidade,
      data: dataFormatada,
      hora: horaFormatataOrFallback(horaFormatada),
    };

    if (validarConflito(novoPlantao)) {
      setMensagemGlobal("Este médico já possui um plantão nesta especialidade nas últimas 12h!");
      setTipoMensagem("erro");
      return;
    }

    // Carrega full, adiciona/atualiza, salva full, refiltra tela
    const dadosFull = JSON.parse(localStorage.getItem("plantaoData") || "[]");
    let atualizadoFull;
    if (editandoId) {
      atualizadoFull = dadosFull.map((p) => (p.id === editandoId ? novoPlantao : p));
      setMensagemGlobal("Plantão atualizado com sucesso!");
    } else {
      atualizadoFull = [...dadosFull, novoPlantao];
      setMensagemGlobal("Plantão salvo com sucesso!");
    }

    // Salva full no storage
    localStorage.setItem("plantaoData", JSON.stringify(atualizadoFull));
    
    // Refiltra pra tela (só hoje)
    carregarEFiltrarPlantao(setPlantaoList);

    setTipoMensagem("sucesso");
    limparFormularioPlantao();
  };

  // fallback para hora (garante HH:mm)
  function horaFormatataOrFallback(horaStr) {
    if (!horaStr) return "";
    // se já está no formato HH:mm retorna
    if (/^\d{2}:\d{2}$/.test(horaStr)) return horaStr;
    // tenta extrair
    const parts = horaStr.split(":");
    if (parts.length >= 2) return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
    return horaStr;
  }

  const limparFormularioPlantao = () => {
    setEditandoId(null);
    setMedicoInput("");
    setMedicoId(null);
    setCrm("");
    setEspecialidade("");
    setQuantidade("");
    setDataAtendimento("");
    setHoraAtendimento("");
  };

  const handleConfirmarExclusao = (id) => {
    setPlantaoParaExcluir(id);
    setMensagemGlobal("Deseja realmente excluir este plantão?");
    setTipoMensagem("erro");

    setTimeout(() => {
      const mensagemEl = document.querySelector(".mensagem-global");
      if (mensagemEl) {
        mensagemEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  const handleExcluirConfirmado = () => {
    if (!plantaoParaExcluir) return;
    
    // Carrega full, remove, salva full, refiltra tela
    const dadosFull = JSON.parse(localStorage.getItem("plantaoData") || "[]");
    const atualizadoFull = dadosFull.filter((p) => p.id !== plantaoParaExcluir);
    localStorage.setItem("plantaoData", JSON.stringify(atualizadoFull));
    
    // Refiltra pra tela
    carregarEFiltrarPlantao(setPlantaoList);
    
    setPlantaoParaExcluir(null);
    setMensagemGlobal("Plantão excluído com sucesso!");
    setTipoMensagem("sucesso");
  };

  const handleCancelarExclusao = () => {
    setPlantaoParaExcluir(null);
    setMensagemGlobal("");
  };

  const handleEditPlantao = (plantao) => {
    setMedicoInput(plantao.nome);
    setMedicoId(plantao.medicoId || null);
    setCrm(plantao.crm || "");
    const match = uniqueSpecialties.find((esp) => normalizeString(esp) === normalizeString((plantao.especialidade || "")));
    setEspecialidade(match || plantao.especialidade || "");
    setQuantidade(plantao.quantidade || "");
    if (plantao.data && plantao.hora) {
      setDataAtendimento(plantao.data); // assume já YYYY-MM-DD
      setHoraAtendimento(plantao.hora);
    } else {
      setDataAtendimento("");
      setHoraAtendimento("");
    }
    setEditandoId(plantao.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Renderiza especialidade com ícone (icone pode ser componente React retornado por getEspecialidadeInfo)
  const renderEspecialidade = (esp) => {
    const info = getEspecialidadeInfo(esp);
    // info.icone pode ser um componente (React) ou string — tratamos ambos
    const Icon = info.icone;
    // Se for string, não renderizamos componente, apenas texto
    return (
      <span style={{ display: "inline-flex", alignItems: "center" }}>
        {Icon && typeof Icon === "function" ? (
          <Icon style={{ color: info.cor, marginRight: 8 }} />
        ) : (
          <span style={{ color: info.cor, marginRight: 8 }}>{/* fallback: sem ícone */}</span>
        )}
        <span>{info.nome}</span>
      </span>
    );
  };

  const getCorDaEspecialidade = (esp) => {
    const info = getEspecialidadeInfo(esp);
    return info && info.cor ? info.cor : "#000000";
  };

  // ----------------- JSX -----------------
  return (
    <div className="plantao-container">
      <h2>{editandoId ? "Editar Plantão" : "Registrar Plantão"}</h2>

      <div className="form-plantao">
        <label>
          Médico:
          <div className="medico-wrapper">
            <input
              type="text"
              placeholder="Digite ou selecione o médico"
              value={medicoInput}
              onChange={(e) => filtrarMedicosInput(e.target.value)}
            />
            <i className="fas fa-chevron-down" onClick={() => setMostrarListaMedicos(!mostrarListaMedicos)}></i>
            {mostrarListaMedicos && (
              <div className="lista-medicos">
                {medicosData
                  .filter((m) => normalizeString(m.nome).includes(normalizeString(medicoInput)))
                  .map((m) => (
                    <div key={m.id || m.idMedico || m.crm} onClick={(e) => handleSelecionarMedico(m, e)}>
                      {m.nome}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </label>

        <label>
          CRM:
          <input type="text" value={crm} readOnly placeholder="CRM do médico" />
        </label>

        <label>
          Procurar Médico:
          <div className="lupa-wrapper">
            <input
              type="text"
              placeholder="Digite para buscar"
              value={lupaInput}
              onChange={(e) => setLupaInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") abrirListaLupa();
              }}
            />
            <i className="fas fa-search" onClick={abrirListaLupa}></i>
            {mostrarListaLupa && listaFiltradaLupa.length > 0 && (
              <div className="lista-medicos">
                {listaFiltradaLupa.map((m) => (
                  <div key={m.id || m.idMedico || m.crm} onClick={() => handleSelecionarMedicoDaLupa(m)}>
                    {m.nome}
                  </div>
                ))}
              </div>
            )}
          </div>
        </label>

        <label>
          Especialidade:
          <select value={especialidade} onChange={(e) => setEspecialidade(e.target.value)}>
            <option value="">Todos</option>
            {uniqueSpecialties.map((espNome, index) => (
              <option key={index} value={espNome}>
                {espNome}
              </option>
            ))}
          </select>
        </label>

        <label>
          Quantidade de atendimentos:
          <input
            type="number"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            placeholder="0"
          />
        </label>

        <div className="data-hora-wrapper">
          <label>
            Data do Atendimento:
            <input type="date" value={dataAtendimento} onChange={(e) => setDataAtendimento(e.target.value)} />
          </label>
          <label>
            Hora do Atendimento:
            <input type="time" value={horaAtendimento} onChange={(e) => setHoraAtendimento(e.target.value)} />
          </label>
        </div>

        <button className="btn-salvar-plantao" onClick={handleAddPlantao}>
          {editandoId ? "Atualizar Plantão" : "Salvar Plantão"}
        </button>
      </div>

      {mensagemGlobal && (
        <div className={`mensagem-global ${tipoMensagem}`}>
          <p>{mensagemGlobal}</p>
          {plantaoParaExcluir && (
            <div className="confirmacao-botoes">
              <button className="btn-confirmar" onClick={handleExcluirConfirmado}>
                Sim
              </button>
              <button className="btn-cancelar" onClick={handleCancelarExclusao}>
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {plantaoList.length > 0 ? (
        <div className="plantao-cards">
          {plantaoList.map((p) => (
            <div
              className="plantao-card"
              key={p.id}
              style={{ borderLeft: `5px solid ${getCorDaEspecialidade(p.especialidade)}` }}
            >
              <div className="info-plantao">
                <p>
                  <span>Médico:</span> {p.nome}
                </p>
                <p>
                  <span>CRM:</span> {p.crm}
                </p>
                <p>
                  <span>Especialidade:</span> {renderEspecialidade(p.especialidade)}
                </p>
                <p>
                  <span>Quantidade:</span> {p.quantidade}
                </p>
                <p>
                  <span>Data:</span> {p.data ? dayjs(p.data).format("DD/MM/YYYY") : ""}
                </p>
                <p>
                  <span>Hora:</span> {p.hora}
                </p>
              </div>
              <div className="acoes-plantao">
                <button className="btn-editar-plantao" onClick={() => handleEditPlantao(p)}>
                  Editar
                </button>
                <button className="btn-excluir-plantao" onClick={() => handleConfirmarExclusao(p.id)}>
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="nenhum-plantao">Nenhum plantão registrado ainda.</p>
      )}

      <button className="btn-cadastrar-medico" onClick={() => navigate("/medicos")}>
        Cadastrar Médico
      </button>
    </div>
  );
}