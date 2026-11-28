// src/core/design/data.tsx
// Data Grid profissional — DataTable + Pagination.
// Ordenação, busca, paginação, seleção e ações; estados loading/empty.
// Acessível (th scope, aria-sort, teclado). Dados vêm do caller (Supabase), nunca mock.
import React, { useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, Inbox } from 'lucide-react';
import { Skeleton } from './feedback';

export interface Column<T> {
  key: string;
  header: string;
  /** Render da célula. */
  render?: (row: T) => React.ReactNode;
  /** Valor para ordenação (default: campo `key` da linha). */
  sortValue?: (row: T) => string | number;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  /** Chave única da linha. */
  rowKey: (row: T) => string;
  /** Busca textual (default: varre valores string das colunas). */
  searchPlaceholder?: string;
  searchable?: boolean;
  /** Seleção múltipla. */
  selectable?: boolean;
  selectedKeys?: string[];
  onSelectedKeysChange?: (keys: string[]) => void;
  /** Ações por linha (menu contextual). */
  rowActions?: (row: T) => React.ReactNode;
  pageSize?: number;
  emptyTitle?: string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  rowKey,
  searchPlaceholder = 'Buscar…',
  searchable = true,
  selectable = false,
  selectedKeys,
  onSelectedKeysChange,
  rowActions,
  pageSize = 10,
  emptyTitle = 'Nenhum registro',
  emptyMessage = 'Não há dados para os filtros atuais.',
  onRowClick,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [internalSel, setInternalSel] = useState<string[]>([]);
  const sel = selectedKeys ?? internalSel;

  const sortValueOf = (col: Column<T>, row: T): string | number => {
    if (col.sortValue) return col.sortValue(row);
    const v = (row as Record<string, unknown>)[col.key];
    return typeof v === 'number' ? v : String(v ?? '');
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return data;
    const q = query.trim().toLowerCase();
    return data.filter((row) =>
      columns.some((c) => sortValueOf(c, row).toString().toLowerCase().includes(q)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, query, columns]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const va = sortValueOf(col, a);
      const vb = sortValueOf(col, b);
      if (va < vb) return sort.dir === 'asc' ? -1 : 1;
      if (va > vb) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (col: Column<T>) => {
    if (col.sortable === false) return;
    setSort((prev) =>
      prev?.key === col.key
        ? prev.dir === 'asc'
          ? { key: col.key, dir: 'desc' }
          : null
        : { key: col.key, dir: 'asc' },
    );
  };

  const allPageSelected = pageRows.length > 0 && pageRows.every((r) => sel.includes(rowKey(r)));
  const toggleSelectAll = () => {
    const keys = pageRows.map(rowKey);
    const next = allPageSelected
      ? sel.filter((k) => !keys.includes(k))
      : Array.from(new Set([...sel, ...keys]));
    (onSelectedKeysChange ?? setInternalSel)(next);
  };
  const toggleSelect = (key: string) => {
    const next = sel.includes(key) ? sel.filter((k) => k !== key) : [...sel, key];
    (onSelectedKeysChange ?? setInternalSel)(next);
  };

  const ariaSort = (col: Column<T>): React.AriaAttributes['aria-sort'] =>
    sort?.key === col.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      {searchable && (
        <div className="border-b border-border p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder={searchPlaceholder}
              className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              {selectable && (
                <th scope="col" className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    aria-label="Selecionar página"
                    checked={allPageSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-border"
                  />
                </th>
              )}
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={ariaSort(c)}
                  className={`px-3 py-2.5 font-semibold ${c.headerClassName ?? ''}`}
                >
                  {c.sortable === false ? (
                    c.header
                  ) : (
                    <button
                      onClick={() => toggleSort(c)}
                      className="inline-flex items-center gap-1 hover:text-ink"
                    >
                      {c.header}
                      {sort?.key === c.key ? (
                        sort.dir === 'asc' ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )
                      ) : (
                        <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                      )}
                    </button>
                  )}
                </th>
              ))}
              {rowActions && <th scope="col" className="w-12 px-3 py-2.5" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)} className="px-3 py-3">
                    <Skeleton className="h-5 w-full" />
                  </td>
                </tr>
              ))
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)} className="px-3 py-16">
                  <div className="flex flex-col items-center gap-2 text-center text-ink-muted">
                    <Inbox className="h-10 w-10" />
                    <p className="text-base font-bold text-ink">{emptyTitle}</p>
                    <p className="text-sm">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              pageRows.map((row) => {
                const key = rowKey(row);
                const isSel = sel.includes(key);
                return (
                  <tr
                    key={key}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={`transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${
                      isSel ? 'bg-info-bg' : 'hover:bg-surface-2'
                    }`}
                  >
                    {selectable && (
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label="Selecionar linha"
                          checked={isSel}
                          onChange={() => toggleSelect(key)}
                          className="h-4 w-4 rounded border-border"
                        />
                      </td>
                    )}
                    {columns.map((c) => (
                      <td key={c.key} className={`px-3 py-2.5 text-ink ${c.className ?? ''}`}>
                        {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
                      </td>
                    ))}
                    {rowActions && (
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        {rowActions(row)}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading && sorted.length > 0 && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          total={sorted.length}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

/* ----------------------------- Pagination ----------------------------- */
export interface PaginationProps {
  page: number;
  totalPages: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, pageSize, total, onPageChange }: PaginationProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-ink-muted sm:flex-row">
      <span>
        {from}–{to} de {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40 hover:bg-surface-2"
        >
          Anterior
        </button>
        <span className="px-2">
          Página {page} de {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40 hover:bg-surface-2"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}