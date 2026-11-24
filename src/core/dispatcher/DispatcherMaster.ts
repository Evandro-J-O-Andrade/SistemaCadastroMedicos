// DispatcherMaster — roteador por identidade/perfil/permissão
// Implementa default-deny: só permite navegação se a rota estiver no dispatcher por perfil.
// Comunica-se com células via CellRegistry.

import { CellRegistry } from '../cell/CellContract';

export interface DispatcherRoute {
  path: string;
  cellId: string;
  requiredPermissions: string[];
  disponivel: boolean;
  motivoIndisponivel?: string;
}

export interface DispatcherContext {
  isRootGlobal: boolean;
  roles: string[];
  permissions: string[];
  tenantId: string | null;
  unitId: string | null;
}

export function resolveRoutes(ctx: DispatcherContext): DispatcherRoute[] {
  const routes: DispatcherRoute[] = [];

  for (const reg of CellRegistry.getAll()) {
    const contract = reg.contract;
    if (!contract.habilitada) continue;

    for (const nav of contract.navegacao) {
      const hasPermission =
        !nav.requiredPermissions ||
        nav.requiredPermissions.length === 0 ||
        nav.requiredPermissions.every((p) => ctx.permissions.includes(p));

      routes.push({
        path: nav.path,
        cellId: contract.id,
        requiredPermissions: nav.requiredPermissions || [],
        disponivel: nav.disponivel && hasPermission,
        motivoIndisponivel: !hasPermission ? 'sem_permissao' : nav.motivoIndisponivel,
      });
    }
  }

  return routes;
}

export function isRouteAvailable(path: string, ctx: DispatcherContext): boolean {
  const routes = resolveRoutes(ctx);
  const route = routes.find((r) => r.path === path);
  return route?.disponivel ?? false;
}
