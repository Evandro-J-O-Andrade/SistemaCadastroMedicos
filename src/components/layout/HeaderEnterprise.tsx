// HeaderEnterprise — Header profissional com nome, papel, contexto e menu de conta
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  ShieldCheck,
  User,
  LogOut,
  Menu,
  ChevronDown,
} from 'lucide-react';
import { COLORS, TYPOGRAPHY, SPACING, BORDER, SHADOW, getThemeColors, LAYOUT } from '../ui/designTokens';

interface HeaderEnterpriseProps {
  isDark: boolean;
  toggleTheme: () => void;
  toggleSidebar: () => void;
}

export function HeaderEnterprise({ isDark, toggleTheme, toggleSidebar }: HeaderEnterpriseProps) {
  const theme = getThemeColors(isDark);
  const { user, signOut, authenticated, loading } = useAuth();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  if (loading) return null;

  const handleLogoff = () => {
    setAccountMenuOpen(false);
    signOut();
  };

  const isRootGlobal = authenticated && user?.roles.includes('root') && !user?.tenant_id;

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: LAYOUT.headerHeight,
        padding: `0 ${SPACING.md}`,
        backgroundColor: theme.surface,
        borderBottom: `1px solid ${theme.border}`,
        color: theme.text,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.md }}>
        <button
          onClick={toggleSidebar}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: BORDER.radius,
            cursor: 'pointer',
            color: theme.textMuted,
          }}
        >
          <Menu style={{ width: 20, height: 20 }} />
        </button>

        <NavLink
          to="/"
          style={{
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.sm,
          }}
        >
          <ShieldCheck style={{ width: 24, height: 24, color: COLORS.primary }} />
          <span
            style={{
              fontSize: TYPOGRAPHY.fontSize.lg,
              fontWeight: TYPOGRAPHY.fontWeight.bold,
              color: theme.text,
            }}
          >
            Gestão Médica Alpha
          </span>
        </NavLink>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
        {authenticated && user && (
          <>
            <button
              onClick={toggleTheme}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                backgroundColor: theme.bg === COLORS.bg ? '#f1f5f9' : '#334155',
                border: 'none',
                borderRadius: BORDER.radius,
                cursor: 'pointer',
                color: theme.text,
              }}
              title="Alternar tema"
            >
              {isDark ? (
                <User style={{ width: 18, height: 18 }} />
              ) : (
                <User style={{ width: 18, height: 18 }} />
              )}
            </button>

            <button
              onClick={() => setAccountMenuOpen(!accountMenuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: SPACING.sm,
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: BORDER.radiusFull,
                padding: `${SPACING.xs} ${SPACING.sm}`,
                cursor: 'pointer',
                color: theme.text,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: 2,
                }}
              >
                <span
                  style={{
                    fontSize: TYPOGRAPHY.fontSize.sm,
                    fontWeight: TYPOGRAPHY.fontWeight.semibold,
                    color: theme.text,
                  }}
                >
                  {user.nome || user.email || 'Usuário'}
                </span>
                <span
                  style={{
                    fontSize: TYPOGRAPHY.fontSize.xs,
                    backgroundColor: isRootGlobal ? COLORS.primary : COLORS.accent,
                    color: '#fff',
                    padding: '1px 6px',
                    borderRadius: BORDER.radiusFull,
                  }}
                >
                  {isRootGlobal ? 'ROOT Global' : (user.roles || []).join(', ')}
                </span>
              </div>
              <ChevronDown style={{ width: 16, height: 16 }} />
            </button>

            {accountMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 52,
                  right: 0,
                  width: 200,
                  backgroundColor: theme.dropdownBg,
                  border: `1px solid ${theme.dropdownBorder}`,
                  borderRadius: BORDER.radiusLg,
                  boxShadow: SHADOW.lg,
                  padding: SPACING.sm,
                  zIndex: 200,
                }}
              >
                <div style={{ padding: `${SPACING.xs} 0`, borderBottom: `1px solid ${theme.border}`, marginBottom: SPACING.xs }}>
                  <p style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.xs, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Conta
                  </p>
                  <p style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.semibold, color: theme.text }}>
                    {user.nome || user.email || 'Usuário'}
                  </p>
                  <p style={{ marginTop: SPACING.xs, fontSize: TYPOGRAPHY.fontSize.xs, color: theme.textMuted }}>
                    {user.email || '—'}
                  </p>
                </div>
                <button
                  onClick={handleLogoff}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: SPACING.sm,
                    padding: `${SPACING.sm} ${SPACING.md}`,
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: BORDER.radius,
                    color: COLORS.error,
                    fontSize: TYPOGRAPHY.fontSize.sm,
                    fontWeight: TYPOGRAPHY.fontWeight.semibold,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <LogOut style={{ width: 16, height: 16 }} />
                  Sair
                </button>
              </div>
            )}
          </>
        )}

        {!authenticated && (
          <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
            <span style={{ fontSize: TYPOGRAPHY.fontSize.sm, color: theme.textMuted }}>Não autenticado</span>
          </div>
        )}
      </div>
    </header>
  );
}

export default HeaderEnterprise;
