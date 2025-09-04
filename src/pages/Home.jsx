import React from "react";
import "./Home.css"; // CSS centralizado, você pode ajustar conforme o global
import LogoAlpha from "../img/Logo_Alpha.png";

const LOGO_URL = LogoAlpha;

export default function Home() {
  const novidades = [
    { id: 1, titulo: "Sistema atualizado", descricao: "Nova versão com melhorias no painel de relatórios." },
    { id: 2, titulo: "Treinamento disponível", descricao: "Treinamento online para novos funcionários." },
    { id: 3, titulo: "Suporte técnico", descricao: "Suporte disponível de 8h às 18h." },
  ];

  const resumo = [
    { id: 1, titulo: "Atendimentos hoje", valor: 120 },
    { id: 2, titulo: "Média mensal", valor: 3450 },
    { id: 3, titulo: "Médicos cadastrados", valor: 18 },
    { id: 4, titulo: "Especialidades", valor: 7 },
  ];

  return (
    <div className="home-container">
      {/* BANNER DE BOAS-VINDAS */}
      <section className="banner">
        <img src={LOGO_URL} alt="Logo da empresa" className="logo-home"/>
        <h1>Bem-vindo ao Sistema de Gestão</h1>
        <p>Controle completo de atendimentos, relatórios e histórico do seu time.</p>
      </section>

      {/* RESUMO DO SISTEMA */}
      <section className="resumo-sistema">
        {resumo.map((item) => (
          <div key={item.id} className="card-resumo">
            <h3>{item.titulo}</h3>
            <p>{item.valor}</p>
          </div>
        ))}
      </section>

      {/* NOVIDADES */}
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

      {/* LOGIN RÁPIDO */}
      <section className="acesso-rapido">
        <h2>Acesso rápido</h2>
        <button className="btn-login">Entrar no Sistema</button>
      </section>
    </div>
  );
}
