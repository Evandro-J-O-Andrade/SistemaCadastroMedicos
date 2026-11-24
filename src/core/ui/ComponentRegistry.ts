// ComponentRegistry — catálogo de componentes autorizados para Database-Driven UI
// Nenhum código arbitrário; apenas componentes registrados podem ser renderizados.

import React from 'react';

export type ComponentCategory = 'layout' | 'navigation' | 'dashboard' | 'widget' | 'form' | 'block' | 'filter' | 'action';

export interface ComponentContract {
  key: string;
  nome: string;
  categoria: ComponentCategory;
  componente: React.ComponentType<any>;
  propsSchema: Record<string, string>;
  dataSources?: string[];
}

const registry = new Map<string, ComponentContract>();

export const ComponentRegistry = {
  register(contract: ComponentContract): void {
    if (registry.has(contract.key)) {
      console.warn(`ComponentRegistry: '${contract.key}' já registrado. Sobrescrevendo.`);
    }
    registry.set(contract.key, contract);
  },

  get(key: string): ComponentContract | undefined {
    return registry.get(key);
  },

  getAll(): ComponentContract[] {
    return Array.from(registry.values());
  },

  getByCategory(cat: ComponentCategory): ComponentContract[] {
    return Array.from(registry.values()).filter((c) => c.categoria === cat);
  },

  isRegistered(key: string): boolean {
    return registry.has(key);
  },

  clear(): void {
    registry.clear();
  },
};

// Componentes básicos autorizados (registrados no bootstrap)
export function registerCoreComponents(): void {
  // KPI Card
  ComponentRegistry.register({
    key: 'kpi-card',
    nome: 'KPI Card',
    categoria: 'widget',
    componente: ({ titulo, valor, variacao, unidade }: any) =>
      React.createElement('div', { className: 'kpi-card', style: { padding: 16, border: '1px solid #e5e7eb', borderRadius: 8 } },
        React.createElement('div', { style: { fontSize: 12, color: '#6b7280' } }, titulo),
        React.createElement('div', { style: { fontSize: 24, fontWeight: 700 } }, `${valor}${unidade || ''}`),
        variacao !== undefined ? React.createElement('div', { style: { fontSize: 12, color: variacao >= 0 ? '#16a34a' : '#dc2626' } }, `${variacao >= 0 ? '+' : ''}${variacao}%`) : null
      ),
    propsSchema: { titulo: 'string', valor: 'number', variacao: 'number', unidade: 'string' },
  });

  // Tabela de dados
  ComponentRegistry.register({
    key: 'data-table',
    nome: 'Data Table',
    categoria: 'widget',
    componente: ({ colunas, dados }: any) =>
      React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse' } },
        React.createElement('thead', null,
          React.createElement('tr', null, (colunas || []).map((c: string) => React.createElement('th', { key: c, style: { padding: 8, borderBottom: '2px solid #e5e7eb', textAlign: 'left' } }, c)))
        ),
        React.createElement('tbody', null,
          (dados || []).map((row: any, i: number) =>
            React.createElement('tr', { key: i },
              (colunas || []).map((c: string) => React.createElement('td', { key: c, style: { padding: 8, borderBottom: '1px solid #f3f4f6' } }, row[c]))
            )
          )
        )
      ),
    propsSchema: { colunas: 'array', dados: 'array', total: 'number' },
  });

  // Container de seção
  ComponentRegistry.register({
    key: 'section-container',
    nome: 'Section Container',
    categoria: 'layout',
    componente: ({ titulo, children }: any) =>
      React.createElement('section', { style: { marginBottom: 24 } },
        titulo ? React.createElement('h3', { style: { marginBottom: 12 } }, titulo) : null,
        children
      ),
    propsSchema: { titulo: 'string' },
  });

  // Grid de layout
  ComponentRegistry.register({
    key: 'grid-layout',
    nome: 'Grid Layout',
    categoria: 'layout',
    componente: ({ colunas, children }: any) =>
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: `repeat(${colunas || 1}, 1fr)`, gap: 16 } }, children),
    propsSchema: { colunas: 'number' },
  });

  // Gráfico de barras (placeholder para Chart.js)
  ComponentRegistry.register({
    key: 'bar-chart',
    nome: 'Bar Chart',
    categoria: 'widget',
    componente: ({ titulo, labels, valores }: any) =>
      React.createElement('div', { style: { padding: 16, border: '1px solid #e5e7eb', borderRadius: 8 } },
        React.createElement('div', { style: { fontWeight: 600, marginBottom: 8 } }, titulo || 'Gráfico de Barras'),
        React.createElement('div', { style: { fontSize: 12, color: '#6b7280' } }, `Labels: ${(labels || []).join(', ')}`),
        React.createElement('div', { style: { fontSize: 12, color: '#6b7280' } }, `Valores: ${(valores || []).join(', ')}`)
      ),
    propsSchema: { titulo: 'string', labels: 'array', valores: 'array' },
  });

  // Gráfico de linhas
  ComponentRegistry.register({
    key: 'line-chart',
    nome: 'Line Chart',
    categoria: 'widget',
    componente: ({ titulo, labels, valores }: any) =>
      React.createElement('div', { style: { padding: 16, border: '1px solid #e5e7eb', borderRadius: 8 } },
        React.createElement('div', { style: { fontWeight: 600, marginBottom: 8 } }, titulo || 'Gráfico de Linhas'),
        React.createElement('div', { style: { fontSize: 12, color: '#6b7280' } }, `Labels: ${(labels || []).join(', ')}`),
        React.createElement('div', { style: { fontSize: 12, color: '#6b7280' } }, `Valores: ${(valores || []).join(', ')}`)
      ),
    propsSchema: { titulo: 'string', labels: 'array', valores: 'array' },
  });
}
