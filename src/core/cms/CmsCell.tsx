// CMS Cell — catálogo de páginas, edição, pré-visualização, versionamento e publicação
// Templates globais com herança: Global → Tenant → Unidade

import { CellContract, CellRegistry } from '../cell/CellContract';

export const cmsCellContract: CellContract = {
  id: 'cms',
  nome: 'CMS / Page Builder',
  dominio: 'ui',
  escopo: 'global',
  rotaPrincipal: '/dashboard/cms',
  rotasInternas: ['/dashboard/cms/pages', '/dashboard/cms/templates', '/dashboard/cms/preview'],
  permissoes: ['cms.read', 'cms.write', 'cms.publish'],
  navegacao: [
    { path: '/dashboard/cms/pages', label: 'Páginas', requiredPermissions: ['cms.read'], disponivel: true },
    { path: '/dashboard/cms/templates', label: 'Templates', requiredPermissions: ['cms.read'], disponivel: true },
    { path: '/dashboard/cms/preview', label: 'Pré-visualização', requiredPermissions: ['cms.read'], disponivel: true },
  ],
  dashboard: { path: '/dashboard/cms', disponivel: true },
  capacidades: [
    { id: 'page-crud', label: 'CRUD de páginas', disponivel: true },
    { id: 'versioning', label: 'Versionamento', disponivel: true },
    { id: 'publishing', label: 'Publicação', disponivel: true },
    { id: 'template-inheritance', label: 'Herança de templates', disponivel: true },
  ],
  observabilidade: { status: 'healthy', errorCount: 0, incidentCount: 0 },
  habilitada: true,
  versao: '1.0.0',
};

export function registerCmsCell(): void {
  CellRegistry.register({ contract: cmsCellContract });
}
