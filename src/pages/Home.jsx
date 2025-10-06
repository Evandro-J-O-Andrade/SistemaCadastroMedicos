// src/pages/Home.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as FaIcons from "react-icons/fa";
import "./Home.css";
import "./mobile.css";
import LogoAlpha from "../img/Logo_Alpha.png";
import { getEspecialidadeInfo } from "../api/especialidades";

/* --- util --- */
// Normaliza strings: remove acentos / trim / lowercase
const normalizar = (str) =>
  str ? String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";

// Parseia datas "DD/MM/YYYY" ou "YYYY-MM-DD" ou Date.parse fallback
const parseData = (dataStr) => {
  if (!dataStr || typeof dataStr !== "string") return null;
  if (dataStr.includes("/")) {
    const [dia, mes, ano] = dataStr.split("/").map(Number);
    return new Date(ano, mes - 1, dia);
  } else if (dataStr.includes("-")) {
    const [ano, mes, dia] = dataStr.split("-").map(Number);
    return new Date(ano, mes - 1, dia);
  }
  const d = new Date(dataStr);
  return isNaN(d) ? null : d;
};

/* --- Card reutilizável de Especialidades --- */
function CardEspecialidades({ titulo, dados, mostrarTotal = true, mostrarMedia = true }) {
  const [expandido, setExpandido] = useState(false);

  const total = dados.reduce(
    (acc, item) => acc + (Number(item.quantidade || item.totalMensal || item.totalAno || 0) || 0),
    0
  );

  return (
    <div
      className={`card-resumo ${expandido ? "expandido" : ""}`}
      onClick={() => setExpandido((s) => !s)}
      style={{ cursor: "pointer" }}
    >
      <h3>{titulo}</h3>

      {!expandido ? (
        mostrarTotal && (
          <p style={{ margin: "4px 0", fontSize: "0.9rem" }}>
            <strong>Total:</strong> {total}
          </p>
        )
      ) : (
        <div className="lista-especialidades" style={{ marginTop: 4 }}>
          {mostrarTotal && (
            <p style={{ margin: "4px 0", fontSize: "0.9rem" }}>
              <strong>Total:</strong> {total}
            </p>
          )}
          {dados.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                fontSize: "0.85rem",
                margin: "6px 0",
                lineHeight: 1.2,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                {item.icon && typeof item.icon === "function" ? (
                  <item.icon size={14} style={{ color: item.color || "#666", marginRight: 8 }} />
                ) : (
                  <FaIcons.FaUserMd size={14} style={{ color: item.color || "#666", marginRight: 8 }} />
                )}
                <span style={{ fontWeight: 600 }}>{item.especialidade}</span>
              </div>
              <div style={{ marginLeft: 22, fontSize: "0.85rem" }}>
                {item.quantidade ?? item.totalMensal ?? item.totalAno ?? 0}
                {mostrarMedia &&
                  (item.mediaDiaria !== undefined ||
                    item.mediaMes !== undefined ||
                    item.mediaAno !== undefined) && (
                    <span style={{ marginLeft: 8 }}>
                      | Dia: {item.mediaDiaria ?? ""} | Mês: {item.mediaMes ?? ""} | Ano: {item.mediaAno ?? ""}
                    </span>
                  )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* --- Card de Médias --- */
function CardMedias({ titulo, total, mediaDia, mediaMes, totalAno }) {
  const [expandido, setExpandido] = useState(false);

  return (
    <div
      className={`card-resumo ${expandido ? "expandido" : ""}`}
      onClick={() => setExpandido((s) => !s)}
      style={{ cursor: "pointer" }}
    >
      <h3>{titulo}</h3>
      {!expandido ? (
        <p style={{ margin: "4px 0", fontSize: "0.9rem" }}>
          <strong>Total de atendimentos:</strong> {total}
        </p>
      ) : (
        <div style={{ marginTop: 4, fontSize: "0.85rem", lineHeight: 1.3 }}>
          <p>
            <strong>Média/dia:</strong> {mediaDia}
          </p>
          <p>
            <strong>Média/mês:</strong> {mediaMes}
          </p>
          <p>
            <strong>Total ano:</strong> {totalAno}
          </p>
        </div>
      )}
    </div>
  );
}

/* --- Página Home --- */
export default function Home() {
  const navigate = useNavigate();
  const [usuarioLogado, setUsuarioLogado] = useState(false);

  const [plantaoHojeRaw, setPlantaoHojeRaw] = useState([]);
  const [dadosAtendimentosHoje, setDadosAtendimentosHoje] = useState([]);
  const [atendimentosHojeTotal, setAtendimentosHojeTotal] = useState(0);
  const [mediaDia, setMediaDia] = useState(0);
  const [mediaMes, setMediaMes] = useState(0);
  const [totalAno, setTotalAno] = useState(0);
  const [medicosCadastrados, setMedicosCadastrados] = useState(0);
  const [especialidadesCount, setEspecialidadesCount] = useState(0);
  const [mediaPorEspecialidade, setMediaPorEspecialidade] = useState([]);
  const [totalMediaEspecialidades, setTotalMediaEspecialidades] = useState(0);

  const novidades = [
    { id: 1, titulo: "Sistema atualizado", descricao: "Nova versão com melhorias no painel de relatórios." },
    { id: 2, titulo: "Treinamento disponível", descricao: "Treinamento online para novos funcionários." },
    { id: 3, titulo: "Suporte técnico", descricao: "Suporte disponível de 8h às 18h." },
  ];

  const resolveMedicoFromPlantao = (plantao, medicosIndexById, medicosIndexByName) => {
    const possibleNameFields = ["nomeMedico", "nome", "medicoNome", "medico_name", "medico"];
    for (const f of possibleNameFields) {
      const v = plantao[f];
      if (!v) continue;
      if (typeof v === "string" && v.trim())
        return { name: v.trim(), medicoObj: medicosIndexByName.get(normalizar(v)) || null };
      if (typeof v === "object") {
        if (v.nome || v.name) return { name: String(v.nome || v.name), medicoObj: v };
        if (v.id || v._id) {
          const found = medicosIndexById.get(String(v.id || v._id));
          if (found) return { name: found.nome || found.name || "Desconhecido", medicoObj: found };
        }
      }
    }

    const idCandidates = [
      plantao.idMedico,
      plantao.id_medico,
      plantao.medicoId,
      plantao.medico_id,
      plantao.id,
      plantao._id,
      plantao.medico,
    ].filter(Boolean);

    for (const cand of idCandidates) {
      if (typeof cand === "object") {
        if (cand.nome || cand.name) return { name: String(cand.nome || cand.name), medicoObj: cand };
        if (cand.id || cand._id) {
          const found = medicosIndexById.get(String(cand.id || cand._id));
          if (found) return { name: found.nome || found.name || "Desconhecido", medicoObj: found };
        }
        continue;
      }
      const key = String(cand);
      const byId = medicosIndexById.get(key) || medicosIndexById.get(String(Number(key))) || null;
      if (byId) return { name: byId.nome || byId.name || "Desconhecido", medicoObj: byId };
      const byName = medicosIndexByName.get(normalizar(key));
      if (byName) return { name: byName.nome || byName.name || key, medicoObj: byName };
    }

    return { name: "Medico não encontrado!", medicoObj: null };
  };

  const atualizarDados = () => {
    try {
      const logado = localStorage.getItem("usuarioLogado") === "true";
      setUsuarioLogado(logado);

      const plantaoData = JSON.parse(localStorage.getItem("plantaoData") || "[]");
      const medicosData = JSON.parse(localStorage.getItem("medicos") || "[]");

      const medicosIndexById = new Map();
      const medicosIndexByName = new Map();
      (medicosData || []).forEach((m) => {
        if (!m) return;
        const possibleIds = [m.id, m._id, m.idMedico, m.id_medico].filter(Boolean);
        for (const id of possibleIds) medicosIndexById.set(String(id), m);
        const nome = m.nome || m.name || m.nomeMedico || "";
        if (nome) medicosIndexByName.set(normalizar(nome), m);
      });

      const hoje = new Date();
      const diaHoje = hoje.getDate();
      const mesAtual = hoje.getMonth();
      const anoAtual = hoje.getFullYear();

      // --- Plantão hoje ---
      const plantaoHojeFiltrado = (plantaoData || []).filter((p) => {
        const d = parseData(p?.data);
        return d && d.getFullYear() === anoAtual && d.getMonth() === mesAtual && d.getDate() === diaHoje;
      });
      setPlantaoHojeRaw(plantaoHojeFiltrado);

      const totalHoje = plantaoHojeFiltrado.reduce(
        (acc, p) => acc + (Number(p.quantidade || p.qtd || p.atendimentos || 0) || 0),
        0
      );
      setAtendimentosHojeTotal(totalHoje);

      const mapaMedicos = new Map();
      for (const p of plantaoHojeFiltrado) {
        const qtd = Number(p.quantidade || p.qtd || p.atendimentos || 0) || 0;
        const resolved = resolveMedicoFromPlantao(p, medicosIndexById, medicosIndexByName);
        const nomeMed = resolved.name || "Desconhecido";
        const key = normalizar(nomeMed);
        const prev = mapaMedicos.get(key) || { nome: nomeMed, quantidade: 0, medicoObj: resolved.medicoObj || null };
        prev.quantidade += qtd;
        mapaMedicos.set(key, prev);
      }

      const atendHojeArr = Array.from(mapaMedicos.values()).map((m) => {
        const medObj = m.medicoObj || null;
        const espNome = medObj?.especialidade || medObj?.especialidadeNome || "";
        const espInfo = espNome ? getEspecialidadeInfo(espNome) : { nome: "", icone: FaIcons.FaUserMd, cor: "#666" };
        return {
          especialidade: m.nome,
          quantidade: m.quantidade,
          icon: espInfo.icone || FaIcons.FaUserMd,
          color: espInfo.cor || "#444",
        };
      });
      atendHojeArr.sort((a, b) => b.quantidade - a.quantidade);
      setDadosAtendimentosHoje(atendHojeArr);

      // --- Totais do mês e cálculo de médias ---
      const plantaoMes = (plantaoData || []).filter((p) => {
        const d = parseData(p?.data);
        return d && d.getFullYear() === anoAtual && d.getMonth() === mesAtual;
      });
      const diasMes = new Date(anoAtual, mesAtual + 1, 0).getDate() || 1;
      const totalMes = plantaoMes.reduce(
        (acc, p) => acc + (Number(p.quantidade || p.qtd || p.atendimentos || 0) || 0),
        0
      );
      const mediaDiaCalc = Math.round(totalMes / diasMes);
      setMediaDia(mediaDiaCalc);

      const plantaoAno = (plantaoData || []).filter((p) => {
        const d = parseData(p?.data);
        return d && d.getFullYear() === anoAtual;
      });
      const totalAnoCalc = plantaoAno.reduce(
        (acc, p) => acc + (Number(p.quantidade || p.qtd || p.atendimentos || 0) || 0),
        0
      );
      const mediaMesCalc = Math.round(totalAnoCalc / 12);
      setTotalAno(totalAnoCalc);
      setMediaMes(mediaMesCalc);

      setMedicosCadastrados((medicosData || []).length || 0);

      const espUnicasMedicos = [
        ...new Set(
          (medicosData || [])
            .map((m) => normalizar(m?.especialidade || m?.especialidadeNome || ""))
            .filter(Boolean)
        ),
      ];
      setEspecialidadesCount(espUnicasMedicos.length);

      // --- Médias por especialidade ---
      const mapaMes = new Map();
      const mapaAno = new Map();

      for (const p of plantaoMes) {
        let espRaw = p?.especialidade ? String(p.especialidade) : "";
        if (!espRaw) {
          const resolved = resolveMedicoFromPlantao(p, medicosIndexById, medicosIndexByName);
          espRaw = resolved.medicoObj?.especialidade || resolved.medicoObj?.especialidadeNome || "";
        }
        if (!espRaw) espRaw = "Desconhecida";

        const norm = normalizar(espRaw);
        const quantidade = Number(p.quantidade || p.qtd || p.atendimentos || 0) || 0;

        if (!mapaMes.has(norm)) mapaMes.set(norm, { nomeOriginal: espRaw, total: quantidade });
        else mapaMes.get(norm).total += quantidade;
      }

      for (const p of plantaoAno) {
        let espRaw = p?.especialidade ? String(p.especialidade) : "";
        if (!espRaw) {
          const resolved = resolveMedicoFromPlantao(p, medicosIndexById, medicosIndexByName);
          espRaw = resolved.medicoObj?.especialidade || resolved.medicoObj?.especialidadeNome || "";
        }
        if (!espRaw) espRaw = "Desconhecida";

        const norm = normalizar(espRaw);
        const quantidade = Number(p.quantidade || p.qtd || p.atendimentos || 0) || 0;

        if (!mapaAno.has(norm)) mapaAno.set(norm, quantidade);
        else mapaAno.set(norm, mapaAno.get(norm) + quantidade);
      }

      const mediasEsp = [];
      for (const [norm, { nomeOriginal, total }] of mapaMes.entries()) {
        if (!total) continue;

        const totalMensal = total;
        const mediaDiaria = Math.round(totalMensal / diasMes);
        const totalAnoEspecialidade = mapaAno.get(norm) || 0;
        const mediaMes = Math.round(totalAnoEspecialidade / 12);

        const espInfo = getEspecialidadeInfo(nomeOriginal);

        mediasEsp.push({
          especialidade: (espInfo && espInfo.nome) ? espInfo.nome.toUpperCase() : nomeOriginal.toUpperCase(),
          icon: espInfo.icone || FaIcons.FaUserMd,
          color: espInfo.cor || "#666",
          totalMensal,
          mediaDiaria,
          mediaMes,
          mediaAno: totalAnoEspecialidade,
        });
      }

      mediasEsp.sort((a, b) => (b.totalMensal || 0) - (a.totalMensal || 0));
      setMediaPorEspecialidade(mediasEsp);
      setTotalMediaEspecialidades(mediasEsp.reduce((acc, i) => acc + (i.totalMensal || 0), 0));
    } catch (err) {
      console.error("Erro em atualizarDados Home:", err);
      setPlantaoHojeRaw([]);
      setDadosAtendimentosHoje([]);
      setAtendimentosHojeTotal(0);
      setMediaDia(0);
      setMediaMes(0);
      setTotalAno(0);
      setMedicosCadastrados(0);
      setEspecialidadesCount(0);
      setMediaPorEspecialidade([]);
      setTotalMediaEspecialidades(0);
    }
  };

  useEffect(() => {
    const handleStorageChange = () => atualizarDados();
    window.addEventListener("storage", handleStorageChange);
    atualizarDados();
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleEntrar = () => {
    if (!usuarioLogado) {
      alert("Você precisa fazer login para acessar o sistema.");
      navigate("/login");
      return;
    }
    const tipoUsuario = localStorage.getItem("tipoUsuario");
    if (["admin", "suporte", "comum"].includes(tipoUsuario)) navigate("/home");
    else navigate("/relatorios");
  };

  return (
    <div className="home-container">
      <section className="banner">
        <img src={LogoAlpha} alt="Logo da empresa" className="logo-home" />
        <h1>Bem-vindo ao Sistema de Gestão Médica</h1>
        <p>Controle completo de atendimentos, relatórios e histórico do seu time.</p>
      </section>

      <section className="resumo-sistema">
        <CardEspecialidades titulo="Atendimentos Hoje (por médico)" dados={dadosAtendimentosHoje} />
        <CardMedias titulo="Médias" total={atendimentosHojeTotal} mediaDia={mediaDia} mediaMes={mediaMes} totalAno={totalAno} />

        <div className="card-resumo">
          <h3>Médicos cadastrados</h3>
          <p>{medicosCadastrados}</p>
        </div>
        <div className="card-resumo">
          <h3>Especialidades</h3>
          <p>{especialidadesCount}</p>
        </div>

        <CardEspecialidades titulo="Totais por Especialidades (mês / média dia)" dados={mediaPorEspecialidade} mostrarMedia={true} />
      </section>

      <section className="novidades">
        <h2>Novidades</h2>
        <div className="novidades-list">
          {novidades.map((item) => (
            <div key={item.id} className="card-novidade">
              <h4>{item.titulo}</h4>
              <p>{item.descricao}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="acesso-rapido">
        <h2>Acesso rápido</h2>
        <button className="btn-login" onClick={handleEntrar}>
          Entrar no Sistema
        </button>
      </section>
    </div>
  );
}
