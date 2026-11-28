// src/pages/Inicio.tsx — Portal de Inteligência Assistencial (tela cheia, sem sidebar).
// Database-Driven: indicadores reais quando a fonte está conectada; "—" quando indisponível.
// Escopo SEMPRE pelo contexto ativo (tenant/unidade). O CTA "Entrar no Painel" usa o
// Dispatcher Master (contexto+papel+permissão), nunca a primeira membership.
import { useEffect, useMemo, useState } from 'react';
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
import { fetchSnapshot } from '../modules/intelligence/analyticsService';
import type { Periodo, SnapshotInteligencia } from '../modules/intelligence/types';

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: '12m', label: '12 meses' },
];

export default function Inicio(): React.ReactElement {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { active, contexts, setContext } = useActiveContext();
  const { theme, toggleTheme } = useTheme();
  const { doSignOut, busy: signingOut, error: signOutError } = useSignOut();

  const [entering, setEntering] = useState(false);
  const [enterError, setEnterError] = useState('');
  const [periodo, setPeriodo] = useState<Periodo>('30d');
  const [unitId, setUnitId] = useState<string | null>(active?.unitIds[0] ?? null);
  const [snapshot, setSnapshot] = useState<SnapshotInteligencia | null>(null);
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const fullName = user?.nome || user?.email || 'Usuário';

  // Unidades disponíveis no contexto ativo (para o filtro).
  const unidades = useMemo(() => active?.unitIds ?? [], [active]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    const ctx = active
      ? { tenantId: active.tenantId, unitIds: active.unitIds, isGlobal: active.isGlobal }
      : { tenantId: null, unitIds: [], isGlobal: false };
    fetchSnapshot(ctx, { periodo, unitId })
      .then((res) => {
        if (cancelled) return;
        setAvailable(res.available);
        setSnapshot(res.snapshot);
        if (res.error) setLoadError(res.error);
      })
      .catch((e) => {
        if (!cancelled) {
          setAvailable(false);
          setLoadError(e instanceof Error ? e.message : 'Falha ao consultar indicadores.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active, periodo, unitId]);

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

  const fmt = (n: number | undefined | null) => (available && typeof n === 'number' ? n.toLocaleString('pt-BR') : '—');

  const stats = [
    { label: 'Médicos ativos', value: fmt(snapshot?.kpis.medicosAtivos), icon: Stethoscope },
    { label: 'Atendimentos', value: fmt(snapshot?.kpis.atendimentos), icon: Activity },
    { label: 'Média por médico', value: fmt(snapshot?.kpis.mediaPorMedico), icon: ClipboardList },
    { label: 'Pendências', value: fmt(snapshot?.kpis.pendencias), icon: CalendarClock },
  ];

  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-slate-950 flex flex-col">
      {/* Header institucional */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 md:px-6 h-16 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-gray-900 dark:text-white truncate">Gestão Médica Alpha</span>
          <span className="hidden sm:inline text-xs text-gray-400 dark:text-slate-500">· Inteligência assistencial</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="p-2 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" aria-label="Alternar tema">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button onClick={() => void doSignOut()} disabled={signingOut} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-60 transition-colors">
            {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {(signOutError || enterError || loadError) && (
        <div role="alert" className="mx-4 md:mx-6 mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {signOutError || enterError || loadError}
        </div>
      )}

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 md:p-10">
          <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">Visão rápida da operação</h1>
              <p className="text-gray-500 dark:text-slate-400 text-base">Olá, {fullName}. Resumo do contexto autorizado.</p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 text-sm text-gray-600 dark:text-slate-300">
                {active?.isGlobal ? <Shield className="w-4 h-4 text-purple-600" /> : <Building2 className="w-4 h-4 text-blue-600" />}
                <span className="truncate max-w-[60vw]">{active?.label ?? 'Selecionar contexto'}</span>
              </div>
            </div>

            {/* Filtros: período + unidade autorizada */}
            <div className="flex flex-wrap items-center gap-2">
              {contexts.length > 1 && (
                <select
                  value={active?.key ?? ''}
                  onChange={(e) => {
                    const ctx = contexts.find((c) => c.key === e.target.value);
                    if (ctx) setContext(ctx);
                  }}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  aria-label="Contexto"
                >
                  {contexts.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              )}
              {unidades.length > 1 && (
                <select value={unitId ?? ''} onChange={(e) => setUnitId(e.target.value || null)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" aria-label="Unidade">
                  <option value="">Todas as unidades</option>
                  {unidades.map((u) => <option key={u} value={u}>{u.slice(0, 8)}</option>)}
                </select>
              )}
              <select value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" aria-label="Período">
                {PERIODOS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          {/* Cards de indicadores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">{s.label}</span>
                    <Icon className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                  </div>
                  {loading ? (
                    <div className="h-9 flex items-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
                  ) : (
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Evolução + Especialidade */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Evolução da produção</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">Período autorizado · dados reais.</p>
              <div className="h-40 flex items-center justify-center rounded-lg border border-dashed border-gray-200 dark:border-slate-700 text-sm text-gray-400 dark:text-slate-500">
                {loading ? 'Carregando...' : available && snapshot && snapshot.evolucao.length > 0 ? `${snapshot.evolucao.length} dia(s) com produção` : 'Sem dados no período/contexto.'}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Produção por especialidade</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">Comparativo no período selecionado.</p>
              <div className="space-y-2">
                {loading ? (
                  <p className="text-sm text-gray-400">Carregando...</p>
                ) : available && snapshot && snapshot.porEspecialidade.length > 0 ? (
                  snapshot.porEspecialidade.slice(0, 6).map((e) => (
                    <div key={e.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 dark:text-slate-200 truncate">{e.label}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{e.quantidade.toLocaleString('pt-BR')}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 dark:text-slate-500">Aguardando consulta real.</p>
                )}
              </div>
            </div>
          </div>

          {/* CTA principal */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button onClick={entrarNoPainel} disabled={entering} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium transition-colors">
              <LayoutDashboard className="w-4 h-4" />
              {entering ? 'Acessando...' : 'Entrar no meu painel'}
              {entering ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            </button>
            <span className="text-xs text-gray-400 dark:text-slate-500">O painel respeita seu perfil, contexto e permissões efetivas.</span>
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