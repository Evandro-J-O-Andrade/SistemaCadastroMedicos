// src/components/welcome/WelcomeProfileCard.tsx
// Card de perfil — identidade e vínculos REAIS do usuário autenticado (Auth + CORE).
// Não exibe tenants/unidades fictícios: usa o contexto ativo autorizado (ou "Conta ativa").
import { UserRound, Building2, ShieldCheck } from 'lucide-react';
import type { AuthUser } from '../../auth/types';
import type { ResolvedContext } from '../../core/context/contextResolver';

function roleLabel(roles: string[]): string {
  if (roles.includes('root')) return 'Root / Admin Master';
  if (roles.includes('admin')) return 'Administrador';
  if (roles.includes('gestor')) return 'Gestor';
  if (roles.includes('suporte')) return 'Suporte';
  if (roles.includes('auditor')) return 'Auditor';
  if (roles.includes('operador_ti') || roles.includes('operacional')) return 'Operacional';
  return roles[0] ?? 'Usuário';
}

export function WelcomeProfileCard({
  user,
  active,
}: {
  user: AuthUser | null;
  active: ResolvedContext | null;
}) {
  const nome = user?.nome || user?.full_name || user?.email || 'Usuário';
  const funcao = roleLabel(user?.roles ?? []);
  const ambiente = active?.label ?? 'Conta ativa';

  return (
    <section className="welcome-card welcome-profile">
      <header className="welcome-card-head">
        <span className="welcome-avatar" aria-hidden>
          {nome.slice(0, 1).toUpperCase()}
        </span>
        <div>
          <p className="welcome-card-title">Seu perfil profissional</p>
          <p className="welcome-card-sub">Identidade e função carregadas do sistema</p>
        </div>
      </header>
      <dl className="welcome-profile-grid">
        <div>
          <dt><UserRound aria-hidden /> Usuário</dt>
          <dd className="truncate">{nome}</dd>
        </div>
        <div>
          <dt><ShieldCheck aria-hidden /> Função</dt>
          <dd>{funcao}</dd>
        </div>
        <div>
          <dt><Building2 aria-hidden /> Ambiente</dt>
          <dd className="truncate">{ambiente}</dd>
        </div>
      </dl>
    </section>
  );
}