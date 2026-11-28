// src/core/shell/SidebarNav.tsx
// Sidebar dinâmica: itens definidos por papel/permissão, escopados pelo contexto ativo.
// Nenhum item concede acesso — a rota real é protegida por ProtectedRoute + RLS.
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Building2, FileText, Home, BarChart3, SlidersHorizontal,
  Stethoscope, CalendarClock, Users, UserPlus,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useActiveContext } from '../context/ContextProvider';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
  permission?: string;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Início', icon: Home, end: true },
  { to: '/dashboard/admin-master', label: 'Admin Master', icon: LayoutDashboard, roles: ['root', 'admin'] },
  { to: '/admin/tenants', label: 'Tenants', icon: Building2, roles: ['root', 'admin'] },
  { to: '/admin/documentos-legais', label: 'Documentos Legais', icon: FileText, roles: ['root', 'admin'] },
  { to: '/medicos', label: 'Médicos', icon: Stethoscope, roles: ['root', 'admin', 'suporte'] },
  { to: '/plantao', label: 'Plantões', icon: CalendarClock, roles: ['root', 'admin', 'suporte'] },
  { to: '/cadastro-lote', label: 'Cadastro em Lote', icon: Users, roles: ['root', 'admin', 'suporte'] },
  { to: '/cadastro-usuarios', label: 'Usuários', icon: UserPlus, roles: ['root', 'admin'] },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/filtros', label: 'Filtros', icon: SlidersHorizontal },
];

function canSee(item: NavItem, roles: string[], permissions: string[]): boolean {
  if (item.roles && !item.roles.some((r) => roles.includes(r))) return false;
  if (item.permission) {
    const [rec, acao] = item.permission.split('.');
    const ok = permissions.includes(item.permission) || permissions.includes(`${rec}.*`) || permissions.includes('*.*');
    if (!ok && acao) return false;
  }
  return true;
}

export function SidebarNav() {
  const { user } = useAuth();
  const { active, contexts, setContext } = useActiveContext();
  const roles = user?.roles ?? [];
  const permissions = user?.permissions ?? [];
  const items = NAV.filter((i) => canSee(i, roles, permissions));

  return (
    <div className="flex flex-col gap-4">
      {/* Seletor de contexto */}
      <div className="rounded-xl border border-gray-200 dark:border-slate-700 p-2">
        <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Contexto ativo</p>
        {contexts.length > 1 ? (
          <select
            value={active?.key ?? ''}
            onChange={(e) => {
              const ctx = contexts.find((c) => c.key === e.target.value);
              if (ctx) setContext(ctx);
            }}
            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
            aria-label="Selecionar contexto"
          >
            {!active && <option value="">Selecionar…</option>}
            {contexts.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        ) : (
          <p className="px-2 py-1 text-sm text-gray-600 dark:text-slate-300">{active?.label ?? '—'}</p>
        )}
      </div>

      {/* Itens de navegação */}
      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
        {items.length === 0 && (
          <p className="px-3 py-2 text-sm text-gray-500 dark:text-slate-400">Nenhum módulo autorizado.</p>
        )}
      </nav>
    </div>
  );
}