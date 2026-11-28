// src/core/design/ui.tsx
// Design System Enterprise — Gestão Médica.
// Componentes base com Tailwind + tokens semânticos (dark/light via classe .dark).
// Hierarquia de CTA: primary (Navy/Azul), secondary (contorno), ghost, danger.
// Estados: loading, vazio, erro, sucesso. Sem emojis; ícones Lucide.
import React from 'react';
import { Loader2, AlertCircle, ShieldAlert, CheckCircle2, type LucideIcon } from 'lucide-react';

/* ----------------------------- Botões ----------------------------- */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-white hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50',
  secondary:
    'border border-border bg-surface text-ink hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent/30 disabled:opacity-50',
  ghost:
    'text-ink-secondary hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent/20 disabled:opacity-50',
  danger:
    'bg-error text-white hover:opacity-90 focus-visible:ring-2 focus-visible:ring-error/40 disabled:opacity-50',
};
const BTN_SIZE: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: LucideIcon;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  disabled,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-lg font-semibold transition-colors focus:outline-none disabled:cursor-not-allowed ${BTN_VARIANT[variant]} ${BTN_SIZE[size]} ${className}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

/* ----------------------------- Superfícies ----------------------------- */
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-surface shadow-sm ${className}`}>{children}</div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ----------------------------- Badge ----------------------------- */
type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'teal';
const BADGE: Record<BadgeVariant, string> = {
  default: 'bg-surface-2 text-ink-muted',
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  error: 'bg-error-bg text-error',
  info: 'bg-info-bg text-info',
  teal: 'bg-teal/10 text-teal',
};
export function Badge({
  children,
  variant = 'default',
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${BADGE[variant]}`}
    >
      {children}
    </span>
  );
}

/* ----------------------------- Estados ----------------------------- */
export function Spinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-3 py-16 text-ink-muted">
      <Loader2 className="h-8 w-8 animate-spin" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

export function EmptyState({
  icon: Icon = AlertCircle,
  title,
  message,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-ink-muted">
      <Icon className="h-12 w-12" />
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      <p className="max-w-md text-sm">{message}</p>
      {action}
    </div>
  );
}

export function ErrorState({
  title = 'Algo deu errado',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-ink-muted">
      <AlertCircle className="h-12 w-12 text-error" />
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      <p className="max-w-md text-sm">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-1">
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

export function UnavailableState({
  icon: Icon = ShieldAlert,
  title,
  message,
}: {
  icon?: LucideIcon;
  title: string;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-ink-muted">
      <Icon className="h-12 w-12 text-warning" />
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      <p className="max-w-md text-sm">{message}</p>
    </div>
  );
}

export function SuccessBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success-bg px-4 py-3 text-sm text-success">
      <CheckCircle2 className="h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

/* ----------------------------- Formulário ----------------------------- */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-error">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export const inputClass =
  'h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30';