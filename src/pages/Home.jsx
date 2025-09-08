import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css"; 
import LogoAlpha from "../img/Logo_Alpha.png";

export default function Home() {
  const navigate = useNavigate();
  const [usuarioLogado, setUsuarioLogado] = useState(false);

  // Dados dinâmicos
  const [atendimentosHoje, setAtendimentosHoje] = useState(0);
  const [mediaMensal, setMediaMensal] = useState(0);
  const [medicosCadastrados, setMedicosCadastrados] = useState(0);
  const [especialidades, setEspecialidades] = useState(0);

  const novidades = [
    { id: 1, titulo: "Sistema atualizado", descricao: "Nova versão com melhorias no painel de relatórios." },
    { id: 2, titulo: "Treinamento disponível", descricao: "Treinamento online para novos funcionários." },
    { id: 3, titulo: "Suporte técnico", descricao: "Suporte disponível de 8h às 18h." },
  ];

  const atualizarDados = () => {
    // Login
    const logado = localStorage.getItem("usuarioLogado") === "true";
    setUsuarioLogado(logado);

    // Plantão
    const plantaoData = JSON.parse(localStorage.getItem("plantaoData") || "[]");
    const medicosData = JSON.parse(localStorage.getItem("medicosData") || "[]");

    const hoje = new Date();
    const diaHoje = `${hoje.getDate().toString().padStart(2,"0")}/${(hoje.getMonth()+1).toString().padStart(2,"0")}/${hoje.getFullYear()}`;

    // Atendimentos hoje
    const atendHoje = plantaoData.filter(p => p.data === diaHoje).reduce((acc,p)=> acc + Number(p.quantidade),0);
    setAtendimentosHoje(atendHoje);

    // Média mensal
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    const atendMes = plantaoData
      .filter(p => {
        const [dia, mes, ano] = p.data.split("/");
        return Number(mes) === mesAtual && Number(ano) === anoAtual;
      })
      .reduce((acc, p) => acc + Number(p.quantidade),0);

    const diasMes = new Date(anoAtual, mesAtual, 0).getDate();
    setMediaMensal(Math.round(atendMes / diasMes));

    // Médicos cadastrados
    setMedicosCadastrados(medicosData.length);

    // Especialidades únicas
    const espUnicas = [...new Set(medicosData.map(m => m.especialidade))];
    setEspecialidades(espUnicas.length);
  };

  // Atualiza sempre que o localStorage mudar
  useEffect(() => {
    const handleStorageChange = () => atualizarDados();

    // Listener para mudanças em localStorage
    window.addEventListener("storage", handleStorageChange);
    atualizarDados(); // Atualiza ao montar a Home

    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleEntrar = () => {
    if (!usuarioLogado) {
      alert("Você precisa fazer login para acessar o sistema.");
      navigate("/login");
    } else {
      navigate("/plantao");
    }
  };

  const resumo = [
    { id: 1, titulo: "Atendimentos hoje", valor: atendimentosHoje },
    { id: 2, titulo: "Média mensal", valor: mediaMensal },
    { id: 3, titulo: "Médicos cadastrados", valor: medicosCadastrados },
    { id: 4, titulo: "Especialidades", valor: especialidades },
  ];

  return (
    <div className="home-container">
      <section className="banner">
        <img src={LogoAlpha} alt="Logo da empresa" className="logo-home"/>
        <h1>Bem-vindo ao Sistema de Gestão Médica</h1>
        <p>Controle completo de atendimentos, relatórios e histórico do seu time.</p>
      </section>

      <section className="resumo-sistema">
        {resumo.map((item) => (
          <div key={item.id} className="card-resumo">
            <h3>{item.titulo}</h3>
            <p>{item.valor}</p>
          </div>
        ))}
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
        <button className="btn-login" onClick={handleEntrar}>Entrar no Sistema</button>
      </section>
    </div>
  );
}
