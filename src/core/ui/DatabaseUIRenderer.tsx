// DatabaseUIRenderer — renderiza páginas a partir de definições persistidas no PostgreSQL
// Valida componentes contra o ComponentRegistry. Não executa código arbitrário.

import React from 'react';
import { ComponentRegistry } from './ComponentRegistry';

export interface BlockDefinition {
  id: string;
  componentKey: string;
  ordem: number;
  config: Record<string, any>;
  dataSource?: string;
  ativo: boolean;
}

export interface PageDefinition {
  id: string;
  key: string;
  nome: string;
  rota: string;
  version: string;
  blocks: BlockDefinition[];
  tenantId?: string;
  unitId?: string;
}

export interface RenderContext {
  tenantId: string | null;
  unitId: string | null;
  permissions: string[];
  isRootGlobal: boolean;
}

export function DatabaseUIRenderer({ page }: { page: PageDefinition; context: RenderContext }): React.ReactElement {
  if (!page || !page.blocks) {
    return React.createElement('div', null, 'Página sem blocos definidos.');
  }

  const sortedBlocks = [...page.blocks]
    .filter((b) => b.ativo)
    .sort((a, b) => a.ordem - b.ordem);

  return React.createElement(
    'div',
    { className: 'database-ui-page', 'data-page-key': page.key },
    React.createElement('h2', { style: { marginBottom: 16 } }, page.nome),
    sortedBlocks.map((block) => {
      const contract = ComponentRegistry.get(block.componentKey);
      if (!contract) {
        return React.createElement('div', { key: block.id, style: { padding: 8, color: '#dc2626', border: '1px solid #fecaca', borderRadius: 4, marginBottom: 8 } },
          `Componente não autorizado: ${block.componentKey}`
        );
      }
      const Component = contract.componente;
      return React.createElement(Component, { key: block.id, ...block.config });
    })
  );
}

// DashboardRenderer — renderiza dashboards com KPIs, gráficos e tabelas
export interface DashboardWidget {
  id: string;
  componentKey: string;
  config: Record<string, any>;
  ordem: number;
  ativo: boolean;
}

export interface DashboardDefinition {
  id: string;
  key: string;
  nome: string;
  widgets: DashboardWidget[];
}

export function DashboardRenderer({ dashboard }: { dashboard: DashboardDefinition }): React.ReactElement {
  if (!dashboard || !dashboard.widgets) {
    return React.createElement('div', null, 'Dashboard sem widgets.');
  }

  const sortedWidgets = [...dashboard.widgets]
    .filter((w) => w.ativo)
    .sort((a, b) => a.ordem - b.ordem);

  return React.createElement(
    'div',
    { className: 'dashboard-renderer', 'data-dashboard-key': dashboard.key },
    React.createElement('h2', { style: { marginBottom: 16 } }, dashboard.nome),
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 } },
      sortedWidgets.map((widget) => {
        const contract = ComponentRegistry.get(widget.componentKey);
        if (!contract) {
          return React.createElement('div', { key: widget.id, style: { padding: 8, color: '#dc2626' } },
            `Widget não autorizado: ${widget.componentKey}`
          );
        }
        const Component = contract.componente;
        return React.createElement(Component, { key: widget.id, ...widget.config });
      })
    )
  );
}
