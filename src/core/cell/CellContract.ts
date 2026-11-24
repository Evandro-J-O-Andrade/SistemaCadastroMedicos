// CellContract — contrato padrão das células (Gate 3.2)
// Cada célula declara seu contrato canônico. Nenhuma célula acessa repositórios privados de outra.

export type CellHealthStatus = 'healthy' | 'degraded' | 'unavailable' | 'unknown' | 'uninstrumented';

export type CellScope = 'global' | 'tenant' | 'unit' | 'person';

export interface CellNavigationItem {
  path: string;
  label: string;
  icon?: string;
  requiredPermissions?: string[];
  disponivel: boolean;
  motivoIndisponivel?: string;
}

export interface CellCapability {
  id: string;
  label: string;
  disponivel: boolean;
}

export interface CellObservabilityContract {
  healthEndpoint?: string;
  metricsEndpoint?: string;
  lastCheckedAt?: string;
  status: CellHealthStatus;
  errorCount: number;
  incidentCount: number;
}

export interface CellContract {
  /** Identificador canônico (ex: 'admin-master', 'gestao-medicos') */
  id: string;
  /** Nome de exibição */
  nome: string;
  /** Domínio de negócio */
  dominio: string;
  /** Escopo de acesso */
  escopo: CellScope;
  /** Rota principal */
  rotaPrincipal: string;
  /** Rotas internas */
  rotasInternas: string[];
  /** Permissões exigidas para acesso */
  permissoes: string[];
  /** Navegação contextual da célula */
  navegacao: CellNavigationItem[];
  /** Dashboard próprio */
  dashboard: {
    path: string;
    disponivel: boolean;
  };
  /** Capacidades operacionais */
  capacidades: CellCapability[];
  /** Contrato de observabilidade */
  observabilidade: CellObservabilityContract;
  /** Se a célula está habilitada */
  habilitada: boolean;
  /** Versão do contrato */
  versao: string;
}

export interface CellRegistration {
  contract: CellContract;
  /** Serviços públicos expostos por esta célula */
  services?: Record<string, unknown>;
  /** Repositórios públicos expostos por esta célula */
  repositories?: Record<string, unknown>;
}

// Registry global de células
const registry = new Map<string, CellRegistration>();

export const CellRegistry = {
  register(registration: CellRegistration): void {
    if (registry.has(registration.contract.id)) {
      console.warn(`CellRegistry: célula '${registration.contract.id}' já registrada. Sobrescrevendo.`);
    }
    registry.set(registration.contract.id, registration);
  },

  unregister(id: string): void {
    registry.delete(id);
  },

  get(id: string): CellRegistration | undefined {
    return registry.get(id);
  },

  getAll(): CellRegistration[] {
    return Array.from(registry.values());
  },

  getByDominio(dominio: string): CellRegistration[] {
    return Array.from(registry.values()).filter((r) => r.contract.dominio === dominio);
  },

  has(id: string): boolean {
    return registry.has(id);
  },

  clear(): void {
    registry.clear();
  },
};
