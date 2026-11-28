// src/core/design/form.tsx
// F2 — Formulários Enterprise: React Hook Form + Zod + @hookform/resolvers.
// Componentes reutilizáveis, acessíveis e integrados ao schema (validação inline,
// loading/erro/sucesso). Persistência é responsabilidade do caller (Supabase); aqui só a UI.
// Sem mock, sem storage. Motion discreto (reduced-motion) nos steps.
import React from 'react';
import {
  useForm,
  Controller,
  type Control,
  type FieldValues,
  type Path,
  type UseFormReturn,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ZodType } from 'zod';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronDown, Loader2, Search, AlertCircle } from 'lucide-react';

/* ----------------------------- helper de form ----------------------------- */
export function useZodForm<T extends FieldValues>(schema: ZodType<T>) {
  return useForm<T>({ resolver: zodResolver(schema), mode: 'onBlur' });
}

/* ----------------------------- FormField ----------------------------- */
export interface FormFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  type?: string;
  hint?: string;
  autoComplete?: string;
  disabled?: boolean;
}

export function FormField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  type = 'text',
  hint,
  autoComplete,
  disabled,
}: FormFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div className="flex flex-col gap-1">
          <label htmlFor={name} className="text-sm font-medium text-ink">
            {label}
          </label>
          <input
            id={name}
            {...field}
            type={type}
            placeholder={placeholder}
            autoComplete={autoComplete}
            disabled={disabled}
            aria-invalid={!!fieldState.error}
            aria-describedby={fieldState.error ? `${name}-err` : hint ? `${name}-hint` : undefined}
            className="h-10 w-full rounded-lg border bg-surface px-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-60 aria-[invalid=true]:border-error border-border focus:border-accent"
          />
          {fieldState.error ? (
            <p id={`${name}-err`} className="flex items-center gap-1 text-xs text-error">
              <AlertCircle className="h-3.5 w-3.5" /> {fieldState.error.message}
            </p>
          ) : hint ? (
            <p id={`${name}-hint`} className="text-xs text-ink-muted">{hint}</p>
          ) : null}
        </div>
      )}
    />
  );
}

/* ----------------------------- SelectField ----------------------------- */
export interface SelectOption {
  value: string;
  label: string;
}
export interface SelectFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  options: SelectOption[];
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
  loading?: boolean;
}

export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  options,
  placeholder = 'Selecione…',
  hint,
  disabled,
  loading,
}: SelectFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div className="flex flex-col gap-1">
          <label htmlFor={name} className="text-sm font-medium text-ink">{label}</label>
          <div className="relative">
            <select
              id={name}
              {...field}
              disabled={disabled || loading}
              aria-invalid={!!fieldState.error}
              className="h-10 w-full appearance-none rounded-lg border border-border bg-surface px-3 pr-9 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-60 aria-[invalid=true]:border-error"
            >
              <option value="">{loading ? 'Carregando…' : placeholder}</option>
              {options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          </div>
          {fieldState.error ? (
            <p className="flex items-center gap-1 text-xs text-error">
              <AlertCircle className="h-3.5 w-3.5" /> {fieldState.error.message}
            </p>
          ) : hint ? (
            <p className="text-xs text-ink-muted">{hint}</p>
          ) : null}
        </div>
      )}
    />
  );
}

/* ----------------------------- DateField ----------------------------- */
export interface DateFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  hint?: string;
  disabled?: boolean;
  max?: string;
  min?: string;
}

export function DateField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  disabled,
  max,
  min,
}: DateFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div className="flex flex-col gap-1">
          <label htmlFor={name} className="text-sm font-medium text-ink">{label}</label>
          <input
            id={name}
            {...field}
            type="date"
            max={max}
            min={min}
            disabled={disabled}
            aria-invalid={!!fieldState.error}
            className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-60 aria-[invalid=true]:border-error"
          />
          {fieldState.error ? (
            <p className="flex items-center gap-1 text-xs text-error">
              <AlertCircle className="h-3.5 w-3.5" /> {fieldState.error.message}
            </p>
          ) : hint ? (
            <p className="text-xs text-ink-muted">{hint}</p>
          ) : null}
        </div>
      )}
    />
  );
}

/* ----------------------------- AutocompleteField ----------------------------- */
export interface AutocompleteOption {
  value: string;
  label: string;
  hint?: string;
}
export interface AutocompleteFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  /** Carrega opções reais (ex.: Supabase) a partir do texto digitado. */
  loadOptions: (query: string) => Promise<AutocompleteOption[]>;
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
  minChars?: number;
}

export function AutocompleteField<T extends FieldValues>({
  control,
  name,
  label,
  loadOptions,
  placeholder = 'Digite para buscar…',
  hint,
  disabled,
  minChars = 2,
}: AutocompleteFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <AutocompleteInner
          id={name}
          label={label}
          value={field.value as string}
          onChange={field.onChange}
          loadOptions={loadOptions}
          placeholder={placeholder}
          hint={hint}
          disabled={disabled}
          minChars={minChars}
          invalid={!!fieldState.error}
          error={fieldState.error?.message}
        />
      )}
    />
  );
}

