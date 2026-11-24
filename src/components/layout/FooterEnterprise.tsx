// FooterEnterprise — Footer institucional profissional
import { ShieldCheck } from 'lucide-react';
import { COLORS, TYPOGRAPHY, SPACING, getThemeColors } from '../ui/designTokens';

interface FooterEnterpriseProps {
  isDark: boolean;
}

export function FooterEnterprise({ isDark }: FooterEnterpriseProps) {
  const theme = getThemeColors(isDark);

  return (
    <footer
      style={{
        padding: `${SPACING.md} ${SPACING.lg}`,
        backgroundColor: theme.surface,
        borderTop: `1px solid ${theme.border}`,
        color: theme.textMuted,
        fontSize: TYPOGRAPHY.fontSize.xs,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
        <ShieldCheck style={{ width: 16, height: 16, color: COLORS.primary }} />
        <span>
          Gestão Médica Alpha Enterprise &copy; {new Date().getFullYear()}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.md }}>
        <span>Auth People-First</span>
        <span>·</span>
        <span>Supabase/PostgreSQL</span>
        <span>·</span>
        <span>Multi-tenant</span>
        <span>·</span>
        <span>RBAC + RLS</span>
      </div>
    </footer>
  );
}

export default FooterEnterprise;
