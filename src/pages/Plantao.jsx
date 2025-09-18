import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Plantao.css";

function formatarDataHora(data, hora) {
  if (!data || !hora) return { dataFormatada: "", horaFormatada: "" };
  const [ano, mes, dia] = data.split("-");
  const [hh, mm] = hora.split(":");
  return {
    dataFormatada: `${dia}/${mes}/${ano}`,
    horaFormatada: `${hh}:${mm}`,
  };
}

export default function Plantao() {
  const navigate = useNavigate();

  const [plantaoList, setPlantaoList] = useState(() => {
    const dados = localStorage.getItem("plantaoData");
    return dados ? JSON.parse(dados) : [];
  });

  const [medicosData, setMedicosData] = useState([]);
  const [medicoInput, setMedicoInput] = useState("");
  const [crm, setCrm] = useState(""); // Novo estado para CRM
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

  useEffect(() => {
    const dados = JSON.parse(localStorage.getItem("medicos") || "[]");
    setMedicosData(dados);
  }, []);

  useEffect(() => {
    localStorage.setItem("plantaoData", JSON.stringify(plantaoList));
  }, [plantaoList]);

  useEffect(() => {
    const interval = setInterval(() => {
      const agora = new Date();
      const novaData = agora.toLocaleDateString();
      if (novaData !== dataAtual) {
        setPlantaoList([]);
        localStorage.removeItem("plantaoData");
        setDataAtual(novaData);
      }
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [dataAtual]);

  useEffect(() => {
    if (mensagemGlobal) {
      const timer = setTimeout(() => setMensagemGlobal(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [mensagemGlobal]);

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

  const filtrarMedicosInput = (valor) => {
    setMedicoInput(valor);
    setMostrarListaMedicos(true);
  };

  const handleSelecionarMedicoDaLista = (nome, e) => {
    e.stopPropagation();
    setMedicoInput(nome);
    setMostrarListaMedicos(false);

    // Preenche CRM automaticamente
    const medicoSelecionado = medicosData.find(
      (m) => m.nome.toLowerCase() === nome.toLowerCase()
    );
    setCrm(medicoSelecionado ? medicoSelecionado.crm : "");
  };

  const handleSelecionarMedicoDaLupa = (nome) => {
    setMedicoInput(nome);
    setLupaInput("");
    setListaFiltradaLupa([]);
    setMostrarListaLupa(false);

    // Preenche CRM automaticamente
    const medicoSelecionado = medicosData.find(
      (m) => m.nome.toLowerCase() === nome.toLowerCase()
    );
    setCrm(medicoSelecionado ? medicoSelecionado.crm : "");
  };

  const abrirListaLupa = () => {
    if (!lupaInput.trim()) {
      setListaFiltradaLupa(medicosData);
    } else {
      const filtro = medicosData.filter((m) =>
        m.nome.toLowerCase().includes(lupaInput.toLowerCase())
      );
      setListaFiltradaLupa(filtro);
      if (filtro.length === 0) {
        setMensagemGlobal("⚠️ Médico não encontrado ou erro de digitação!");
        setTipoMensagem("erro");
      }
    }
    setMostrarListaLupa(true);
  };

  const handleAddPlantao = () => {
    if (!medicoInput || !crm || !especialidade || !quantidade || !dataAtendimento || !horaAtendimento) {
      setMensagemGlobal("⚠️ Preencha todos os campos! O CRM é obrigatório.");
      setTipoMensagem("erro");
      return;
    }

    const medicoExiste = medicosData.some(
      (m) => m.nome.toLowerCase() === medicoInput.trim().toLowerCase()
    );

    if (!medicoExiste) {
      setMensagemGlobal("⚠️ Médico não encontrado ou não está cadastrado!");
      setTipoMensagem("erro");
      return;
    }

    const { dataFormatada, horaFormatada } = formatarDataHora(dataAtendimento, horaAtendimento);

    const conflito = plantaoList.some((p) => {
      if (p.id === editandoId) return false;
      if (p.nome !== medicoInput) return false;
      if (p.especialidade !== especialidade) return false;

      const [diaP, mesP, anoP] = p.data.split("/");
      const [horaP, minP] = p.hora.split(":");
      const plantaoDataHora = new Date(`${anoP}-${mesP}-${diaP}T${horaP}:${minP}:00`);

      const [diaN, mesN, anoN] = dataFormatada.split("/");
      const novaDataHora = new Date(`${anoN}-${mesN}-${diaN}T${horaFormatada}:00`);

      const diffHoras = Math.abs(novaDataHora - plantaoDataHora) / (1000 * 60 * 60);
      return diffHoras < 12;
    });

    if (conflito) {
      setMensagemGlobal("⚠️ Este médico já possui um plantão nessa especialidade nas últimas 12h!");
      setTipoMensagem("erro");
      return;
    }

    setMensagemGlobal(editandoId ? "✅ Plantão atualizado com sucesso!" : "✅ Plantão salvo com sucesso!");
    setTipoMensagem("sucesso");

    if (editandoId) {
      const atualizado = plantaoList.map((p) =>
        p.id === editandoId
          ? { ...p, nome: medicoInput, crm, especialidade, quantidade, data: dataFormatada, hora: horaFormatada }
          : p
      );
      setPlantaoList(atualizado);
      setEditandoId(null);
    } else {
      const novoPlantao = {
        id: Date.now(),
        nome: medicoInput,
        crm,
        especialidade,
        quantidade,
        data: dataFormatada,
        hora: horaFormatada,
      };
      setPlantaoList([...plantaoList, novoPlantao]);
    }

    setMedicoInput("");
    setCrm("");
    setEspecialidade("");
    setQuantidade("");
    setDataAtendimento("");
    setHoraAtendimento("");
  };

const handleConfirmarExclusao = (id) => {
    setPlantaoParaExcluir(id);
    setMensagemGlobal("⚠️ Deseja realmente excluir este plantão?");
    setTipoMensagem("erro");

    // Faz a rolagem para o container da mensagem global
    setTimeout(() => {
        const mensagemEl = document.querySelector(".mensagem-global");
        if (mensagemEl) {
            mensagemEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, 100); // pequeno delay para garantir que a mensagem foi renderizada
};

  const handleExcluirConfirmado = () => {
    if (!plantaoParaExcluir) return;
    const atualizado = plantaoList.filter((p) => p.id !== plantaoParaExcluir);
    setPlantaoList(atualizado);
    setPlantaoParaExcluir(null);
    setMensagemGlobal("🗑️ Plantão excluído com sucesso!");
    setTipoMensagem("sucesso");
    
  };

  const handleCancelarExclusao = () => {
    setPlantaoParaExcluir(null);
    setMensagemGlobal("");
  };

  const handleEditPlantao = (plantao) => {
    setMedicoInput(plantao.nome);
    setCrm(plantao.crm);
    setEspecialidade(plantao.especialidade);
    setQuantidade(plantao.quantidade);
    const [dia, mes, ano] = plantao.data.split("/");
    setDataAtendimento(`${ano}-${mes}-${dia}`);
    setHoraAtendimento(plantao.hora);
    setEditandoId(plantao.id);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const corEspecialidade = (esp) => {
    switch (esp) {
      case "Clinico": return "#6c63ff";
      case "Pediatrico": return "#ff8c42";
      case "Emergencista": return "#ff5c5c";
      case "Cinderela": return "#9b59b6";
      case "Visitador": return "#2ecc71";
      case "Fisioterapeuta": return "#3498db";
      case "Nutricionista": return "#f1c40f";
      default: return "#95a5a6";
    }
  };

  const iconeEspecialidade = (esp) => {
    switch (esp) {
      case "Clinico": return <i className="fas fa-stethoscope"></i>;
      case "Pediatrico": return <i className="fas fa-baby"></i>;
      case "Emergencista": return <i className="fas fa-briefcase-medical"></i>;
      case "Cinderela": return <i className="fas fa-moon"></i>;
      case "Visitador": return <i className="fas fa-user-check"></i>;
      case "Fisioterapeuta": return <i className="fas fa-dumbbell"></i>;
      case "Nutricionista": return <i className="fas fa-apple-alt"></i>;
      default: return <i className="fas fa-user-md"></i>;
    }
  };

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
                  .filter((m) => m.nome.toLowerCase().includes(medicoInput.toLowerCase()))
                  .map((m) => (
                    <div key={m.id} onClick={(e) => handleSelecionarMedicoDaLista(m.nome, e)}>
                      {m.nome}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </label>

        {/* Campo CRM */}
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
              onKeyDown={(e) => { if (e.key === "Enter") abrirListaLupa(); }}
            />
            <i className="fas fa-search" onClick={abrirListaLupa}></i>
            {mostrarListaLupa && listaFiltradaLupa.length > 0 && (
              <div className="lista-medicos">
                {listaFiltradaLupa.map((m) => (
                  <div key={m.id} onClick={() => handleSelecionarMedicoDaLupa(m.nome)}>
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
    {[...new Set(medicosData.map((m) => m.especialidade.toLowerCase()))] // converte para minúsculo
      .filter((esp) => esp && esp.trim() !== "")                         // remove vazios
      .map((esp, index) => (
        <option key={index} value={esp}>
          {esp.charAt(0).toUpperCase() + esp.slice(1)} {/* Exibe bonito */}
        </option>
      ))}
  </select>
</label>

        <label>
          Quantidade de atendimentos:
          <input type="number" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} placeholder="0" />
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
              <button className="btn-confirmar" onClick={handleExcluirConfirmado}>Sim</button>
              <button className="btn-cancelar" onClick={handleCancelarExclusao}>Cancelar</button>
            </div>
          )}
        </div>
      )}

      {plantaoList.length > 0 ? (
        <div className="plantao-cards">
          {plantaoList.map((p) => (
            <div className="plantao-card" key={p.id} style={{ borderTop: `6px solid ${corEspecialidade(p.especialidade)}` }}>
              <div className="info-plantao">
                <p><span>Médico:</span> {p.nome}</p>
                <p><span>CRM:</span> {p.crm}</p>
                <p><span>Especialidade:</span> {iconeEspecialidade(p.especialidade)} {p.especialidade}</p>
                <p><span>Quantidade:</span> {p.quantidade}</p>
                <p><span>Data:</span> {p.data}</p>
                <p><span>Hora:</span> {p.hora}</p>
              </div>
              <div className="acoes-plantao">
                <button className="btn-editar-plantao" onClick={() => handleEditPlantao(p)}>Editar</button>
                <button className="btn-excluir-plantao" onClick={() => handleConfirmarExclusao(p.id)}>Excluir</button>
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
