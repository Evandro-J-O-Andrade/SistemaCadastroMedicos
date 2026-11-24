// SidebarEnterprise — Sidebar responsiva e recolhível com navegação por permissão
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  FaHome,
  FaUserMd,
  FaCalendarAlt,
  FaChartBar,
  FaFilter,
  FaUserPlus,
  FaShieldAlt,
  FaUsers,
  FaBuilding,
  FaCog,
} from 'react-icons/fa';
import { COLORS, TYPOGRAPHY, SPACING, BORDER, getThemeColors, LAYOUT } from '../ui/designTokens';

interface SidebarEnterpriseProps {
  isDark: boolean;
  collapsed: boolean;
  toggleCollapsed: (collapsed?: boolean) => void;
}

export function SidebarEnterprise({ isDark, collapsed, toggleCollapsed }: SidebarEnterpriseProps) {
  const theme = getThemeColors(isDark);
  const location = useLocation();
  const { user, authenticated, loading } = useAuth();

  if (loading || !authenticated || !user) return null;

  const roles = Array.isArray(user.roles) ? user.roles : [];

  const menuItems: { path: string; label: string; icon: React.ElementType; roles?: string[] }[] = [
    { path: '/', label: 'Home', icon: FaHome },
    { path: '/medicos', label: 'Médicos', icon: FaUserMd, roles: ['admin', 'suporte', 'root'] },
    { path: '/plantao', label: 'Plantão 12×36', icon: FaCalendarAlt, roles: ['admin', 'suporte', 'root', 'operador_ti'] },
    { path: '/relatorios', label: 'Relatórios', icon: FaChartBar },
    { path: '/filtros', label: 'Filtros', icon: FaFilter },
    { path: '/cadastro-usuarios', label: 'Cadastro de Usuários', icon: FaUserPlus, roles: ['admin', 'root'] },
    { path: '/cadastro-lote', label: 'Cadastro em Lote', icon: FaBuilding, roles: ['admin', 'root'] },
    { path: '/admin/tenants', label: 'Tenants', icon: FaShieldAlt, roles: ['root'] },
    { path: '/admin/auditoria', label: 'Auditoria', icon: FaUsers, roles: ['root'] },
    { path: '/admin/configuracoes', label: 'Configurações', icon: FaCog, roles: ['root'] },
  ];

  const visibleItems = menuItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.some((r) => roles.includes(r));
  });

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside
      style={{
        width: collapsed ? LAYOUT.sidebarCollapsedWidth : LAYOUT.sidebarWidth,
        backgroundColor: theme.surface,
        borderRight: `1px solid ${theme.border}`,
        height: '100vh',
        position: 'fixed',
        top: LAYOUT.headerHeight,
        left: 0,
        zIndex: 90,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s',
        overflowX: 'hidden',
      }}
    >
      <div
        style={{
          padding: SPACING.md,
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: SPACING.sm,
          cursor: 'pointer',
        }}
        onClick={() => toggleCollapsed()}
      >
        <FaShieldAlt style={{ width: 20, height: 20, color: COLORS.primary }} />
        {!collapsed && (
          <span style={{ fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.bold, color: theme.text }}>
            Gestão Médica
          </span>
        )}
      </div>

      <nav style={{ flex: 1, padding: SPACING.sm, overflowY: 'auto' }}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {visibleItems.map((item) => {
            const active = isActive(item.path);
            const showRoles = item.roles && !item.roles.includes('root');
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => (isActive ? 'active' : '')}
                  onClick={() => toggleCollapsed(false)}
                  style={{
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: SPACING.md,
                    padding: `${SPACING.sm} ${SPACING.md}`,
                    borderRadius: BORDER.radius,
                    color: active ? COLORS.primary : theme.textMuted,
                    fontWeight: active ? TYPOGRAPHY.fontWeight.semibold : TYPOGRAPHY.fontWeight.normal,
                    backgroundColor: active ? (isDark ? '#1e293b' : '#f1f5f9') : 'transparent',
                    borderLeft: active ? `3px solid ${COLORS.primary}` : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <item.icon style={{ width: 20, height: 20, color: active ? COLORS.primary : theme.textMuted }} />
                  {!collapsed && (
                    <span style={{ fontSize: TYPOGRAPHY.fontSize.sm }}>
                      {item.label}
                    </span>
                  )}
                  {showRoles && !collapsed && (
                    <span
                      style={{
                        fontSize: TYPOGRAPHY.fontSize.xs,
                        backgroundColor: 'rgba(2, 30, 58, 0.1)',
                        color: COLORS.primary,
                        padding: '1px 6px',
                        borderRadius: BORDER.radiusFull,
                        marginLeft: 'auto',
                      }}
                    >
                      {(item.roles || []).join(', ')}
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div style={{ padding: SPACING.md, borderTop: `1px solid ${theme.border}` }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.sm,
            padding: `${SPACING.sm} ${SPACING.md}`,
            borderRadius: BORDER.radius,
            backgroundColor: theme.bg === COLORS.bg ? '#f1f5f9' : '#334155',
            cursor: 'pointer',
            color: theme.text,
          }}
          onClick={() => toggleCollapsed()}
        >
          {collapsed ? (
            <span style={{ fontSize: TYPOGRAPHY.fontSize.xs }}>←</span>
          ) : (
            <>
              <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: theme.border, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.bold, color: theme.text }}>
                  {(user.nome || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.semibold, color: theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.nome || user.email || 'Usuário'}
                </span>
                <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: theme.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.email || '—'}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

export default SidebarEnterprise;
