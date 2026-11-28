// src/core/shell/useNavigation.ts
// Hook de navegação Database-Driven: carrega ui_navigation_items do banco (RLS),
// escopa pelo contexto ativo (tenant) e filtra por permissão efetiva do usuário.
// Estados loading/empty/error honestos — sem catálogo hardcoded, sem mock.
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useActiveContext } from '../context/ContextProvider';
import { listarNavegacao, hasPermission, type NavItemRow } from '../../services/navigationService';

export interface UseNavigationResult {
  items: NavItemRow[];
  loading: boolean;
  error: string;
}

export function useNavigation(): UseNavigationResult {
  const { user } = useAuth();
  const { active } = useActiveContext();
  const tenantId = active?.tenantId ?? null;
  const permissions = user?.permissions ?? [];

  const [items, setItems] = useState<NavItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    listarNavegacao(tenantId)
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar a navegação.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const visible = useMemo(
    () => items.filter((it) => hasPermission(permissions, it.required_permissions)),
    [items, permissions],
  );

  return { items: visible, loading, error };
}