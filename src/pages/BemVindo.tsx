// src/pages/BemVindo.tsx
// Recepção Enterprise (landing page premium) — mini landing personalizada.
// 100% dados reais: identidade/vínculos do bootstrap; cards de módulos Database-Driven
// (ui_navigation_items) filtrados por permissão efetiva. Navega SOMENTE após sucesso confirmado.
// Não é seleção de contexto: a troca de acesso só abre via CTA "Trocar de conta" (EscolhaConta).
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useActiveContext } from '../core/context/ContextProvider';
import { useTheme } from '../core/theme/ThemeProvider';
import { useContextEntry } from '../core/context/useContextEntry';
import { useNavigation } from '../core/shell/useNavigation';
import { iconFor } from '../core/shell/navIcons';
import { decideEntry } from '../services/accessContextService';
import { WelcomeHero } from '../components/welcome/WelcomeHero';
import { WelcomeProfileCard } from '../components/welcome/WelcomeProfileCard';
import { WelcomeModuleCard, type WelcomeModule } from '../components/welcome/WelcomeModuleCard';
import { WelcomeActions } from '../components/welcome/WelcomeActions';
import '../styles/pages/bem-vindo.css';

// Descrição cosmética por célula (apresentação). O catálogo/ordem/permissão vem do banco.
const DESCRICAO: Record<string, string> = {
  medicos: 'Gestão profissional',
  plantoes: 'Escalas e turnos',
  producao: 'Atendimentos',
  relatorios: 'Análises e indicadores',
  'admin-master': 'Visão administrativa',
  usuarios: 'Pessoas e permissões',
};

export default function BemVindo() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { active, contexts } = useActiveContext();
  const { theme, toggleTheme } = useTheme();
  const { enter, busy, error } = useContextEntry();
  const { items: navItems } = useNavigation();

  const nome = user?.nome || user?.full_name || user?.email || 'Usuário';
  const decision = useMemo(() => decideEntry(user, contexts), [user, contexts]);

  const modules = useMemo<WelcomeModule[]>(
    () =>
      navItems
        .filter((it) => it.cell_id)
        .map((it) => ({
          key: it.key,
          title: it.label,
          description: DESCRICAO[it.cell_id ?? ''] ?? '',
          icon: iconFor(it.icon),
        })),
    [navItems],
  );

  const acessar = async () => {
    if (decision.mode === 'auto') {
      const ok = await enter(decision.context); // só navega se o sucesso for confirmado
      if (ok) navigate('/inicio', { replace: true });
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