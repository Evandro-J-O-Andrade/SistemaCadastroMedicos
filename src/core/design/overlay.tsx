// src/core/design/overlay.tsx
// Primitivos de sobreposição — Modal, Drawer, Tooltip, Popover.
// Acessíveis: focus trap, ESC, restore de foco, ARIA, scroll lock.
// Motion via framer-motion respeitando prefers-reduced-motion. Ícones Lucide.
import React, { useEffect, useRef, useId, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

/* ----------------------------- hooks internos ----------------------------- */
function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);
}

function useFocusTrap(active: boolean, ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = () =>
      node
        ? Array.from(
            node.querySelectorAll<HTMLElement>(
              'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])',
            ),
          ).filter((el) => el.offsetParent !== null)
        : [];
    (focusables()[0] ?? node)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      previouslyFocused?.focus?.();
    };
  }, [active, ref, onClose]);
}

/* ----------------------------- Modal ----------------------------- */
export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  closeLabel?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeLabel = 'Fechar',
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const reduce = useReducedMotion();
  useScrollLock(open);
  useFocusTrap(open, panelRef, onClose);
  if (typeof document === 'undefined') return null;

  const width = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }[size];

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.15 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            initial={reduce ? false : { opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: reduce ? 0 : 0.18 }}
            className={`relative z-10 w-full ${width} rounded-2xl border border-border bg-surface shadow-xl focus:outline-none`}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border p-5">
              <div>
                {title && <h2 id={titleId} className="text-lg font-bold text-ink">{title}</h2>}
                {description && <p id={descId} className="mt-1 text-sm text-ink-muted">{description}</p>}
              </div>
              <button
                onClick={onClose}
                aria-label={closeLabel}
                className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-2 hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-border p-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* ----------------------------- Drawer ----------------------------- */
export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  side?: 'left' | 'right';
  width?: string;
  closeLabel?: string;
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  side = 'right',
  width = 'w-[360px]',
  closeLabel = 'Fechar',
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const reduce = useReducedMotion();
  useScrollLock(open);
  useFocusTrap(open, panelRef, onClose);
  if (typeof document === 'undefined') return null;

  const from = side === 'right' ? { x: '100%' } : { x: '-100%' };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.15 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            initial={reduce ? false : from}
            animate={{ x: 0 }}
            exit={reduce ? { opacity: 0 } : from}
            transition={{ type: 'tween', duration: reduce ? 0 : 0.22 }}
            className={`absolute ${side === 'right' ? 'right-0' : 'left-0'} top-0 h-full ${width} border-border bg-surface shadow-xl focus:outline-none ${
              side === 'right' ? 'border-l' : 'border-r'
            }`}
          >
            <div className="flex items-center justify-between border-b border-border p-4">
              {title && <h2 id={titleId} className="text-base font-bold text-ink">{title}</h2>}
              <button
                onClick={onClose}
                aria-label={closeLabel}
                className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-2 hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="h-[calc(100%-3.5rem)] overflow-y-auto p-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* ----------------------------- Tooltip ----------------------------- */
export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const pos = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[side];

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span aria-describedby={open ? id : undefined} className="inline-flex">
        {children}
      </span>
      {open && (
        <span
          role="tooltip"
          id={id}
          className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-navy px-2 py-1 text-xs font-medium text-white shadow-md ${pos}`}
        >
          {content}
        </span>
      )}
    </span>
  );
}

/* ----------------------------- Popover ----------------------------- */
export interface PopoverProps {
  trigger: (props: { open: boolean; toggle: () => void }) => React.ReactNode;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  align?: 'start' | 'end';
  className?: string;
}

export function Popover({ trigger, children, align = 'start', className = '' }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((p) => !p), []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  return (
    <div ref={ref} className="relative inline-block">
      {trigger({ open, toggle })}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className={`absolute z-50 mt-2 min-w-[12rem] overflow-hidden rounded-xl border border-border bg-surface shadow-lg ${
              align === 'end' ? 'right-0' : 'left-0'
            } ${className}`}
          >
            {typeof children === 'function' ? children(close) : children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}