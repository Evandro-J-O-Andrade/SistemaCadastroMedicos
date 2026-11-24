// Componentes base reutilizáveis — Design System Enterprise
import React from 'react';
import { Loader2, AlertCircle, ShieldAlert, Info } from 'lucide-react';
import { COLORS, TYPOGRAPHY, SPACING, BORDER, SHADOW, getThemeColors } from './designTokens';

interface LoadingProps {
  isDark?: boolean;
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Loading({ isDark = false, message = 'Carregando...', size = 'md' }: LoadingProps) {
  const theme = getThemeColors(isDark);
  const sizes = { sm: 24, md: 36, lg: 48 };
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl,
        color: theme.textMuted,
      }}
    >
      <Loader2 style={{ width: sizes[size], height: sizes[size], color: theme.textMuted, animation: 'spin 1s linear infinite' }} />
      <p style={{ marginTop: SPACING.sm, fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.medium }}>
        {message}
      </p>
    </div>
  );
}

interface EmptyStateProps {
  isDark?: boolean;
  title: string;
  message: string;
  icon?: React.ElementType;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ isDark = false, title, message, icon: Icon = AlertCircle, action }: EmptyStateProps) {
  const theme = getThemeColors(isDark);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xxl,
        color: theme.textMuted,
        textAlign: 'center',
      }}
    >
      <Icon style={{ width: 64, height: 64, color: theme.textMuted, marginBottom: SPACING.md }} />
      <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.bold, color: theme.text }}>
        {title}
      </h3>
      <p style={{ marginTop: SPACING.sm, fontSize: TYPOGRAPHY.fontSize.sm, color: theme.textSecondary }}>
        {message}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            marginTop: SPACING.md,
            padding: `${SPACING.sm} ${SPACING.md}`,
            backgroundColor: COLORS.accent,
            color: '#fff',
            border: 'none',
            borderRadius: BORDER.radius,
            fontSize: TYPOGRAPHY.fontSize.sm,
            fontWeight: TYPOGRAPHY.fontWeight.semibold,
            cursor: 'pointer',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

interface ErrorStateProps {
  isDark?: boolean;
  title: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ isDark = false, title, message, onRetry }: ErrorStateProps) {
  const theme = getThemeColors(isDark);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xxl,
        color: theme.textMuted,
        textAlign: 'center',
      }}
    >
      <AlertCircle style={{ width: 64, height: 64, color: COLORS.error, marginBottom: SPACING.md }} />
      <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.bold, color: theme.text }}>
        {title}
      </h3>
      <p style={{ marginTop: SPACING.sm, fontSize: TYPOGRAPHY.fontSize.sm, color: theme.textSecondary }}>
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginTop: SPACING.md,
            padding: `${SPACING.sm} ${SPACING.md}`,
            backgroundColor: 'transparent',
            color: COLORS.error,
            border: `1px solid ${COLORS.error}`,
            borderRadius: BORDER.radius,
            fontSize: TYPOGRAPHY.fontSize.sm,
            fontWeight: TYPOGRAPHY.fontWeight.semibold,
            cursor: 'pointer',
          }}
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}

interface UnavailableStateProps {
  isDark?: boolean;
  title: string;
  message: string;
  icon?: React.ElementType;
}

export function UnavailableState({ isDark = false, title, message, icon: Icon = ShieldAlert }: UnavailableStateProps) {
  const theme = getThemeColors(isDark);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xxl,
        color: theme.textMuted,
        textAlign: 'center',
      }}
    >
      <Icon style={{ width: 64, height: 64, color: COLORS.warning, marginBottom: SPACING.md }} />
      <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.bold, color: theme.text }}>
        {title}
      </h3>
      <p style={{ marginTop: SPACING.sm, fontSize: TYPOGRAPHY.fontSize.sm, color: theme.textSecondary }}>
        {message}
      </p>
    </div>
  );
}

interface CardProps {
  children: React.ReactNode;
  isDark?: boolean;
  padding?: string;
}

