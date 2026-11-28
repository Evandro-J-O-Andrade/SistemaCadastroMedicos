// src/core/shell/SidebarNavEnterprise.tsx
// Navegação Enterprise Database-Driven: itens vêm de ui_navigation_items (banco/RLS),
// escopados pelo contexto ativo e filtrados por permissão efetiva.
// Nenhum item concede acesso — rotas protegidas por ProtectedRoute + RLS.
// Estados loading/empty/error honestos; sem catálogo hardcoded, sem mock.
import { NavLink } from 'react-router-dom';
import { Loader2, Inbox } from 'lucide-react';
import { useActiveContext } from '../context/ContextProvider';
import { useNavigation } from './useNavigation';
import { iconFor } from './navIcons';

export interface SidebarNavEnterpriseProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function SidebarNavEnterprise({ collapsed = false, onNavigate }: SidebarNavEnterpriseProps) {
  const { active, contexts, setContext } = useActiveContext();
  const { items, loading, error } = useNavigation();

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

      {/* Itens (Database-Driven) */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-ink-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando navegação…
          </div>
        ) : error ? (
          !collapsed && <p className="px-3 py-2 text-sm text-error">{error}</p>
        ) : items.length === 0 ? (
          !collapsed && (
            <div className="flex flex-col items-center gap-2 px-3 py-6 text-center text-sm text-ink-muted">
              <Inbox className="h-6 w-6" />
              <span>Nenhum módulo disponível para este contexto.</span>
            </div>
          )
        ) : (
          items.map((item) => {
            const Icon = iconFor(item.icon);
            return (
              <NavLink
                key={item.key}
                to={item.rota || '/'}
                end={item.rota === '/'}
                onClick={onNavigate}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center rounded-lg text-sm transition-colors ${
                    collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'
                  } ${
                    isActive ? 'bg-accent text-white' : 'text-ink-secondary hover:bg-surface-2'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })
        )}
      </nav>
    </div>
  );
}