// src/core/cells/builtInCells.ts
// CHECK BOULER 24H — Registro das células de domínio (fase CONTRACT).
// Apenas CONTRATOS: capacidades, navegação e dashboard declarados.
// Nenhuma rota nova é criada aqui; as rotas reais já existem e são protegidas
// por ProtectedRoute + RLS. A descoberta não concede acesso.

import { cellRegistry } from './CellRegistry';
import type { CellContract } from './types';

const ADMIN_PERMS = ['root', 'admin'];

const cells: CellContract[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    domain: 'core',
    version: '1.0.0',
    capabilities: [{ key: 'dashboard.read', resource: 'dashboard', actions: ['read'], scope: 'global' }],
    nav: [{ key: 'dashboard.home', label: 'Início', route: '/', icon: 'Home', order: 0, end: true }],
    health: { state: 'healthy' },
  },
  {
    id: 'admin-master',
    name: 'Admin Master',
    domain: 'administracao',
    version: '1.0.0',
    capabilities: [
      { key: 'platform.read', resource: 'platform', actions: ['read'], scope: 'global' },
      { key: 'tenants.manage', resource: 'tenants', actions: ['read', 'create', 'update', 'deactivate'], scope: 'global' },
    ],
    nav: [
      { key: 'admin.dashboard', label: 'Admin Master', route: '/dashboard/admin-master', icon: 'LayoutDashboard', requiredPermissions: ADMIN_PERMS, order: 10 },
      { key: 'admin.tenants', label: 'Tenants', route: '/admin/tenants', icon: 'Building2', requiredPermissions: ADMIN_PERMS, order: 11 },
      { key: 'admin.legal', label: 'Documentos Legais', route: '/admin/documentos-legais', icon: 'FileText', requiredPermissions: ADMIN_PERMS, order: 12 },
    ],
    health: { state: 'healthy' },
  },
  {
    id: 'medicos',
    name: 'Gestão Médica',
    domain: 'gestao_medica',
    version: '1.0.0',
    capabilities: [
      { key: 'medicos.read', resource: 'medicos', actions: ['read'], scope: 'tenant' },
      { key: 'medicos.manage', resource: 'medicos', actions: ['read', 'create', 'update', 'deactivate'], scope: 'unit' },
      { key: 'specialties.read', resource: 'specialties', actions: ['read'], scope: 'tenant' },
    ],
    nav: [{ key: 'medicos.list', label: 'Médicos', route: '/medicos', icon: 'Stethoscope', requiredPermissions: ['medicos.read'], order: 20 }],
    health: { state: 'unknown' },
  },
  {
    id: 'plantoes',
    name: 'Plantões',
    domain: 'operacao',
    version: '1.0.0',
    capabilities: [
      { key: 'plantoes.read', resource: 'plantoes', actions: ['read'], scope: 'unit' },
      { key: 'plantoes.manage', resource: 'plantoes', actions: ['read', 'create', 'update', 'approve'], scope: 'unit' },
    ],
    nav: [{ key: 'plantoes.list', label: 'Plantões', route: '/plantao', icon: 'CalendarClock', requiredPermissions: ['plantoes.read'], order: 30 }],
    health: { state: 'unknown' },
  },
  {
    id: 'producao',
    name: 'Produção Médica',
    domain: 'producao',
    version: '1.0.0',
    capabilities: [
      { key: 'producao.read', resource: 'producao', actions: ['read'], scope: 'unit' },
      { key: 'producao.lancar', resource: 'producao', actions: ['create', 'update'], scope: 'unit' },
    ],
    nav: [{ key: 'producao.list', label: 'Produção', route: '/relatorios', icon: 'BarChart3', requiredPermissions: ['producao.read'], order: 40 }],
    health: { state: 'unknown' },
  },
  {
    id: 'usuarios',
    name: 'Usuários',
    domain: 'administracao',
    version: '1.0.0',
    capabilities: [
      { key: 'usuarios.read', resource: 'usuarios', actions: ['read'], scope: 'tenant' },
      { key: 'usuarios.manage', resource: 'usuarios', actions: ['read', 'create', 'update', 'deactivate'], scope: 'tenant' },
    ],
    nav: [{ key: 'usuarios.list', label: 'Usuários', route: '/cadastro-usuarios', icon: 'UserPlus', requiredPermissions: ['usuarios.read'], order: 50 }],
    health: { state: 'unknown' },
  },
  {
    id: 'relatorios',
    name: 'Central de Relatórios',
    domain: 'inteligencia',
    version: '1.0.0',
    capabilities: [{ key: 'relatorios.read', resource: 'relatorios', actions: ['read', 'export'], scope: 'tenant' }],
    nav: [{ key: 'relatorios.center', label: 'Relatórios', route: '/relatorios', icon: 'BarChart3', requiredPermissions: ['relatorios.read'], order: 60 }],
    health: { state: 'unknown' },
  },
];

/** Registra as células uma única vez (idempotente). */
export function registerBuiltInCells(): void {
  for (const cell of cells) {
    if (!cellRegistry.get(cell.id)) {
      cellRegistry.register(cell);
    }
  }
}