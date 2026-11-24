// src/core/shell/EnterpriseShell.tsx
import React, { useState, useCallback } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Sun, Moon, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface EnterpriseShellProps {
  children: React.ReactNode;
  sidebarContent?: React.ReactNode;
  headerTitle?: string;
}

export function EnterpriseShell({ children, sidebarContent, headerTitle }: EnterpriseShellProps): React.ReactElement {
  const { theme, toggleTheme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const toggleSidebar = useCallback(() => setSidebarCollapsed((p) => !p), []);

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-gray-50 dark:bg-slate-950">
      {/* Header */}
      <header className="h-14 flex-shrink-0 flex items-center justify-between px-4 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-30">
        <div className="flex items-center gap-3">
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
          <span className="font-semibold text-gray-900 dark:text-white text-sm">{headerTitle || 'Gestão Médica Alpha'}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Alternar tema"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
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
            {sidebarContent}
          </div>
        </aside>

        {/* Mobile drawer */}
        {mobileDrawerOpen && (
          <div className="lg:hidden fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileDrawerOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-[280px] bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 overflow-y-auto z-50">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-800">
                <span className="font-semibold text-gray-900 dark:text-white text-sm">Menu</span>
                <button onClick={() => setMobileDrawerOpen(false)} className="p-1 rounded text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-3">{sidebarContent}</div>
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
