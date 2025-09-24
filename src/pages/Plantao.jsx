import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "./Plantao.css";

function formatarDataHora(data, hora) {
  if (!data || !hora) return { dataFormatada: "", horaFormatada: "" };
  return {
    dataFormatada: dayjs(data).format("YYYY-MM-DD"), // Padronizado pra YYYY-MM-DD
    horaFormatada: hora,
  };
}

const normalizeString = (str) => {
  if (!str) return "";
  return str.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export default function Plantao() {
  const navigate = useNavigate();

  const [plantaoList, setPlantaoList] = useState(() => {
    const dados = localStorage.getItem("plantaoData");
    return dados ? JSON.parse(dados) : [];
  });

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

  useEffect(() => {
    const dados = JSON.parse(localStorage.getItem("medicos") || "[]");
    setMedicosData(dados);
  }, []);

  useEffect(() => {
    localStorage.setItem("plantaoData", JSON.stringify(plantaoList)); // Persiste sempre
  }, [plantaoList]);

  // Reset só visual na página, não apaga localStorage
  useEffect(() => {
    const interval = setInterval(() => {
      const agora = new Date();
      const novaData = agora.toLocaleDateString();
      if (novaData !== dataAtual) {
        setPlantaoList([]); // Só limpa a view, dados ficam no localStorage
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

  const uniqueSpecialties = (() => {
    const map = {};
    medicosData.forEach((m) => {
      if (!m.especialidade) return;
      const key = normalizeString(m.especialidade);
      if (!map[key]) map[key] = m.especialidade;
    });
    return Object.values(map);
  })();

  const filtrarMedicosInput = (valor) => {
    setMedicoInput(valor);
    setMostrarListaMedicos(true);
  };

  const handleSelecionarMedico = (medico, e) => {
    if (e) e.stopPropagation();
    setMedicoInput(medico.nome);
    setMedicoId(medico.id);
    setCrm(medico.crm || "");
    if (medico.especialidade) {
      const match = uniqueSpecialties.find(
        (esp) => normalizeString(esp) === normalizeString(medico.especialidade)
      );
      setEspecialidade(match || medico.especialidade);
    }
    setMostrarListaMedicos(false);
  };

  const handleSelecionarMedicoDaLupa = (medico) => {
    setMedicoInput(medico.nome);
    setMedicoId(medico.id);
    setCrm(medico.crm || "");
    if (medico.especialidade) {
      const match = uniqueSpecialties.find(
        (esp) => normalizeString(esp) === normalizeString(medico.especialidade)
      );
      setEspecialidade(match || medico.especialidade);
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
        setMensagemGlobal("⚠️ Médico não encontrado ou erro de digitação!");
        setTipoMensagem("erro");
      }
    }
    setMostrarListaLupa(true);
  };

  const validarConflito = (novoPlantao) => {
    return plantaoList.some((p) => {
      if (p.id === editandoId) return false;
      if (normalizeString(p.nome) !== normalizeString(novoPlantao.nome)) return false;
      if (
        normalizeString(p.especialidade) !== normalizeString(novoPlantao.especialidade)
      )
        return false;

      const registroP = dayjs(p.data + " " + p.hora);
      const registroN = dayjs(novoPlantao.data + " " + novoPlantao.hora);
      const diffHoras = Math.abs(registroN.diff(registroP, 'hour'));
      return diffHoras < 12;
    });
  };

  const handleAddPlantao = () => {
    if (
      !medicoInput ||
      !crm ||
      !especialidade ||
      !quantidade ||
      !dataAtendimento ||
      !horaAtendimento
    ) {
      setMensagemGlobal("⚠️ Preencha todos os campos! O CRM é obrigatório.");
      setTipoMensagem("erro");
      return;
    }

    const medicoExiste = medicosData.some((m) => m.id === medicoId);
    if (!medicoExiste) {
      setMensagemGlobal("⚠️ Médico não encontrado ou não está cadastrado!");
      setTipoMensagem("erro");
      return;
    }

    const { dataFormatada, horaFormatada } = formatarDataHora(
      dataAtendimento,
      horaAtendimento
    );

    const novoPlantao = {
      id: editandoId || Date.now(),
      medicoId,
      nome: medicoInput,
      crm,
      especialidade,
      quantidade,
      data: dataFormatada,
      hora: horaFormatada,
    };

    if (validarConflito(novoPlantao)) {
      setMensagemGlobal(
        "⚠️ Este médico já possui um plantão nesta especialidade nas últimas 12h!"
      );
      setTipoMensagem("erro");
      return;
    }

    if (editandoId) {
      const atualizado = plantaoList.map((p) =>
        p.id === editandoId ? novoPlantao : p
      );
      setPlantaoList(atualizado);
      setMensagemGlobal("✅ Plantão atualizado com sucesso!");
    } else {
      setPlantaoList([...plantaoList, novoPlantao]);
      setMensagemGlobal("✅ Plantão salvo com sucesso!");
    }

    setTipoMensagem("sucesso");
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
    setMensagemGlobal("⚠️ Deseja realmente excluir este plantão?");
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
    setMedicoId(plantao.medicoId || null);
    setCrm(plantao.crm || "");
    const match = uniqueSpecialties.find(
      (esp) =>
        normalizeString(esp) === normalizeString((plantao.especialidade || ""))
    );
    setEspecialidade(match || plantao.especialidade || "");
    setQuantidade(plantao.quantidade || "");
  if (plantao.data && plantao.hora) {
  setDataAtendimento(plantao.data); // já está em YYYY-MM-DD
  setHoraAtendimento(plantao.hora); // já está em HH:mm
} else {
  setDataAtendimento("");
  setHoraAtendimento("");
}

    setHoraAtendimento(plantao.hora || "");
    setEditandoId(plantao.id);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const iconeEspecialidade = (esp) => {
    switch (normalizeString(esp || "")) {
      case "clinico":
        return <i className="fas fa-user-md"></i>;
      case "pediatrico":
        return <i className="fas fa-baby"></i>;
      case "emergencista":
        return <i className="fas fa-ambulance"></i>;
      case "cinderela":
        return <i className="fas fa-magic"></i>;
      case "visitador":
        return <i className="fas fa-walking"></i>;
      case "fisioterapeuta":
        return <i className="fas fa-dumbbell"></i>;
      case "nutricionista":
        return <i className="fas fa-apple-alt"></i>;
      default:
        return <i className="fas fa-stethoscope"></i>;
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
            <i
              className="fas fa-chevron-down"
              onClick={() => setMostrarListaMedicos(!mostrarListaMedicos)}
            ></i>
            {mostrarListaMedicos && (
              <div className="lista-medicos">
                {medicosData
                  .filter((m) =>
                    normalizeString(m.nome).includes(normalizeString(medicoInput))
                  )
                  .map((m) => (
                    <div key={m.id} onClick={(e) => handleSelecionarMedico(m, e)}>
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
                  <div key={m.id} onClick={() => handleSelecionarMedicoDaLupa(m)}>
                    {m.nome}
                  </div>
                ))}
              </div>
            )}
          </div>
        </label>

        <label>
          Especialidade:
          <select
            value={especialidade}
            onChange={(e) => setEspecialidade(e.target.value)}
          >
            <option value="">Todos</option>
            {uniqueSpecialties.map((esp, index) => (
              <option key={index} value={esp}>
                {esp}
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
            <input
              type="date"
              value={dataAtendimento}
              onChange={(e) => setDataAtendimento(e.target.value)}
            />
          </label>

          <label>
            Hora do Atendimento:
            <input
              type="time"
              value={horaAtendimento}
              onChange={(e) => setHoraAtendimento(e.target.value)}
            />
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
    <div className="plantao-card" key={p.id}>
      <div className="info-plantao">
        <p>
          <span>Médico:</span> {p.nome}
        </p>
        <p>
          <span>CRM:</span> {p.crm}
        </p>
        <p>
          <span>Especialidade:</span> {iconeEspecialidade(p.especialidade)}{" "}
          {p.especialidade}
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
        <button
          className="btn-editar-plantao"
          onClick={() => handleEditPlantao(p)}
        >
          Editar
        </button>
        <button
          className="btn-excluir-plantao"
          onClick={() => handleConfirmarExclusao(p.id)}
        >
          Excluir
        </button>
      </div>
    </div>
  ))}
</div>

      ) : (
        <p className="nenhum-plantao">Nenhum plantão registrado ainda.</p>
      )}

      <button
        className="btn-cadastrar-medico"
        onClick={() => navigate("/medicos")}
      >
        Cadastrar Médico
      </button>
    </div>
  );
}