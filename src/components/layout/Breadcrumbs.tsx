// Breadcrumbs — Navegação dinâmica por caminho atual
import { useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { COLORS, TYPOGRAPHY, SPACING, getThemeColors } from '../ui/designTokens';

interface BreadcrumbsProps {
  isDark: boolean;
}

const routeLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/medicos': 'Médicos',
  '/plantao': 'Plantão 12×36',
  '/relatorios': 'Relatórios',
  '/filtros': 'Filtros',
  '/cadastro-usuarios': 'Cadastro de Usuários',
  '/cadastro-lote': 'Cadastro em Lote',
  '/troca-senha': 'Troca de Senha',
  '/welcome': 'Bem-vindo',
  '/dispatcher': 'Dispatcher',
  '/dashboard/admin-master': 'Admin Master',
  '/admin/tenants': 'Tenants',
  '/admin/auditoria': 'Auditoria',
  '/admin/configuracoes': 'Configurações',
};

export function Breadcrumbs({ isDark }: BreadcrumbsProps) {
  const theme = getThemeColors(isDark);
  const location = useLocation();

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const crumbs: { label: string; path: string }[] = [];

  let currentPath = '';
  for (const segment of pathSegments) {
    currentPath += `/${segment}`;
    crumbs.push({ label: routeLabels[currentPath] || segment, path: currentPath });
  }

  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.xs,
        padding: `${SPACING.sm} 0`,
        fontSize: TYPOGRAPHY.fontSize.xs,
        color: theme.textMuted,
      }}
    >
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <span key={crumb.path} style={{ display: 'flex', alignItems: 'center', gap: SPACING.xs }}>
            {!isLast && (
              <span
                style={{ cursor: 'pointer', color: COLORS.accent }}
                title={crumb.label}
              >
                {crumb.label}
              </span>
            )}
            {isLast && <span style={{ color: theme.textSecondary }}>{crumb.label}</span>}
            {!isLast && <ChevronRight style={{ width: 12, height: 12 }} />}
          </span>
        );
      })}
    </nav>
  );
}

export default Breadcrumbs;
