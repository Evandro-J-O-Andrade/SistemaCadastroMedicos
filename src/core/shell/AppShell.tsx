// src/core/shell/AppShell.tsx
// AppShell Enterprise — header contextual + breadcrumbs + sidebar recolhível + drawer mobile.
// Tema dark/light (ThemeProvider) e logout real (useSignOut). Sem emojis; ícones Lucide.
import React, { useState, useEffect } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { useAuth } from '../../hooks/useAuth';
import { useSignOut } from '../../auth/hooks/useSignOut';
import { Sun, Moon, Menu, X, ChevronLeft, ChevronRight, LogOut, Loader2 } from 'lucide-react';
import { Breadcrumbs } from './Breadcrumbs';

interface SidebarRenderState {
  collapsed: boolean;
  onNavigate?: () => void;
}

export interface AppShellProps {
  children: React.ReactNode;
  sidebarContent?: React.ReactNode | ((state: SidebarRenderState) => React.ReactNode);
  title?: string;
}

export function AppShell({ children, sidebarContent, title }: AppShellProps) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { doSignOut, busy: signingOut } = useSignOut();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const renderSidebar = (s: SidebarRenderState): React.ReactNode =>
    typeof sidebarContent === 'function' ? sidebarContent(s) : sidebarContent;

  const userName = user?.nome || user?.email || 'Usuário';

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg">
      <header className="z-30 flex h-14 flex-shrink-0 items-center justify-between border-b border-border bg-surface px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="rounded-lg p-2 text-ink-secondary hover:bg-surface-2 lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCollapsed((p) => !p)}
            className="hidden rounded-lg p-2 text-ink-secondary hover:bg-surface-2 lg:flex"
            aria-label="Alternar sidebar"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          <div className="min-w-0">
            <span className="block truncate text-sm font-semibold text-ink">{title ?? 'Gestão Médica'}</span>
            <Breadcrumbs />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-ink-secondary transition-colors hover:bg-surface-2"
            aria-label="Alternar tema"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <div className="relative">
            <button
              onClick={() => setProfileOpen((p) => !p)}
              className="flex items-center gap-2 rounded-lg p-1.5 text-ink-secondary hover:bg-surface-2"
              aria-label="Menu do usuário"
              aria-expanded={profileOpen}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
                {userName.slice(0, 1).toUpperCase()}
              </span>
            </button>
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
                  <div className="border-b border-border px-3 py-2">
                    <p className="truncate text-sm font-medium text-ink">{userName}</p>
                  </div>
                  <button
                    onClick={() => void doSignOut()}
                    disabled={signingOut}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-error hover:bg-error-bg disabled:opacity-60"
                  >
                    {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                    Sair
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          className={`hidden flex-col border-r border-border bg-surface transition-all duration-200 lg:flex ${
            collapsed ? 'w-[76px]' : 'w-[260px]'
          }`}
        >
          <div className="flex-1 overflow-y-auto p-3">{renderSidebar({ collapsed })}</div>
          <div className="border-t border-border p-2">
            <button
              onClick={() => void doSignOut()}
              disabled={signingOut}
              title="Sair"
              className={`flex w-full items-center rounded-lg text-error hover:bg-error-bg disabled:opacity-60 ${
                collapsed ? 'justify-center p-2.5' : 'gap-2 px-3 py-2 text-sm'
              }`}
            >
              {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              {!collapsed && <span>Sair</span>}
            </button>
          </div>
        </aside>

        {drawerOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-overlay" onClick={() => setDrawerOpen(false)} />
            <aside className="absolute bottom-0 left-0 top-0 z-50 flex w-[280px] flex-col overflow-y-auto border-r border-border bg-surface">
              <div className="flex items-center justify-between border-b border-border p-4">
                <span className="text-sm font-semibold text-ink">Menu</span>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="rounded p-1 text-ink-muted hover:text-ink"
                  aria-label="Fechar menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                {renderSidebar({ collapsed: false, onNavigate: () => setDrawerOpen(false) })}
              </div>
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1 overflow-y-auto bg-bg">
          <div className="p-4 md:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}