// src/core/cells/types.ts
// CHECK BOULER 24H — Contrato de Célula (fase CONTRACT).
// Uma célula é um domínio funcional autônomo: contrato + capacidades + navegação +
// dashboard + saúde. A DESCOBERTA de uma célula NÃO concede permissão de execução;
// a autorização final é sempre do backend (RBAC/RLS). O frontend apenas renderiza.

export type CellId = string;

export type CellState = 'healthy' | 'degraded' | 'down' | 'unknown';

export type CellAction =
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'deactivate'
  | 'approve'
  | 'export';

export type CellScope = 'global' | 'tenant' | 'unit';

/** Capacidade = par recurso+ação, escopada por território. */
export interface CellCapability {
  /** Ex.: 'medicos.read' */
  key: string;
  resource: string;
  actions: CellAction[];
  scope: CellScope;
}

/** Item de navegação declarado pela célula (não é menu decorativo). */
export interface CellNavItem {
  key: string;
  label: string;
  /** Rota real existente na aplicação. */
  route: string;
  /** Nome do ícone Lucide (string), resolvido no renderer. */
  icon?: string;
  /** Permissões exigidas para o item aparecer; vazio = sempre visível. */
  requiredPermissions?: string[];
  order?: number;
  end?: boolean;
}

export interface CellWidget {
  key: string;
  /** Componente registrado (ui_component_definitions.key). */
  component: string;
  dataSource?: string;
  config?: Record<string, unknown>;
}

export interface CellDashboard {
  key: string;
  widgets: CellWidget[];
}

export interface CellHealth {
  state: CellState;
  message?: string;
  checkedAt?: string;
}

/** Contrato público de uma célula. */
export interface CellContract {
  id: CellId;
  name: string;
  domain: string;
  version: string;
  capabilities: CellCapability[];
  nav: CellNavItem[];
  dashboard?: CellDashboard;
  health: CellHealth;
}

/** Contexto de acesso já autorizado (vem do bootstrap/ContextProvider). */
export interface CellAccessContext {
  roles: string[];
  permissions: string[];
  tenantId: string | null;
  unitIds: string[];
  isGlobal: boolean;
}