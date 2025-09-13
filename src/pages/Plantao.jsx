import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import medicosData from "./MedicosData";
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

  // Inicializa plantaoList com dados do localStorage
  const [plantaoList, setPlantaoList] = useState(() => {
    const dados = localStorage.getItem("plantaoData");
    return dados ? JSON.parse(dados) : [];
  });

  const [medicoInput, setMedicoInput] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [dataAtendimento, setDataAtendimento] = useState("");
  const [horaAtendimento, setHoraAtendimento] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [dataAtual, setDataAtual] = useState(new Date().toLocaleDateString());
  const [conflitoAviso, setConflitoAviso] = useState("");

  // Salva sempre que plantaoList mudar
  useEffect(() => {
    localStorage.setItem("plantaoData", JSON.stringify(plantaoList));
  }, [plantaoList]);

  // Limpa plantões antigos na virada de dia
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

  const medicoSuggestions = medicosData.filter((m) =>
    m.nome.toLowerCase().includes(medicoInput.toLowerCase())
  );

  const handleAddPlantao = () => {
    if (!medicoInput || !especialidade || !quantidade || !dataAtendimento || !horaAtendimento) {
      setConflitoAviso("⚠️ Preencha todos os campos!");
      return;
    }

    const { dataFormatada, horaFormatada } = formatarDataHora(dataAtendimento, horaAtendimento);

    // Verificação de conflito: mesmo médico, mesma especialidade, intervalo < 12h
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
      setConflitoAviso("⚠️ Este médico já possui um plantão registrado nessa especialidade nas últimas 12h!");
      return;
    }

    setConflitoAviso("✅ Plantão salvo com sucesso!"); // sucesso

    if (editandoId) {
      const atualizado = plantaoList.map((p) =>
        p.id === editandoId
          ? { ...p, nome: medicoInput, especialidade, quantidade, data: dataFormatada, hora: horaFormatada }
          : p
      );
      setPlantaoList(atualizado);
      setEditandoId(null);
    } else {
      const novoPlantao = {
        id: Date.now(),
        nome: medicoInput,
        especialidade,
        quantidade,
        data: dataFormatada,
        hora: horaFormatada,
      };
      setPlantaoList([...plantaoList, novoPlantao]);
    }

    setMedicoInput("");
    setEspecialidade("");
    setQuantidade("");
    setDataAtendimento("");
    setHoraAtendimento("");
  };

  const handleRemovePlantao = (id) => {
    if (!window.confirm("Deseja realmente excluir este plantão?")) return;
    setPlantaoList(plantaoList.filter((p) => p.id !== id));
  };

  const handleEditPlantao = (plantao) => {
    setMedicoInput(plantao.nome);
    setEspecialidade(plantao.especialidade);
    setQuantidade(plantao.quantidade);
    const [dia, mes, ano] = plantao.data.split("/");
    setDataAtendimento(`${ano}-${mes}-${dia}`);
    setHoraAtendimento(plantao.hora);
    setEditandoId(plantao.id);
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
          <input
            type="text"
            placeholder="Digite o nome do médico"
            value={medicoInput}
            onChange={(e) => setMedicoInput(e.target.value)}
            list="medicos"
          />
          <datalist id="medicos">
            {medicoSuggestions.map((m) => (
              <option key={m.id} value={m.nome} />
            ))}
          </datalist>
        </label>

        <label>
          Especialidade:
          <select value={especialidade} onChange={(e) => setEspecialidade(e.target.value)}>
            <option value="">Selecione</option>
            <option value="Clinico">Clínico</option>
            <option value="Pediatrico">Pediátrico</option>
            <option value="Emergencista">Emergencista</option>
            <option value="Cinderela">Cinderela</option>
            <option value="Visitador">Visitador</option>
            <option value="Fisioterapeuta">Fisioterapeuta</option>
            <option value="Nutricionista">Nutricionista</option>
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

          {conflitoAviso && (
            <span
              className={`aviso-conflito ${
                conflitoAviso.startsWith("✅") ? "sucesso" : ""
              }`}
            >
              {conflitoAviso}
            </span>
          )}
        </div>

        <button className="btn-salvar-plantao" onClick={handleAddPlantao}>
          {editandoId ? "Atualizar Plantão" : "Salvar Plantão"}
        </button>
      </div>

      {plantaoList.length > 0 ? (
        <div className="plantao-cards">
          {plantaoList.map((p) => (
            <div
              className="plantao-card"
              key={p.id}
              style={{ borderTop: `6px solid ${corEspecialidade(p.especialidade)}` }}
            >
              <div className="info-plantao">
                <p><span>Médico:</span> {p.nome}</p>
                <p><span>Especialidade:</span> {iconeEspecialidade(p.especialidade)} {p.especialidade}</p>
                <p><span>Quantidade:</span> {p.quantidade}</p>
                <p><span>Data:</span> {p.data}</p>
                <p><span>Hora:</span> {p.hora}</p>
              </div>
              <div className="acoes-plantao">
                <button className="btn-editar-plantao" onClick={() => handleEditPlantao(p)}>Editar</button>
                <button className="btn-excluir-plantao" onClick={() => handleRemovePlantao(p.id)}>Excluir</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>Nenhum plantão registrado ainda.</p>
      )}

      <button className="btn-cadastrar-medico" onClick={() => navigate("/medicos")}>
        Cadastrar Médico
      </button>
    </div>
  );
}
