// src/core/design/motion.tsx
// F4 — Motion & microinterações Enterprise. framer-motion, respeitando prefers-reduced-motion.
// Uso: PageTransition (troca de rota), Reveal (entrada), HoverLift (cards).
import React from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';

export { useReducedMotion };

/* ----------------------------- PageTransition ----------------------------- */
/** Transição de entrada/saída de página. `transitionKey` deve mudar por rota (ex.: pathname). */
export function PageTransition({
  transitionKey,
  children,
  className,
}: {
  transitionKey: string;
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      key={transitionKey}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.2, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ----------------------------- Reveal ----------------------------- */
/** Revela o conteúdo suavemente quando entra na viewport (ou imediatamente, sem motion). */
export function Reveal({
  children,
  delay = 0,
  className,
  ...rest
}: { children: React.ReactNode; delay?: number; className?: string } & Omit<HTMLMotionProps<'div'>, 'children'>) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.25, delay, ease: 'easeOut' }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/* ----------------------------- HoverLift ----------------------------- */
/** Eleva o elemento no hover (cards). Sem efeito quando reduced-motion. */
export function HoverLift({ children, className, ...rest }: HTMLMotionProps<'div'>) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      whileHover={reduce ? undefined : { y: -3 }}
      transition={{ type: 'tween', duration: 0.15 }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}