function AutocompleteInner({
  id,
  label,
  value,
  onChange,
  loadOptions,
  placeholder,
  hint,
  disabled,
  minChars,
  invalid,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  loadOptions: (q: string) => Promise<AutocompleteOption[]>;
  placeholder: string;
  hint?: string;
  disabled?: boolean;
  minChars: number;
  invalid: boolean;
  error?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [options, setOptions] = React.useState<AutocompleteOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const [text, setText] = React.useState('');
  const listId = `${id}-list`;

  React.useEffect(() => {
    let cancelled = false;
    const q = text.trim();
    if (q.length < minChars) {
      setOptions([]);
      return;
    }
    setLoading(true);
    loadOptions(q)
      .then((res) => {
        if (!cancelled) {
          setOptions(res);
          setActive(0);
        }
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [text, minChars, loadOptions]);

  const select = (opt: AutocompleteOption) => {
    onChange(opt.value);
    setText(opt.label);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && options[active]) {
        e.preventDefault();
        select(options[active]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && options[active] ? `${id}-opt-${active}` : undefined}
          aria-invalid={invalid}
          value={text || (typeof value === 'string' ? value : '')}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-60 aria-[invalid=true]:border-error"
        />
        {open && (text.trim().length >= minChars || loading) && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-40 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-border bg-surface p-1 shadow-lg"
          >
            {loading ? (
              <li className="flex items-center gap-2 px-3 py-2 text-sm text-ink-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> Buscando…
              </li>
            ) : options.length === 0 ? (
              <li className="px-3 py-2 text-sm text-ink-muted">Nenhum resultado.</li>
            ) : (
              options.map((o, i) => (
                <li
                  key={o.value}
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    select(o);
                  }}
                  className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm ${
                    i === active ? 'bg-surface-2 text-ink' : 'text-ink-secondary'
                  }`}
                >
                  <span className="truncate">
                    {o.label}
                    {o.hint && <span className="ml-2 text-xs text-ink-muted">{o.hint}</span>}
                  </span>
                  {i === active && <Check className="h-4 w-4 text-teal" />}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      {error ? (
        <p className="flex items-center gap-1 text-xs text-error">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/* ----------------------------- FormSection ----------------------------- */
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <header className="mb-4">
        <h3 className="text-base font-bold text-ink">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/* ----------------------------- FormStepper ----------------------------- */
export interface FormStep<T extends FieldValues> {
  key: string;
  title: string;
  /** Campos validados ao avançar a partir deste passo. */
  fields?: (keyof T)[];
  content: React.ReactNode;
}

export interface FormStepperProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  steps: FormStep<T>[];
  onSubmit: (values: T) => void | Promise<void>;
  submitLabel?: string;
  submitting?: boolean;
}

export function FormStepper<T extends FieldValues>({
  form,
  steps,
  onSubmit,
  submitLabel = 'Salvar',
  submitting = false,
}: FormStepperProps<T>) {
  const [index, setIndex] = React.useState(0);
  const reduce = useReducedMotion();
  const step = steps[index];
  const isLast = index === steps.length - 1;

  const next = async () => {
    const fields = step.fields ?? [];
    const ok = fields.length === 0 ? true : await form.trigger(fields as Path<T>[], { shouldFocus: true });
    if (ok) setIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const submit = form.handleSubmit(onSubmit);

  return (
    <div className="flex flex-col gap-5">
      {/* Indicador de passos */}
      <ol className="flex items-center gap-2">
        {steps.map((s, i) => {
          const state = i < index ? 'done' : i === index ? 'active' : 'todo';
          return (
            <li key={s.key} className="flex flex-1 items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  state === 'done'
                    ? 'bg-teal text-white'
                    : state === 'active'
                      ? 'bg-accent text-white'
                      : 'bg-surface-2 text-ink-muted'
                }`}
              >
                {state === 'done' ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className={`hidden truncate text-sm sm:block ${state === 'todo' ? 'text-ink-muted' : 'text-ink'}`}>
                {s.title}
              </span>
              {i < steps.length - 1 && <span className="h-px flex-1 bg-border" />}
            </li>
          );
        })}
      </ol>

      {/* Conteúdo do passo */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.key}
          initial={reduce ? false : { opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, x: -12 }}
          transition={{ duration: reduce ? 0 : 0.16 }}
        >
          {step.content}
        </motion.div>
      </AnimatePresence>

      {/* Ações */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(i - 1, 0))}
          disabled={index === 0 || submitting}
          className="h-10 rounded-lg border border-border px-4 text-sm font-medium text-ink hover:bg-surface-2 disabled:opacity-40"
        >
          Voltar
        </button>
        {isLast ? (
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void next()}
            className="h-10 rounded-lg bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            Avançar
          </button>
        )}
      </div>
    </div>
  );
}