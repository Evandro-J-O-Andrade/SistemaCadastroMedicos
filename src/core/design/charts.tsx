// src/core/design/charts.tsx
// F3 — Gráficos Enterprise (Recharts) com dados REAIS, tema dark/light, skeleton e vazio.
// Drill-down via onSliceClick. Sem mock: quem passa os dados é o caller (Supabase/analytics).
import React from 'react';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { useTheme } from '../theme/ThemeProvider';
import { COLORS } from '../../components/ui/designTokens';
import { Skeleton } from './feedback';

export interface SeriesDef {
  key: string;
  label: string;
  color?: string;
}

/** Paleta de séries adaptada ao tema (Navy/Azul/Teal + apoio). */
export function useChartPalette(): string[] {
  const { theme } = useTheme();
  return theme === 'dark'
    ? [COLORS.tealHover, COLORS.accentHover, '#7c9cc4', '#5ec9bf', '#c2d3e8']
    : [COLORS.teal, COLORS.accent, COLORS.navy, '#5aa3d6', '#94a3b8'];
}

/* ----------------------------- ChartCard ----------------------------- */
export function ChartCard({
  title,
  subtitle,
  action,
  loading,
  empty,
  height = 280,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  loading?: boolean;
  empty?: boolean;
  height?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {loading ? (
        <div style={{ height }}>
          <Skeleton className="h-full w-full" />
        </div>
      ) : empty ? (
        <div style={{ height }} className="flex flex-col items-center justify-center gap-2 text-center text-ink-muted">
          <BarChart3 className="h-8 w-8" />
          <p className="text-sm">Sem dados para o período/filtros atuais.</p>
        </div>
      ) : (
        <div style={{ width: '100%', height }}>{children}</div>
      )}
    </div>
  );
}

interface BaseProps {
  data: Array<Record<string, unknown>>;
  xKey: string;
  series: SeriesDef[];
  height?: number;
  onSliceClick?: (payload: Record<string, unknown>) => void;
}

function useAxis() {
  const { theme } = useTheme();
  const c = theme === 'dark' ? COLORS.textMutedDark : COLORS.textMuted;
  const grid = theme === 'dark' ? COLORS.borderDark : COLORS.border;
  return { tick: { fill: c, fontSize: 12 }, axisLine: { stroke: grid }, tickLine: false, grid };
}

function colorOf(def: SeriesDef, i: number, palette: string[]): string {
  return def.color ?? palette[i % palette.length];
}

/* ----------------------------- Trend (linha/área) ----------------------------- */
export function TrendChart({ data, xKey, series, height = 280, onSliceClick, kind = 'line' }: BaseProps & { kind?: 'line' | 'area' }) {
  const palette = useChartPalette();
  const axis = useAxis();
  return (
    <ResponsiveContainer width="100%" height={height}>
      {kind === 'area' ? (
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colorOf(s, i, palette)} stopOpacity={0.35} />
                <stop offset="100%" stopColor={colorOf(s, i, palette)} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke={axis.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={xKey} tick={axis.tick} axisLine={axis.axisLine} tickLine={axis.tickLine} />
          <YAxis tick={axis.tick} axisLine={false} tickLine={axis.tickLine} width={40} />
          <RTooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {series.map((s, i) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={colorOf(s, i, palette)}
              fill={`url(#grad-${s.key})`}
              strokeWidth={2}
              onClick={(p) => onSliceClick?.(p as unknown as Record<string, unknown>)}
            />
          ))}
        </AreaChart>
      ) : (
        <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid stroke={axis.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={xKey} tick={axis.tick} axisLine={axis.axisLine} tickLine={axis.tickLine} />
          <YAxis tick={axis.tick} axisLine={false} tickLine={axis.tickLine} width={40} />
          <RTooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={colorOf(s, i, palette)}
              strokeWidth={2}
              dot={false}
              onClick={(p) => onSliceClick?.(p as unknown as Record<string, unknown>)}
            />
          ))}
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}

/* ----------------------------- Barras ----------------------------- */
export function BarsChart({ data, xKey, series, height = 280, onSliceClick, stacked = false }: BaseProps & { stacked?: boolean }) {
  const palette = useChartPalette();
  const axis = useAxis();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={axis.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} tick={axis.tick} axisLine={axis.axisLine} tickLine={axis.tickLine} />
        <YAxis tick={axis.tick} axisLine={false} tickLine={axis.tickLine} width={40} />
        <RTooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, fontSize: 12 }} cursor={{ fill: 'var(--color-surface-2)', opacity: 0.5 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={colorOf(s, i, palette)}
            radius={[6, 6, 0, 0]}
            stackId={stacked ? 'a' : undefined}
            onClick={(p) => onSliceClick?.(p as unknown as Record<string, unknown>)}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ----------------------------- Donut ----------------------------- */
export interface DonutDatum {
  name: string;
  value: number;
}
export function DonutChart({
  data,
  height = 280,
  colors,
  onSliceClick,
}: {
  data: DonutDatum[];
  height?: number;
  colors?: string[];
  onSliceClick?: (payload: DonutDatum) => void;
}) {
  const palette = useChartPalette();
  const cols = colors ?? palette;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="55%"
          outerRadius="85%"
          paddingAngle={2}
          onClick={(p) => onSliceClick?.(p as unknown as DonutDatum)}
        >
          {data.map((d, i) => (
            <Cell key={d.name} fill={cols[i % cols.length]} />
          ))}
        </Pie>
        <RTooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}