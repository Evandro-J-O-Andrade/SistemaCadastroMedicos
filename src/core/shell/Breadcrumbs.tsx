// src/core/shell/Breadcrumbs.tsx
// Breadcrumbs a partir da rota atual; rótulos amigáveis; último item é a página atual.
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const LABELS: Record<string, string> = {
  '': 'Início',
  inicio: 'Início',
  medicos: 'Médicos',
  plantao: 'Plantões',
  relatorios: 'Relatórios',
  filtros: 'Filtros',
  'cadastro-usuarios': 'Usuários',
  'cadastro-lote': 'Cadastro em Lote',
  admin: 'Administração',
  tenants: 'Tenants',
  'documentos-legais': 'Documentos Legais',
  dashboard: 'Painel',
  'admin-master': 'Admin Master',
};

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split('/').filter(Boolean);

  if (parts.length === 0) return null;

  let acc = '';
  const crumbs = parts.map((p) => {
    acc += `/${p}`;
    return { to: acc, label: LABELS[p] ?? p };
  });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-ink-muted">
      <Link to="/" className="hover:text-ink">Início</Link>
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <span key={c.to} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3" />
            {last ? (
              <span className="font-medium text-ink">{c.label}</span>
            ) : (
              <Link to={c.to} className="hover:text-ink">{c.label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}