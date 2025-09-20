import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css"; 
import LogoAlpha from "../img/Logo_Alpha.png";

export default function Home() {
  const navigate = useNavigate(); // Hook para navegar entre páginas
  const [usuarioLogado, setUsuarioLogado] = useState(false); // Estado para saber se o usuário está logado

  // Estados para dados dinâmicos do dashboard
  const [atendimentosHoje, setAtendimentosHoje] = useState(0); 
  const [mediaMensal, setMediaMensal] = useState(0);           
  const [medicosCadastrados, setMedicosCadastrados] = useState(0); 
    const [especialidades, setEspecialidades] = useState(0);       

  // Novidades do sistema
  const novidades = [
    { id: 1, titulo: "Sistema atualizado", descricao: "Nova versão com melhorias no painel de relatórios." },
    { id: 2, titulo: "Treinamento disponível", descricao: "Treinamento online para novos funcionários." },
    { id: 3, titulo: "Suporte técnico", descricao: "Suporte disponível de 8h às 18h." },
  ];

  // Função que atualiza os dados do dashboard
  const atualizarDados = () => {
    // Verifica se o usuário está logado
    const logado = localStorage.getItem("usuarioLogado") === "true";
    setUsuarioLogado(logado);

    // Recupera os dados de plantões e médicos
    const plantaoData = JSON.parse(localStorage.getItem("plantaoData") || "[]");
    const medicosData = JSON.parse(localStorage.getItem("medicosData") || "[]");

    // Data de hoje formatada como dd/mm/aaaa
    const hoje = new Date();
    const diaHoje = `${hoje.getDate().toString().padStart(2, "0")}/${(hoje.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${hoje.getFullYear()}`;

    // Calcula atendimentos de hoje
    const atendHoje = plantaoData
      .filter((p) => p.data === diaHoje) // Filtra plantões do dia de hoje
      .reduce((acc, p) => acc + Number(p.quantidade), 0); // Soma a quantidade de atendimentos
    setAtendimentosHoje(atendHoje);

    // Cálculo da média mensal
    const diaAtual = hoje.getDate();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();

    // Soma atendimentos do mês filtrando plantões do mês e ano atual
    const atendMes = plantaoData
      .filter((p) => {
        const [dia, mes, ano] = p.data.split("/"); // Quebra a data em dia/mes/ano
        return Number(dia) === diaAtual && Number(mes) === mesAtual && Number(ano) === anoAtual;
      })
      .reduce((acc, p) => acc + Number(p.quantidade), 0);

    // Calcula total de dias do mês
    const diasMes = new Date(anoAtual, mesAtual, 0).getDate();
    setMediaMensal(Math.round(atendMes / diasMes)); // Calcula média diária do mês

    // Atualiza quantidade de médicos cadastrados
    setMedicosCadastrados(medicosData.length);

    // Calcula quantidade de especialidades únicas
    const espUnicas = [...new Set(medicosData.map((m) => m.especialidade))];
    setEspecialidades(espUnicas.length);
  };

  // Atualiza sempre que o localStorage mudar
  useEffect(() => {
    const handleStorageChange = () => atualizarDados();
    window.addEventListener("storage", handleStorageChange); // Listener para mudanças no localStorage
    atualizarDados(); // Atualiza dados ao montar a Home
    return () => window.removeEventListener("storage", handleStorageChange); // Remove listener ao desmontar
  }, []);

  // Função que define o comportamento ao clicar no botão "Entrar"
  const handleEntrar = () => {
    if (!usuarioLogado) {
      alert("Você precisa fazer login para acessar o sistema.");
      navigate("/login");
    } else {
      const tipoUsuario = localStorage.getItem("tipoUsuario"); // Verifica tipo do usuário
      if (tipoUsuario === "admin") navigate("/home");       // Admin vai para Home
      else if (tipoUsuario === "suporte") navigate("/home"); // Suporte vai para Plantão
      else if (tipoUsuario === "comum") navigate("/home");//Usuario Comum vai para relatorios se não ja cai na pagina
      else navigate("/relatorios");                          // Usuário comum vai para Relatórios
    }
  };

  // Array resumo de métricas exibidas no dashboard
  const resumo = [
    { id: 1, titulo: "Atendimentos hoje", valor: atendimentosHoje },
    { id: 2, titulo: "Média mensal", valor: mediaMensal },
    { id: 3, titulo: "Médicos cadastrados", valor: medicosCadastrados },
    { id: 4, titulo: "Especialidades", valor: especialidades },
  ];

  return (
    <div className="home-container">
      <section className="banner">
        <img src={LogoAlpha} alt="Logo da empresa" className="logo-home" />
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
        <button className="btn-login" onClick={handleEntrar}>
          Entrar no Sistema
        </button>
      </section>
    </div>
  );
}
