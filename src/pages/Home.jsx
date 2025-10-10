// src/pages/Home.jsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as FaIcons from "react-icons/fa";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa"; // Para setas do carrossel
import "./Home.css";
import "./mobile.css";
import LogoAlpha from "../img/Logo_Alpha.png";
import { getEspecialidadeInfo } from "../api/especialidades.js";


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



/* --- Card reutilizável de Especialidades/Médicos com paginação e ícones --- */
function CardEspecialidades({ titulo, dados, mostrarTotal = true, mostrarMedia = true, porMedico = false, paginado = false }) {
  const [expandido, setExpandido] = useState(false);
  const [indiceAtual, setIndiceAtual] = useState(0); // Para carrossel/paginação
  const itensPorPagina = 10; // Até 10 itens por página no carrossel



  const total = dados.reduce(
    (acc, item) => acc + (Number(item.quantidade || item.totalDiario || item.totalMensal || item.totalAno || 0) || 0),
    0
  );



  const paginarDados = () => {
    if (!paginado || dados.length <= itensPorPagina) return dados;
    const inicio = indiceAtual * itensPorPagina;
    return dados.slice(inicio, inicio + itensPorPagina);
  };



  const totalPaginas = paginado ? Math.ceil(dados.length / itensPorPagina) : 1;



  const handleAnterior = (e) => {
    e.stopPropagation();
    if (indiceAtual > 0) setIndiceAtual(indiceAtual - 1);
  };



  const handleProximo = (e) => {
    e.stopPropagation();
    if (indiceAtual < totalPaginas - 1) setIndiceAtual(indiceAtual + 1);
  };



  const itensExibidos = paginarDados();



  return (
    <div
      className={`card-resumo ${expandido ? "expandido" : ""}`}
      onClick={() => setExpandido((s) => !s)}
      style={{ cursor: "pointer", position: "relative", overflow: "hidden" }}
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
          {itensExibidos.map((item, idx) => {
            let Icone = FaIcons.FaUserMd;
            let cor = "#666";


            if (porMedico && item.especialidade) {
              const espInfo = getEspecialidadeInfo(item.especialidade);
              if (espInfo) {
                Icone = espInfo.icone || FaIcons.FaUserMd;
                cor = espInfo.cor || "#666";
              }
            } else {
              if (item.icon) Icone = item.icon;
              if (item.color) cor = item.color;
            }


            return (
              <div
                key={`${item.medico || item.especialidade}-${idx}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  margin: "6px 0",
                  fontSize: "0.9rem",
                  lineHeight: 1.3,
                }}
              >
                <Icone size={16} style={{ color: cor, marginRight: 8 }} />
                <span style={{ fontWeight: "600" }}>{porMedico ? item.medico : item.especialidade}</span>
                <span style={{ marginLeft: "auto", fontWeight: "500" }}>
                  Qt Atendida: {porMedico ? item.quantidade : item.totalDiario || item.quantidade}
                </span>
              </div>
            );
          })}
          {paginado && totalPaginas > 1 && (
            <div className="paginacao-setas-container">
              <button onClick={handleAnterior} disabled={indiceAtual === 0} className="paginacao-seta-btn" aria-label="Página anterior">
                <FaChevronLeft />
              </button>
              <span style={{ fontSize: "0.85rem", color: "#666" }}>
                Página {indiceAtual + 1} de {totalPaginas}
              </span>
              <button onClick={handleProximo} disabled={indiceAtual === totalPaginas - 1} className="paginacao-seta-btn" aria-label="Próxima página">
                <FaChevronRight />
              </button>
            </div>
          )}
          {paginado && totalPaginas > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 8 }}>
              <button onClick={handleAnterior} className="btn-pequeno" disabled={indiceAtual === 0}>Anterior</button>
              <button onClick={handleProximo} className="btn-pequeno" disabled={indiceAtual === totalPaginas - 1}>Próximo</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}



/* --- Card de Médias com troca de visão e paginação --- */
function CardMedias({ titulo, total, mediaDia, mediaMes, totalAno, mediasPorEspecialidade, mediasPorMedicos }) {
  const [expandido, setExpandido] = useState(false);
  const [visaoAtual, setVisaoAtual] = useState(0); // 0: Geral, 1: Por Especialidade, 2: Por Médico
  const [paginaAtual, setPaginaAtual] = useState(0);
  const itensPorPagina = 10;


  const visoes = [
    { id: 0, titulo: "Geral", dados: null },
    { id: 1, titulo: "Por Especialidade", dados: mediasPorEspecialidade },
    { id: 2, titulo: "Por Médico", dados: mediasPorMedicos },
  ];


  const totalPaginas = visoes[visaoAtual].dados ? Math.ceil(visoes[visaoAtual].dados.length / itensPorPagina) : 1;


  const dadosPagina = visoes[visaoAtual].dados
    ? visoes[visaoAtual].dados.slice(paginaAtual * itensPorPagina, (paginaAtual + 1) * itensPorPagina)
    : [];


  const trocarVisao = (id) => {
    setVisaoAtual(id);
    setPaginaAtual(0);
  };


  const handleAnteriorPagina = (e) => {
    e.stopPropagation();
    if (paginaAtual > 0) setPaginaAtual(paginaAtual - 1);
  };


  const handleProximoPagina = (e) => {
    e.stopPropagation();
    if (paginaAtual < totalPaginas - 1) setPaginaAtual(paginaAtual + 1);
  };


  return (
    <div
      className={`card-resumo ${expandido ? "expandido" : ""}`}
      onClick={() => setExpandido((s) => !s)}
      style={{ cursor: "pointer", position: "relative" }}
    >
      <h3>{titulo}</h3>
      {!expandido ? (
        <p style={{ margin: "4px 0", fontSize: "0.9rem" }}>
          <strong>Total de atendimentos:</strong> {total}
        </p>
      ) : (
        <>
          {visaoAtual === 0 && (
            <div style={{ marginTop: 4, fontSize: "0.85rem", lineHeight: 1.3 }}>
              <p><strong>Média/dia:</strong> {mediaDia}</p>
              <p><strong>Média/mês:</strong> {mediaMes}</p>
              <p><strong>Total ano:</strong> {totalAno}</p>
            </div>
          )}
          {(visaoAtual === 1 || visaoAtual === 2) && (
            <>
              {dadosPagina.length === 0 && <p>Nenhum dado disponível.</p>}
              {dadosPagina.map((item, idx) => {
                const isEsp = visaoAtual === 1;
                let Icone = FaIcons.FaUserMd;
                let cor = "#666";


                if (isEsp) {
                  if (item.icon) Icone = item.icon;
                  if (item.color) cor = item.color;
                }


                return (
                  <div
                    key={`${isEsp ? item.especialidade : item.medico}-${idx}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      margin: "6px 0",
                      fontSize: "0.9rem",
                      lineHeight: 1.3,
                    }}
                  >
                    <Icone size={16} style={{ color: cor, marginRight: 8 }} />
                    <span style={{ fontWeight: "600" }}>{isEsp ? item.especialidade : item.medico}</span>
                    <span style={{ marginLeft: "auto", fontWeight: "500" }}>
                      Dia: {item.mediaDiaria} | Mês: {item.mediaMes}
                    </span>
                  </div>
                );
              })}
              {totalPaginas > 1 && (
                <div className="paginacao-setas-container" style={{ marginTop: 10 }}>
                  <button onClick={handleAnteriorPagina} disabled={paginaAtual === 0} className="paginacao-seta-btn" aria-label="Anterior página">
                    <FaChevronLeft />
                  </button>
                  <span style={{ fontSize: "0.85rem", color: "#666", padding: "0 10px" }}>
                    Página {paginaAtual + 1} de {totalPaginas}
                  </span>
                  <button onClick={handleProximoPagina} disabled={paginaAtual === totalPaginas - 1} className="paginacao-seta-btn" aria-label="Próxima página">
                    <FaChevronRight />
                  </button>
                </div>
              )}
            </>
          )}

          <div
            className="card-medias-visoes"
            style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 15 }}
            onClick={(e) => e.stopPropagation()}
          >
            {visoes.map((v) => (
              <button
                key={v.id}
                onClick={() => trocarVisao(v.id)}
                className={`card-medias-visoes-btn ${visaoAtual === v.id ? "active" : ""}`}
              >
                {v.titulo}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}



export default function Home() {
  const navigate = useNavigate();
  const [usuarioLogado, setUsuarioLogado] = useState(false);

  const [plantaoHojeRaw, setPlantaoHojeRaw] = useState([]);
  const [dadosAtendimentosHoje, setDadosAtendimentosHoje] = useState([]);
  const [atendimentosHojeTotal, setAtendimentosHojeTotal] = useState(0);
  const [totalMes, setTotalMes] = useState(0);
  const [mediaDia, setMediaDia] = useState(0);
  const [mediaMes, setMediaMes] = useState(0);
  const [totalAno, setTotalAno] = useState(0);
  const [medicosCadastrados, setMedicosCadastrados] = useState(0);
  const [especialidadesCount, setEspecialidadesCount] = useState(0);
  const [mediaPorEspecialidade, setMediaPorEspecialidade] = useState([]);
  const [mediasPorMedicos, setMediasPorMedicos] = useState([]); // Novo: médias por médico
  const [dadosDiariosPorEspecialidade, setDadosDiariosPorEspecialidade] = useState([]); // Totais diários por esp com ícones
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
        return { name: v.trim(), crm: plantao.crm || "", medicoObj: medicosIndexByName.get(normalizar(v)) || null };
      if (typeof v === "object") {
        if (v.nome || v.name) return { name: String(v.nome || v.name), crm: v.crm || plantao.crm || "", medicoObj: v };
        if (v.id || v._id) {
          const found = medicosIndexById.get(String(v.id || v._id));
          if (found) return { name: found.nome || found.name || "Desconhecido", crm: found.crm || plantao.crm || "", medicoObj: found };
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
        if (cand.nome || cand.name) return { name: String(cand.nome || cand.name), crm: cand.crm || plantao.crm || "", medicoObj: cand };
        if (cand.id || cand._id) {
          const found = medicosIndexById.get(String(cand.id || cand._id));
          if (found) return { name: found.nome || found.name || "Desconhecido", crm: found.crm || plantao.crm || "", medicoObj: found };
        }
        continue;
      }
      const key = String(cand);
      const byId = medicosIndexById.get(key) || medicosIndexById.get(String(Number(key))) || null;
      if (byId) return { name: byId.nome || byId.name || "Desconhecido", crm: byId.crm || plantao.crm || "", medicoObj: byId };
      const byName = medicosIndexByName.get(normalizar(key));
      if (byName) return { name: byName.nome || byName.name || key, crm: byName.crm || plantao.crm || "", medicoObj: byName };
    }

    return { name: "Medico não encontrado!", crm: plantao.crm || "", medicoObj: null };
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
        const prev = mapaMedicos.get(key) || { nome: nomeMed, quantidade: 0, crm: resolved.crm, medicoObj: resolved.medicoObj || null };
        prev.quantidade += qtd;
        mapaMedicos.set(key, prev);
      }

      // Atualizado: Só nome do médico e quantidade
      const atendHojeArr = Array.from(mapaMedicos.values()).map((m) => ({
        medico: m.nome,
        quantidade: m.quantidade,
      }));
      atendHojeArr.sort((a, b) => b.quantidade - a.quantidade);
      setDadosAtendimentosHoje(atendHojeArr);

      // --- Totais diários por especialidade (com ícones) ---
      const mapaDiarioEsp = new Map();
      for (const p of plantaoHojeFiltrado) {
        let espRaw = p?.especialidade ? String(p.especialidade) : "";
        if (!espRaw) {
          const resolved = resolveMedicoFromPlantao(p, medicosIndexById, medicosIndexByName);
          espRaw = resolved.medicoObj?.especialidade?.nome || resolved.medicoObj?.especialidade || "";
        }
        if (!espRaw) espRaw = "Desconhecida";

        const norm = normalizar(espRaw);
        const quantidade = Number(p.quantidade || p.qtd || p.atendimentos || 0) || 0;

        if (!mapaDiarioEsp.has(norm)) mapaDiarioEsp.set(norm, { nomeOriginal: espRaw, totalDiario: quantidade });
        else mapaDiarioEsp.get(norm).totalDiario += quantidade;
      }

      const diariosEsp = [];
      for (const [norm, { nomeOriginal, totalDiario }] of mapaDiarioEsp.entries()) {
        if (!totalDiario) continue;

        const espInfo = getEspecialidadeInfo(nomeOriginal);

        diariosEsp.push({
          especialidade: (espInfo && espInfo.nome) ? espInfo.nome.toUpperCase() : nomeOriginal.toUpperCase(),
          totalDiario,
          icon: espInfo.icone || FaIcons.FaUserMd,
          color: espInfo.cor || "#666",
        });
      }

      diariosEsp.sort((a, b) => b.totalDiario - a.totalDiario);
      setDadosDiariosPorEspecialidade(diariosEsp);

      // --- Totais do mês e cálculo de médias ---
      const plantaoMes = (plantaoData || []).filter((p) => {
        const d = parseData(p?.data);
        return d && d.getFullYear() === anoAtual && d.getMonth() === mesAtual;
      });
      const diasMes = new Date(anoAtual, mesAtual + 1, 0).getDate() || 1;
      const totalMesCalc = plantaoMes.reduce(
        (acc, p) => acc + (Number(p.quantidade || p.qtd || p.atendimentos || 0) || 0),
        0
      );
      const mediaDiaCalc = Math.round(totalMesCalc / diasMes);
      setTotalMes(totalMesCalc);
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
            .map((m) => normalizar(m?.especialidade?.nome || m?.especialidade || ""))
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
          espRaw = resolved.medicoObj?.especialidade?.nome || resolved.medicoObj?.especialidade || "";
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
          espRaw = resolved.medicoObj?.especialidade?.nome || resolved.medicoObj?.especialidade || "";
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
          mediaDiaria,
          mediaMes,
          icon: espInfo.icone || FaIcons.FaUserMd,
          color: espInfo.cor || "#666",
        });
      }

      mediasEsp.sort((a, b) => (b.mediaDiaria || 0) - (a.mediaDiaria || 0));
      setMediaPorEspecialidade(mediasEsp);

      // --- Médias por médico (novo) ---
      const mapaMesMedicos = new Map();
      const mapaAnoMedicos = new Map();

      for (const p of plantaoMes) {
        const resolved = resolveMedicoFromPlantao(p, medicosIndexById, medicosIndexByName);
        const nomeMed = resolved.name || "Desconhecido";
        const normMed = normalizar(nomeMed);
        const quantidade = Number(p.quantidade || p.qtd || p.atendimentos || 0) || 0;

        if (!mapaMesMedicos.has(normMed)) mapaMesMedicos.set(normMed, { nomeOriginal: nomeMed, total: quantidade });
        else mapaMesMedicos.get(normMed).total += quantidade;
      }

      for (const p of plantaoAno) {
        const resolved = resolveMedicoFromPlantao(p, medicosIndexById, medicosIndexByName);
        const nomeMed = resolved.name || "Desconhecido";
        const normMed = normalizar(nomeMed);
        const quantidade = Number(p.quantidade || p.qtd || p.atendimentos || 0) || 0;

        if (!mapaAnoMedicos.has(normMed)) mapaAnoMedicos.set(normMed, quantidade);
        else mapaAnoMedicos.set(normMed, mapaAnoMedicos.get(normMed) + quantidade);
      }

      const mediasMedicos = [];
      for (const [norm, { nomeOriginal, total }] of mapaMesMedicos.entries()) {
        if (!total) continue;

        const totalMensal = total;
        const mediaDiaria = Math.round(totalMensal / diasMes);
        const totalAnoMedico = mapaAnoMedicos.get(norm) || 0;
        const mediaMes = Math.round(totalAnoMedico / 12);

        mediasMedicos.push({
          medico: nomeOriginal,
          mediaDiaria,
          mediaMes,
        });
      }

      mediasMedicos.sort((a, b) => (b.mediaDiaria || 0) - (a.mediaDiaria || 0));
      setMediasPorMedicos(mediasMedicos);

      setTotalMediaEspecialidades(mediasEsp.reduce((acc, i) => acc + (i.mediaDiaria || 0), 0));
    } catch (err) {
      console.error("Erro em atualizarDados Home:", err);
      setPlantaoHojeRaw([]);
      setDadosAtendimentosHoje([]);
      setAtendimentosHojeTotal(0);
      setTotalMes(0);
      setMediaDia(0);
      setMediaMes(0);
      setTotalAno(0);
      setMedicosCadastrados(0);
      setEspecialidadesCount(0);
      setMediaPorEspecialidade([]);
      setMediasPorMedicos([]);
      setDadosDiariosPorEspecialidade([]);
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
        <CardEspecialidades
          titulo="Total Atendido Hoje (por médico)"
          dados={dadosAtendimentosHoje}
          porMedico={true}
          mostrarMedia={false}
          paginado={true}
        />
        <CardMedias
          titulo="Médias"
          total={totalMes}
          mediaDia={mediaDia}
          mediaMes={mediaMes}
          totalAno={totalAno}
          mediasPorEspecialidade={mediaPorEspecialidade}
          mediasPorMedicos={mediasPorMedicos}
        />


        <div className="card-resumo">
          <h3>Médicos cadastrados</h3>
          <p>{medicosCadastrados}</p>
        </div>
        <div className="card-resumo">
          <h3>Especialidades</h3>
          <p>{especialidadesCount}</p>
        </div>


        <CardEspecialidades
          titulo="Total por Especialidades"
          dados={dadosDiariosPorEspecialidade}
          mostrarMedia={false}
          paginado={true}
        />
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

