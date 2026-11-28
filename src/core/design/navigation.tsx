// src/core/design/navigation.tsx
// Primitivos de navegação — Tabs e Accordion.
// Acessíveis (roles/aria, teclado) e com motion discreto (reduced-motion).
import React, { useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

/* ----------------------------- Tabs ----------------------------- */
export interface TabItem {
  key: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  content: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (key: string) => void;
}

export function Tabs({ items, defaultValue, value, onValueChange }: TabsProps) {
  const [internal, setInternal] = useState(defaultValue ?? items[0]?.key ?? '');
  const active = value ?? internal;
  const baseId = useId();

  const select = (key: string) => {
    if (value === undefined) setInternal(key);
    onValueChange?.(key);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const enabled = items.filter((i) => !i.disabled);
    const idx = enabled.findIndex((i) => i.key === active);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const next = enabled[(idx + dir + enabled.length) % enabled.length];
      if (next) select(next.key);
    }
  };

  return (
    <div>
      <div role="tablist" onKeyDown={onKeyDown} className="flex gap-1 overflow-x-auto border-b border-border">
        {items.map((it) => {
          const isActive = it.key === active;
          const Icon = it.icon;
          return (
            <button
              key={it.key}
              role="tab"
              id={`${baseId}-tab-${it.key}`}
              aria-selected={isActive}
              aria-controls={`${baseId}-panel-${it.key}`}
              tabIndex={isActive ? 0 : -1}
              disabled={it.disabled}
              onClick={() => select(it.key)}
              className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-40 ${
                isActive
                  ? 'border-accent text-ink'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {it.label}
            </button>
          );
        })}
      </div>
      {items.map((it) =>
        it.key === active ? (
          <div
            key={it.key}
            role="tabpanel"
            id={`${baseId}-panel-${it.key}`}
            aria-labelledby={`${baseId}-tab-${it.key}`}
            tabIndex={0}
            className="pt-4 focus:outline-none"
          >
            {it.content}
          </div>
        ) : null,
      )}
    </div>
  );
}

/* ----------------------------- Accordion ----------------------------- */
export interface AccordionItem {
  key: string;
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
}

export interface AccordionProps {
  items: AccordionItem[];
  /** Permitir múltiplos abertos. */
  multiple?: boolean;
  defaultOpen?: string[];
}

export function Accordion({ items, multiple = false, defaultOpen = [] }: AccordionProps) {
  const [open, setOpen] = useState<string[]>(defaultOpen);
  const reduce = useReducedMotion();
  const baseId = useId();

  const toggle = (key: string) => {
    setOpen((prev) => {
      const has = prev.includes(key);
      if (multiple) return has ? prev.filter((k) => k !== key) : [...prev, key];
      return has ? [] : [key];
    });
  };

  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
      {items.map((it) => {
        const isOpen = open.includes(it.key);
        const Icon = it.icon;
        return (
          <div key={it.key}>
            <h3>
              <button
                onClick={() => toggle(it.key)}
                aria-expanded={isOpen}
                aria-controls={`${baseId}-acc-${it.key}`}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-ink hover:bg-surface-2"
              >
                {Icon && <Icon className="h-4 w-4 text-teal" />}
                <span className="flex-1">{it.title}</span>
                <ChevronDown
                  className={`h-4 w-4 text-ink-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`${baseId}-acc-${it.key}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: reduce ? 0 : 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 text-sm text-ink-secondary">{it.content}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}