// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import LogoAlpha from "../img/Logo_Alpha.png";
import * as espModule from "../api/especialidades"; // importa especialidades

// função de normalização (uppercase + remove acentos)
const normalizar = (str) =>
  str
    ? String(str).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    : "";

export default function Home() {
  const navigate = useNavigate();
  const [usuarioLogado, setUsuarioLogado] = useState(false);

  const [atendimentosHoje, setAtendimentosHoje] = useState(0);
  const [mediaMensal, setMediaMensal] = useState(0);
  const [medicosCadastrados, setMedicosCadastrados] = useState(0);
  const [especialidades, setEspecialidades] = useState(0);
  const [mediaPorEspecialidade, setMediaPorEspecialidade] = useState([]);
  const [totalMediaEspecialidades, setTotalMediaEspecialidades] = useState(0);
  const [expandirEspecialidades, setExpandirEspecialidades] = useState(false);

  // tenta pegar a lista exportada de várias formas
  const listaEspecialidades =
    espModule.listaEspecialidades ||
    espModule.especialidades ||
    espModule.default ||
    [];

  const novidades = [
    { id: 1, titulo: "Sistema atualizado", descricao: "Nova versão com melhorias no painel de relatórios." },
    { id: 2, titulo: "Treinamento disponível", descricao: "Treinamento online para novos funcionários." },
    { id: 3, titulo: "Suporte técnico", descricao: "Suporte disponível de 8h às 18h." },
  ];

  const atualizarDados = () => {
    try {
      const logado = localStorage.getItem("usuarioLogado") === "true";
      setUsuarioLogado(logado);

      const plantaoData = JSON.parse(localStorage.getItem("plantaoData") || "[]");
      const medicosData = JSON.parse(localStorage.getItem("medicos") || "[]");

      const hoje = new Date();
      const diaHoje = hoje.toISOString().split("T")[0]; // YYYY-MM-DD

      // Atendimentos hoje
      const atendHoje = plantaoData
        .filter((p) => p && String(p.data) === diaHoje)
        .reduce((acc, p) => acc + (Number(p.quantidade) || 0), 0);
      setAtendimentosHoje(atendHoje);

      // Média mensal
      const mesAtual = hoje.getMonth() + 1;
      const anoAtual = hoje.getFullYear();

      const plantaoMes = plantaoData.filter((p) => {
        if (!p?.data) return false;
        const [ano, mes] = p.data.split("-");
        return Number(ano) === anoAtual && Number(mes) === mesAtual;
      });

      const diasMes = new Date(anoAtual, mesAtual, 0).getDate() || 1;
      const totalMes = plantaoMes.reduce((acc, p) => acc + (Number(p.quantidade) || 0), 0);
      setMediaMensal(Math.round(totalMes / diasMes));

      // Médicos cadastrados
      setMedicosCadastrados(medicosData.length || 0);

      // Quantidade de especialidades distintas cadastradas (base médicos)
      const espUnicasMedicos = [...new Set(medicosData.map((m) => m?.especialidade).filter(Boolean))];
      setEspecialidades(espUnicasMedicos.length);

      // Agrupa plantões por especialidade
      const mapa = new Map();
      for (const p of plantaoMes) {
        const nome = p?.especialidade ? String(p.especialidade) : "";
        const norm = normalizar(nome);
        if (!norm) continue;
        const quantidade = Number(p.quantidade) || 0;
        if (!mapa.has(norm)) {
          mapa.set(norm, { nomeOriginal: nome, total: quantidade });
        } else {
          mapa.get(norm).total += quantidade;
        }
      }

      // Cria array de médias por especialidade
      const mediasEsp = [];
      for (const [norm, { nomeOriginal, total }] of mapa.entries()) {
        if (total <= 0) continue;

        // tenta achar na lista oficial
        const espData = listaEspecialidades.find((e) => normalizar(e.nome) === norm);

        mediasEsp.push({
          especialidade: (espData?.nome || nomeOriginal).toUpperCase(),
          icon: espData?.icone || "fas fa-stethoscope", // <- corrigido para "icone"
          color: espData?.cor || espData?.color || "#607d8b",
          mediaDiaria: Math.round(total / diasMes),
        });
      }

      setMediaPorEspecialidade(mediasEsp);

      const total = mediasEsp.reduce((acc, item) => acc + (item.mediaDiaria || 0), 0);
      setTotalMediaEspecialidades(total);
    } catch (err) {
      console.error("Erro em atualizarDados Home:", err);
      setAtendimentosHoje(0);
      setMediaMensal(0);
      setMedicosCadastrados(0);
      setEspecialidades(0);
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
        <div className="card-resumo">
          <h3>Atendimentos hoje</h3>
          <p>{atendimentosHoje}</p>
        </div>

        <div className="card-resumo">
          <h3>Média mensal (dia)</h3>
          <p>{mediaMensal}</p>
        </div>

        <div className="card-resumo">
          <h3>Médicos cadastrados</h3>
          <p>{medicosCadastrados}</p>
        </div>

        <div className="card-resumo">
          <h3>Especialidades</h3>
          <p>{especialidades}</p>
        </div>

        {mediaPorEspecialidade.length > 0 && (
          <div
            className={`card-resumo ${expandirEspecialidades ? "expandido" : ""}`}
            onClick={() => setExpandirEspecialidades((s) => !s)}
            style={{ cursor: "pointer" }}
          >
            <h3>Média por Especialidades</h3>

            {!expandirEspecialidades ? (
              <p><strong>Total:</strong> {totalMediaEspecialidades}</p>
            ) : (
              <div className="lista-especialidades">
                <p><strong>Total:</strong> {totalMediaEspecialidades}</p>
                {mediaPorEspecialidade.map((item) => (
                  <div key={item.especialidade} className="item-especialidade">
                    <i className={item.icon} style={{ color: item.color, marginRight: 8 }} />
                    <strong>{item.especialidade}</strong>
                    <span style={{ marginLeft: 8 }}>{item.mediaDiaria} atendimentos/dia</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
