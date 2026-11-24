// AppShell — Layout único reutilizável para todos os módulos Enterprise
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { HeaderEnterprise } from './HeaderEnterprise';
import { SidebarEnterprise } from './SidebarEnterprise';
import { FooterEnterprise } from './FooterEnterprise';
import { Breadcrumbs } from './Breadcrumbs';
import { SPACING, LAYOUT, getThemeColors } from '../ui/designTokens';

export function AppShell({ children }: { children?: React.ReactNode }) {
  const { authenticated, loading } = useAuth();
  const [isDark, setIsDark] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Sincroniza tema com preferência do sistema/salvo
  useEffect(() => {
    const saved = localStorage.getItem('gma-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(saved ? saved === 'dark' : prefersDark);
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('gma-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);
  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);

  if (loading || !authenticated) {
    return null; // Deixa o AuthProvider ou Login gerenciar este estado
  }

  const theme = getThemeColors(isDark);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: theme.bg,
        color: theme.text,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <HeaderEnterprise
        isDark={isDark}
        toggleTheme={toggleTheme}
        toggleSidebar={toggleSidebar}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <SidebarEnterprise
          isDark={isDark}
          collapsed={sidebarCollapsed}
          toggleCollapsed={toggleSidebar}
        />

        <main
          style={{
            flex: 1,
            marginLeft: sidebarCollapsed ? LAYOUT.sidebarCollapsedWidth : LAYOUT.sidebarWidth,
            padding: SPACING.lg,
            overflowY: 'auto',
            minHeight: `calc(100vh - ${LAYOUT.headerHeight})`,
          }}
        >
          <Breadcrumbs isDark={isDark} />
          {children}
        </main>
      </div>

      <FooterEnterprise isDark={isDark} />
    </div>
  );
}

export default AppShell;
