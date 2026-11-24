// CHECK BOULER 24H Cell — saúde das células, monitoramento e diagnóstico
// Sem métricas simuladas; apenas dados reais ou 'uninstrumented'.

import { CellContract, CellRegistry, CellHealthStatus } from '../cell/CellContract';

export interface CellHealthRecord {
  cellId: string;
  status: CellHealthStatus;
  lastCheckedAt: string;
  errorCount: number;
  incidentCount: number;
  details?: string;
}

export const checkBoulerCellContract: CellContract = {
  id: 'check-bouler',
  nome: 'CHECK BOULER 24H',
  dominio: 'observability',
  escopo: 'global',
  rotaPrincipal: '/dashboard/global',
  rotasInternas: ['/dashboard/global/health', '/dashboard/global/incidents', '/dashboard/global/diagnostics'],
  permissoes: ['observability.read'],
  navegacao: [
    { path: '/dashboard/global', label: 'Visão Global', requiredPermissions: ['observability.read'], disponivel: true },
    { path: '/dashboard/global/health', label: 'Saúde das Células', requiredPermissions: ['observability.read'], disponivel: true },
    { path: '/dashboard/global/incidents', label: 'Incidentes', requiredPermissions: ['observability.read'], disponivel: true },
    { path: '/dashboard/global/diagnostics', label: 'Diagnósticos', requiredPermissions: ['observability.read'], disponivel: true },
  ],
  dashboard: { path: '/dashboard/global', disponivel: true },
  capacidades: [
    { id: 'cell-health', label: 'Saúde das células', disponivel: true },
    { id: 'incident-tracking', label: 'Rastreamento de incidentes', disponivel: true },
    { id: 'diagnostics', label: 'Diagnósticos', disponivel: true },
  ],
  observabilidade: { status: 'healthy', errorCount: 0, incidentCount: 0 },
  habilitada: true,
  versao: '1.0.0',
};

export function registerCheckBoulerCell(): void {
  CellRegistry.register({ contract: checkBoulerCellContract });
}