export function Card({ children, isDark = false, padding = SPACING.lg }: CardProps) {
  const theme = getThemeColors(isDark);
  return (
    <div
      style={{
        backgroundColor: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: BORDER.radiusLg,
        padding,
        boxShadow: SHADOW.sm,
      }}
    >
      {children}
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  isDark?: boolean;
}

export function SectionHeader({ title, subtitle, isDark = false }: SectionHeaderProps) {
  const theme = getThemeColors(isDark);
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.lg,
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: TYPOGRAPHY.fontSize.xxl,
            fontWeight: TYPOGRAPHY.fontWeight.bold,
            color: theme.text,
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p style={{ marginTop: SPACING.xs, fontSize: TYPOGRAPHY.fontSize.sm, color: theme.textMuted }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  isDark?: boolean;
}

export function KpiCard({ label, value, change, trend = 'neutral', isDark = false }: KpiCardProps) {
  const theme = getThemeColors(isDark);
  const trendColors = { up: COLORS.success, down: COLORS.error, neutral: COLORS.textMuted };
  return (
    <Card isDark={isDark} padding={SPACING.lg}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.sm, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {label}
          </p>
          <p style={{ marginTop: SPACING.xs, fontSize: TYPOGRAPHY.fontSize.xxl, fontWeight: TYPOGRAPHY.fontWeight.bold, color: theme.text }}>
            {value}
          </p>
          {change && (
            <p
              style={{
                marginTop: SPACING.xs,
                fontSize: TYPOGRAPHY.fontSize.sm,
                fontWeight: TYPOGRAPHY.fontWeight.medium,
                color: trendColors[trend],
              }}
            >
              {change}
            </p>
          )}
        </div>
        <Info style={{ width: 24, height: 24, color: theme.textMuted }} />
      </div>
    </Card>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  variant: 'default' | 'success' | 'warning' | 'error' | 'info';
  isDark?: boolean;
}

export function Badge({ children, variant = 'default', isDark = false }: BadgeProps) {
  const theme = getThemeColors(isDark);
  const variants: Record<string, { bg: string; color: string }> = {
    default: { bg: '#e2e8f0', color: theme.textMuted },
    success: { bg: COLORS.successBg, color: COLORS.success },
    warning: { bg: COLORS.warningBg, color: COLORS.warning },
    error: { bg: COLORS.errorBg, color: COLORS.error },
    info: { bg: COLORS.infoBg, color: COLORS.info },
  };
  const v = variants[variant];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: `2px 8px`,
        backgroundColor: v.bg,
        color: v.color,
        fontSize: TYPOGRAPHY.fontSize.xs,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        borderRadius: BORDER.radiusFull,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}
    >
      {children}
    </span>
  );
}

interface TableProps {
  children: React.ReactNode;
  isDark?: boolean;
}

export function Table({ children, isDark = false }: TableProps) {
  const theme = getThemeColors(isDark);
  return (
    <div
      style={{
        overflowX: 'auto',
        border: `1px solid ${theme.border}`,
        borderRadius: BORDER.radiusLg,
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: TYPOGRAPHY.fontSize.sm,
        }}
      >
        {children}
      </table>
    </div>
  );
}

interface TableHeaderProps {
  children: React.ReactNode;
  isDark?: boolean;
}

export function TableHeader({ children, isDark = false }: TableHeaderProps) {
  const theme = getThemeColors(isDark);
  return (
    <thead>
      <tr
        style={{
          backgroundColor: theme.bg === COLORS.bg ? '#f8fafc' : '#0f172a',
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        {children}
      </tr>
    </thead>
  );
}

interface TableRowProps {
  children: React.ReactNode;
  isDark?: boolean;
  highlight?: boolean;
}

export function TableRow({ children, isDark = false, highlight = false }: TableRowProps) {
  const theme = getThemeColors(isDark);
  return (
    <tr
      style={{
        borderBottom: `1px solid ${theme.border}`,
        backgroundColor: highlight ? (theme.bg === COLORS.bg ? '#f1f5f9' : '#1e293b') : 'transparent',
      }}
    >
      {children}
    </tr>
  );
}

interface TableCellProps {
  children: React.ReactNode;
  isDark?: boolean;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
}

export function TableCell({ children, isDark = false, align = 'left', bold = false }: TableCellProps) {
  const theme = getThemeColors(isDark);
  return (
    <td
      style={{
        padding: `${SPACING.md} ${SPACING.lg}`,
        textAlign: align,
        fontWeight: bold ? TYPOGRAPHY.fontWeight.semibold : TYPOGRAPHY.fontWeight.normal,
        color: theme.text,
        fontSize: TYPOGRAPHY.fontSize.sm,
      }}
    >
      {children}
    </td>
  );
}

interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  isDark?: boolean;
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  isDark = false,
}: ButtonProps) {
  const theme = getThemeColors(isDark);
  const styles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: COLORS.accent,
      color: '#fff',
      border: 'none',
    },
    secondary: {
      backgroundColor: 'transparent',
      color: theme.text,
      border: `1px solid ${theme.border}`,
    },
    danger: {
      backgroundColor: COLORS.error,
      color: '#fff',
      border: 'none',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: theme.textMuted,
      border: 'none',
    },
  };
  const s = styles[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...s,
        padding: `${SPACING.sm} ${SPACING.md}`,
        borderRadius: BORDER.radius,
        fontSize: TYPOGRAPHY.fontSize.sm,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background-color 0.2s',
      }}
    >
      {children}
    </button>
  );
}
