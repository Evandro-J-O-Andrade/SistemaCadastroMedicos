// src/core/design/feedback.tsx
// Feedback — Toast (provider + hook), Skeleton, Progress.
// Toasts: filas, auto-dismiss, pausa no hover, acessível (aria-live), reduced-motion.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X, type LucideIcon } from 'lucide-react';

/* ----------------------------- Toast ----------------------------- */
type ToastVariant = 'success' | 'error' | 'info' | 'warning';
export interface Toast {
  id: string;
  variant: ToastVariant;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (t: Omit<Toast, 'id'>) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_STYLE: Record<ToastVariant, { icon: LucideIcon; ring: string }> = {
  success: { icon: CheckCircle2, ring: 'text-success' },
  error: { icon: AlertCircle, ring: 'text-error' },
  info: { icon: Info, ring: 'text-info' },
  warning: { icon: AlertTriangle, ring: 'text-warning' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const reduce = useReducedMotion();

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { ...t, id }]);
  }, []);

  const api: ToastContextValue = {
    toast,
    dismiss,
    success: (message, title) => toast({ variant: 'success', message, title }),
    error: (message, title) => toast({ variant: 'error', message, title, duration: 6000 }),
    info: (message, title) => toast({ variant: 'info', message, title }),
    warning: (message, title) => toast({ variant: 'warning', message, title }),
  };

  if (typeof document === 'undefined') return <ToastContext.Provider value={api}>{children}</ToastContext.Provider>;

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div
          className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2"
          role="region"
          aria-label="Notificações"
        >
          <AnimatePresence>
            {toasts.map((t) => (
              <ToastCard key={t.id} toast={t} reduce={!!reduce} onDismiss={() => dismiss(t.id)} />
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

function ToastCard({
  toast,
  reduce,
  onDismiss,
}: {
  toast: Toast;
  reduce: boolean;
  onDismiss: () => void;
}) {
  const { icon: Icon, ring } = TOAST_STYLE[toast.variant];
  const [paused, setPaused] = useState(false);
  const timer = useRef<number | null>(null);
  const duration = toast.duration ?? 4000;

  useEffect(() => {
    if (paused) return;
    timer.current = window.setTimeout(onDismiss, duration);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [paused, duration, onDismiss]);

  return (
    <motion.div
      layout
      initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
      transition={{ duration: reduce ? 0 : 0.18 }}
      role={toast.variant === 'error' ? 'alert' : 'status'}
      aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="pointer-events-auto flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5 shadow-lg"
    >
      <Icon className={`h-5 w-5 shrink-0 ${ring}`} />
      <div className="min-w-0 flex-1">
        {toast.title && <p className="text-sm font-semibold text-ink">{toast.title}</p>}
        <p className="text-sm text-ink-secondary">{toast.message}</p>
      </div>
      <button
        onClick={onDismiss}
        aria-label="Fechar notificação"
        className="rounded p-0.5 text-ink-muted hover:text-ink"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de ToastProvider');
  return ctx;
}

/* ----------------------------- Skeleton ----------------------------- */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-surface-2 ${className}`} aria-hidden />;
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3.5 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <Skeleton className="h-5 w-1/3" />
      <div className="mt-4">
        <SkeletonText lines={3} />
      </div>
    </div>
  );
}

/* ----------------------------- Progress ----------------------------- */
export function Progress({
  value,
  max = 100,
  label,
  className = '',
}: {
  value: number;
  max?: number;
  label?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={className}>
      {label && (
        <div className="mb-1 flex justify-between text-xs text-ink-muted">
          <span>{label}</span>
          <span>{Math.round(pct)}%</span>
        </div>
      )}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className="h-full rounded-full bg-teal transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}