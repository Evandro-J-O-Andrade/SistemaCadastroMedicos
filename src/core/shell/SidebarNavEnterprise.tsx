// src/core/shell/SidebarNavEnterprise.tsx
// Navegação Enterprise: itens por papel/permissão, escopados pelo contexto ativo.
// Nenhum item concede acesso — rotas protegidas por ProtectedRoute + RLS.
// Reaproveita a lógica canSee do SidebarNav legado, com apresentação nova.
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

export interface SidebarNavEnterpriseProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function SidebarNavEnterprise({ collapsed = false, onNavigate }: SidebarNavEnterpriseProps) {
  const { user } = useAuth();
  const { active, contexts, setContext } = useActiveContext();
  const roles = user?.roles ?? [];
  const permissions = user?.permissions ?? [];
  const items = NAV.filter((i) => canSee(i, roles, permissions));

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Seletor de contexto */}
      {!collapsed && (
        <div className="rounded-xl border border-border bg-surface-2 p-2">
          <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            Contexto ativo
          </p>
          {contexts.length > 1 ? (
            <select
              value={active?.key ?? ''}
              onChange={(e) => {
                const ctx = contexts.find((c) => c.key === e.target.value);
                if (ctx) setContext(ctx);
              }}
              className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              aria-label="Selecionar contexto"
            >
              {!active && <option value="">Selecionar…</option>}
              {contexts.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          ) : (
            <p className="truncate px-2 py-1 text-sm text-ink-secondary">{active?.label ?? '—'}</p>
          )}
        </div>
      )}

      {/* Itens */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center rounded-lg text-sm transition-colors ${
                  collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'
                } ${
                  isActive
                    ? 'bg-accent text-white'
                    : 'text-ink-secondary hover:bg-surface-2'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
        {items.length === 0 && !collapsed && (
          <p className="px-3 py-2 text-sm text-ink-muted">Nenhum módulo autorizado.</p>
        )}
      </nav>
    </div>
  );
}