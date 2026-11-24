// EnterpriseShell — container principal da aplicação
// Renderiza header, sidebar, footer, breadcrumbs e área de conteúdo.
// Cada célula é montada dentro do shell via CellRegistry + DispatcherMaster.

import React, { createContext, useContext, useState, useCallback } from 'react';

interface ShellContextValue {
  sidebarCollapsed: boolean;
  toggleSidebar: (collapsed?: boolean) => void;
  currentCellId: string | null;
  setCurrentCellId: (id: string | null) => void;
}

const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error('useShell must be used within EnterpriseShell');
  return ctx;
}

interface EnterpriseShellProps {
  children: React.ReactNode;
}

export function EnterpriseShell({ children }: EnterpriseShellProps): React.ReactElement {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentCellId, setCurrentCellId] = useState<string | null>(null);

  const toggleSidebar = useCallback((collapsed?: boolean) => {
    setSidebarCollapsed((prev) => (collapsed !== undefined ? collapsed : !prev));
  }, []);

  return (
    <ShellContext.Provider value={{ sidebarCollapsed, toggleSidebar, currentCellId, setCurrentCellId }}>
      <div className="enterprise-shell" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <header className="enterprise-shell__header" style={{ height: 64, borderBottom: '1px solid #e5e7eb' }}>
          {/* HeaderEnterprise montado aqui */}
        </header>
        <div className="enterprise-shell__body" style={{ display: 'flex', flex: 1 }}>
          <aside
            className="enterprise-shell__sidebar"
            style={{ width: sidebarCollapsed ? 64 : 240, borderRight: '1px solid #e5e7eb', transition: 'width 0.2s' }}
          >
            {/* SidebarEnterprise montado aqui */}
          </aside>
          <main className="enterprise-shell__content" style={{ flex: 1, padding: 24 }}>
            {children}
          </main>
        </div>
        <footer className="enterprise-shell__footer" style={{ height: 48, borderTop: '1px solid #e5e7eb' }}>
          {/* FooterEnterprise montado aqui */}
        </footer>
      </div>
    </ShellContext.Provider>
  );
}
