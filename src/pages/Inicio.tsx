// src/pages/Inicio.tsx — Portal de entrada da sessão (tela cheia, sem sidebar operacional).
// Database-Driven: indicadores reais quando houver fonte autorizada; caso contrário
// exibe "—" (sem valores fictícios). O CTA "Entrar no Painel" resolve o destino pelo
// contexto ativo + papéis/permissões (Dispatcher Master), nunca por membership automática.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut, Sun, Moon, ArrowRight, Building2, Shield,
  Stethoscope, CalendarClock, ClipboardList, Activity, Loader2, LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useActiveContext } from '../core/context/ContextProvider';
import { useTheme } from '../core/theme/ThemeProvider';
import { useSignOut } from '../auth/hooks/useSignOut';
import { resolverDestino } from '../auth/services/dispatcherService';

interface QuickStat {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function Inicio(): React.ReactElement {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { active } = useActiveContext();
  const { theme, toggleTheme } = useTheme();
  const { doSignOut, busy: signingOut, error: signOutError } = useSignOut();
  const [entering, setEntering] = useState(false);
  const [enterError, setEnterError] = useState('');

  const fullName = user?.nome || user?.email || 'Usuário';

  // Indicadores: sem fonte de dados autorizada conectada → "—" (não fictício).
  const stats: QuickStat[] = useMemo(
    () => [
      { label: 'Produção do período', value: '—', icon: Activity },
      { label: 'Médicos escalados', value: '—', icon: Stethoscope },
      { label: 'Plantões em andamento', value: '—', icon: CalendarClock },
      { label: 'Pendências de conferência', value: '—', icon: ClipboardList },
    ],
    [],
  );

  const entrarNoPainel = () => {
    if (entering) return;
    setEntering(true);
    setEnterError('');
    try {
      if (!user) throw new Error('Sessão não encontrada.');
      const dest = resolverDestino(user);
      if (!dest.destino?.disponivel) {
        throw new Error(dest.motivoBloqueio || 'Nenhum dashboard autorizado para o seu perfil.');
      }
      navigate(dest.destino.path);
    } catch (cause) {
      setEnterError(cause instanceof Error ? cause.message : 'Falha ao acessar o painel.');
      setEntering(false);
    }
  };

  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-slate-950 flex flex-col">
      {/* Header institucional */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 md:px-6 h-16 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-gray-900 dark:text-white truncate">Gestão Médica Alpha</span>
          <span className="hidden sm:inline text-xs text-gray-400 dark:text-slate-500">· Inteligência médica</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Alternar tema"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => void doSignOut()}
            disabled={signingOut}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-60 transition-colors"
          >
            {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {(signOutError || enterError) && (
        <div role="alert" className="mx-4 md:mx-6 mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {signOutError || enterError}
        </div>
      )}

      {/* Corpo */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 md:p-10">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Visão rápida da operação
            </h1>
            <p className="text-gray-500 dark:text-slate-400 text-base">
              Olá, {fullName}. Resumo do contexto autorizado antes de acessar seu ambiente de trabalho.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 text-sm text-gray-600 dark:text-slate-300">
              {active?.isGlobal ? <Shield className="w-4 h-4 text-purple-600" /> : <Building2 className="w-4 h-4 text-blue-600" />}
              <span className="truncate max-w-[60vw]">{active?.label ?? 'Selecionar contexto'}</span>
            </div>
          </div>

          {/* Cards de indicadores reais (ou — quando sem fonte) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">{s.label}</span>
                    <Icon className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                </div>
              );
            })}
          </div>

          {/* Evolução (placeholder sem dados fictícios) */}
          <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Evolução da produtividade</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">Período autorizado · dados reais quando a fonte estiver conectada.</p>
            <div className="h-40 flex items-center justify-center rounded-lg border border-dashed border-gray-200 dark:border-slate-700 text-sm text-gray-400 dark:text-slate-500">
              Sem fonte de dados conectada ao contexto atual.
            </div>
          </div>

          {/* CTA principal */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={entrarNoPainel}
              disabled={entering}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              {entering ? 'Acessando...' : 'Entrar no Painel'}
              {entering ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            </button>
            <span className="text-xs text-gray-400 dark:text-slate-500">
              O painel respeita seu perfil, contexto e permissões efetivas.
            </span>
          </div>
        </div>
      </main>

      <footer className="h-10 flex-shrink-0 flex items-center justify-between px-4 md:px-6 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-gray-500 dark:text-slate-500">
        <span>Gestão Médica Alpha © {new Date().getFullYear()}</span>
        <span>Tecnologia por New Wave Sistemas Digital</span>
      </footer>
    </div>
  );
}