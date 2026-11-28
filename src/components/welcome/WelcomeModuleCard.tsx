// src/components/welcome/WelcomeModuleCard.tsx
// Card de módulo (recurso) — filtrado por permissão real; sem indicadores inventados.
import type { LucideIcon } from 'lucide-react';

export interface WelcomeModule {
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Permissão efetiva (recurso.acao) ou papel que libera o módulo. */
  permission?: string;
  roles?: string[];
}

export function WelcomeModuleCard({ module }: { module: WelcomeModule }) {
  const Icon = module.icon;
  return (
    <article className="welcome-module">
      <span className="welcome-module-icon"><Icon aria-hidden /></span>
      <h3 className="welcome-module-title">{module.title}</h3>
      <p className="welcome-module-desc">{module.description}</p>
    </article>
  );
}