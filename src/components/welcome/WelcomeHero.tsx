// src/components/welcome/WelcomeHero.tsx
// Hero da recepção Enterprise. Sem dados fictícios; apenas identidade e mensagem.
import { ShieldCheck } from 'lucide-react';

export function WelcomeHero({ nome }: { nome: string }) {
  return (
    <section className="welcome-hero">
      <p className="welcome-eyebrow">Seu espaço de gestão</p>
      <h1 className="welcome-title">Bem-vindo à sua Gestão Médica.</h1>
      <p className="welcome-subtitle">
        Sua central de gestão de profissionais, plantões, produtividade e inteligência operacional.
      </p>
      <p className="welcome-greeting">Olá, {nome}.</p>
      <span className="welcome-trust">
        <ShieldCheck aria-hidden /> Ambiente seguro e personalizado
      </span>
    </section>
  );
}