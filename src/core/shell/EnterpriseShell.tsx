// src/core/shell/EnterpriseShell.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { useAuth } from '../../hooks/useAuth';
import { useSignOut } from '../../auth/hooks/useSignOut';
import { Sun, Moon, Menu, X, ChevronLeft, ChevronRight, LogOut, Loader2 } from 'lucide-react';

interface SidebarRenderState {
  collapsed: boolean;
  onNavigate?: () => void;
}

interface EnterpriseShellProps {
  children: React.ReactNode;
  sidebarContent?: React.ReactNode | ((state: SidebarRenderState) => React.ReactNode);
  headerTitle?: string;
}

export function EnterpriseShell({ children, sidebarContent, headerTitle }: EnterpriseShellProps): React.ReactElement {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { doSignOut, busy: signingOut } = useSignOut();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const toggleSidebar = useCallback(() => setSidebarCollapsed((p) => !p), []);

  // Fecha drawer mobile com Escape.
  useEffect(() => {
    if (!mobileDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileDrawerOpen]);

  const renderSidebar = (state: SidebarRenderState): React.ReactNode =>
    typeof sidebarContent === 'function' ? sidebarContent(state) : sidebarContent;

  const userName = user?.nome || user?.email || 'Usuário';

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-gray-50 dark:bg-slate-950">
      {/* Header */}
      <header className="h-14 flex-shrink-0 flex items-center justify-between px-4 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex p-2 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
            aria-label="Alternar sidebar"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">{headerTitle || 'Gestão Médica Alpha'}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Alternar tema"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {/* Menu de perfil com logout real */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen((p) => !p)}
              className="flex items-center gap-2 p-1.5 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Menu do usuário"
              aria-expanded={profileOpen}
            >
              <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center justify-center">
                {userName.slice(0, 1).toUpperCase()}
              </span>
            </button>
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg z-40 overflow-hidden">
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-slate-800">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{userName}</p>
                  </div>
                  <button
                    onClick={() => void doSignOut()}
                    disabled={signingOut}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-60"
                  >
                    {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                    Sair
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Sidebar desktop */}
        <aside
          className={`hidden lg:flex flex-col border-r border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-200 ${
            sidebarCollapsed ? 'w-[72px]' : 'w-[250px]'
          }`}
        >
          <div className="flex-1 overflow-y-auto p-3">
            {renderSidebar({ collapsed: sidebarCollapsed })}
          </div>
          <div className="border-t border-gray-200 dark:border-slate-800 p-2">
            <button
              onClick={() => void doSignOut()}
              disabled={signingOut}
              title="Sair"
              className={`flex items-center gap-2 w-full rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-60 transition-colors ${
                sidebarCollapsed ? 'justify-center p-2' : 'px-3 py-2 text-sm'
              }`}
            >
              {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              {!sidebarCollapsed && <span>Sair</span>}
            </button>
          </div>
        </aside>

        {/* Mobile drawer */}
        {mobileDrawerOpen && (
          <div className="lg:hidden fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileDrawerOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-[280px] bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 overflow-y-auto z-50 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-800">
                <span className="font-semibold text-gray-900 dark:text-white text-sm">Menu</span>
                <button onClick={() => setMobileDrawerOpen(false)} className="p-1 rounded text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white" aria-label="Fechar menu">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-3 flex-1 overflow-y-auto">{renderSidebar({ collapsed: false, onNavigate: () => setMobileDrawerOpen(false) })}</div>
              <div className="border-t border-gray-200 dark:border-slate-800 p-3">
                <button
                  onClick={() => void doSignOut()}
                  disabled={signingOut}
                  className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-60"
                >
                  {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                  Sair
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-gray-50 dark:bg-slate-950">
          <div className="p-4 md:p-6">{children}</div>
        </main>
      </div>

      {/* Footer */}
      <footer className="h-10 flex-shrink-0 flex items-center justify-between px-4 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-gray-500 dark:text-slate-500">
        <span>Gestão Médica Alpha © {new Date().getFullYear()}</span>
        <span>Tecnologia por New Wave Sistemas Digital</span>
      </footer>
    </div>
  );
}