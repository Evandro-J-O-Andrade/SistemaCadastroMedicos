// src/pages/BemVindo.tsx
// Recepção Enterprise (landing page premium) — mini landing personalizada.
// 100% dados reais: identidade/vínculos do bootstrap; módulos filtrados por permissão efetiva.
// Não é seleção de contexto: a troca de acesso só abre via CTA "Trocar de conta" (EscolhaConta).
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Stethoscope, CalendarClock, Activity, BarChart3 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useActiveContext } from '../core/context/ContextProvider';
import { useTheme } from '../core/theme/ThemeProvider';
import { useContextEntry } from '../core/context/useContextEntry';
import { decideEntry } from '../services/accessContextService';
import { WelcomeHero } from '../components/welcome/WelcomeHero';
import { WelcomeProfileCard } from '../components/welcome/WelcomeProfileCard';
import { WelcomeModuleCard, type WelcomeModule } from '../components/welcome/WelcomeModuleCard';
import { WelcomeActions } from '../components/welcome/WelcomeActions';
import '../styles/pages/bem-vindo.css';

const MODULES: WelcomeModule[] = [
  { key: 'medicos', title: 'Médicos', description: 'Gestão profissional', icon: Stethoscope, permission: 'medicos.read', roles: ['root', 'admin', 'suporte'] },
  { key: 'plantoes', title: 'Plantões', description: 'Escalas e turnos', icon: CalendarClock, permission: 'plantoes.read', roles: ['root', 'admin', 'suporte'] },
  { key: 'producao', title: 'Produção', description: 'Atendimentos', icon: Activity, permission: 'producao.read' },
  { key: 'relatorios', title: 'Relatórios', description: 'Análises e indicadores', icon: BarChart3, permission: 'relatorios.read' },
];

function canSeeModule(mod: WelcomeModule, roles: string[], permissions: string[]): boolean {
  if (mod.roles && !mod.roles.some((r) => roles.includes(r))) return false;
  if (mod.permission) {
    const [rec, acao] = mod.permission.split('.');
    return permissions.includes(mod.permission) || permissions.includes(`${rec}.*`) || permissions.includes('*.*') || !acao;
  }
  return true;
}

export default function BemVindo() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { active, contexts } = useActiveContext();
  const { theme, toggleTheme } = useTheme();
  const { enter, busy, error } = useContextEntry();

  const nome = user?.nome || user?.full_name || user?.email || 'Usuário';
  const decision = useMemo(() => decideEntry(user, contexts), [user, contexts]);
  const modules = useMemo(
    () => MODULES.filter((m) => canSeeModule(m, user?.roles ?? [], user?.permissions ?? [])),
    [user],
  );

  const acessar = async () => {
    if (decision.mode === 'auto') {
      await enter(decision.context);
      navigate('/inicio', { replace: true });
      return;
    }
    if (decision.mode === 'select-context' || decision.mode === 'select-unit') {
      navigate('/escolha-conta', { replace: true });
    }
  };

  return (
    <div className="welcome-page">
      <header className="welcome-header">
        <div className="welcome-brand">
          <span className="welcome-brand-logo">GM</span>
          <div>
            <p className="welcome-brand-name">Gestão Médica</p>
            <p className="welcome-brand-tag">Enterprise Platform</p>
          </div>
        </div>
        <div className="welcome-header-right">
          <button className="welcome-icon-btn" onClick={toggleTheme} aria-label="Alternar tema">
            {theme === 'dark' ? <Sun /> : <Moon />}
          </button>
        </div>
      </header>

      <main className="welcome-main">
        <WelcomeHero nome={nome} />

        {error && <p role="alert" className="welcome-alert">{error}</p>}
        {decision.mode === 'none' && (
          <p className="welcome-alert welcome-alert-warn">
            Nenhum ambiente autorizado foi localizado para o seu perfil. Procure o administrador.
          </p>
        )}

        <WelcomeActions
          onAcessar={() => void acessar()}
          onTrocarConta={() => navigate('/escolha-conta', { replace: true })}
          busy={busy}
          disabled={decision.mode === 'none'}
        />

        <div className="welcome-grid">
          <WelcomeProfileCard user={user} active={active} />
        </div>

        {modules.length > 0 && (
          <>
            <p className="welcome-section-label">Sua plataforma, suas possibilidades</p>
            <div className="welcome-modules">
              {modules.map((m) => <WelcomeModuleCard key={m.key} module={m} />)}
            </div>
          </>
        )}
      </main>

      <footer className="welcome-footer">
        Gestão Médica · Plataforma SaaS Enterprise
      </footer>
    </div>
  );
}