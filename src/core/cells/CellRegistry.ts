// src/core/cells/CellRegistry.ts
// CHECK BOULER 24H — Registro de Células (fase CONTRACT).
// Descobre quais células existem e suas capacidades. NÃO autoriza execução:
// a descoberta apenas filtra o que o contexto pode NAVEGAR; a validade real
// é imposta por RBAC/RLS no backend (fail-closed).

import type {
  CellAccessContext,
  CellContract,
  CellId,
  CellNavItem,
} from './types';

/** Casa uma permissão exigida com as permissões do usuário (suporta coringas). */
export function hasPermission(userPerms: string[], required?: string): boolean {
  if (!required) return true;
  if (userPerms.includes('*.*')) return true;
  if (userPerms.includes(required)) return true;
  const [resource, action] = required.split('.');
  if (action && userPerms.includes(`${resource}.*`)) return true;
  return false;
}

/** Um item de navegação é visível se todas as suas permissões forem satisfeitas. */
export function canSeeNavItem(item: CellNavItem, ctx: CellAccessContext): boolean {
  const req = item.requiredPermissions ?? [];
  return req.every((p) => hasPermission(ctx.permissions, p));
}

export class CellRegistry {
  private cells = new Map<CellId, CellContract>();

  register(cell: CellContract): void {
    if (this.cells.has(cell.id)) {
      throw new Error(`Célula duplicada: ${cell.id}`);
    }
    this.cells.set(cell.id, cell);
  }

  get(id: CellId): CellContract | undefined {
    return this.cells.get(id);
  }

  list(): CellContract[] {
    return [...this.cells.values()];
  }

  /**
   * Descobre células navegáveis para o contexto autorizado.
   * Filtro por capacidade (alguma ação 'read') e por itens de nav visíveis.
   * Não concede permissão — apenas reduz o que é exibido.
   */
  discover(ctx: CellAccessContext): CellContract[] {
    return this.list()
      .filter((cell) => {
        const navVisible = cell.nav.filter((n) => canSeeNavItem(n, ctx));
        if (navVisible.length === 0) return false;
        const canRead = cell.capabilities.some((c) => c.actions.includes('read'));
        return canRead || ctx.isGlobal;
      })
      .map((cell) => ({
        ...cell,
        nav: cell.nav
          .filter((n) => canSeeNavItem(n, ctx))
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      }));
  }

  /** Itens de navegação achatados (para a sidebar), já filtrados por contexto. */
  navFor(ctx: CellAccessContext): CellNavItem[] {
    return this.discover(ctx)
      .flatMap((c) => c.nav)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
}

/** Registro compartilhado da aplicação. */
export const cellRegistry = new CellRegistry();