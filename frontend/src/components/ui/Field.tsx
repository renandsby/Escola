import { createContext, useContext } from 'react'
import { useFormContext } from 'react-hook-form'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/utils/cn'

/* -------------------------------------------------------------------------- */
/*  Field — wrapper: rótulo, obrigatoriedade, ajuda, erro                      */
/* -------------------------------------------------------------------------- */

export type FieldProps = {
  label: string
  name: string
  required?: boolean
  help?: string
  /** substitui o help. Se ausente, é lido de formState.errors[name] via RHF */
  error?: string
  /** aplica font-mono no controle (códigos oficiais) */
  mono?: boolean
  className?: string
  children: React.ReactNode
}

type FieldCtx = { name: string; hasError: boolean; mono: boolean }
const FieldContext = createContext<FieldCtx | null>(null)

export const useField = () =>
  useContext(FieldContext) ?? { name: '', hasError: false, mono: false }

function useResolvedError(name: string, explicit?: string): string | undefined {
  // useFormContext() devolve null fora de <FormProvider>
  const methods = useFormContext()
  if (explicit) {
    return explicit
  }
  if (!methods) {
    return undefined
  }
  const err = name
    .split('.')
    .reduce<unknown>((acc, k) => (acc as Record<string, unknown> | undefined)?.[k], methods.formState.errors)
  return (err as { message?: string } | undefined)?.message
}

export function Field({ label, name, required, help, error, mono = false, className, children }: FieldProps) {
  const resolved = useResolvedError(name, error)
  const hasError = !!resolved
  const helpId = `${name}-help`

  return (
    <FieldContext.Provider value={{ name, hasError, mono }}>
      <div className={cn('grid gap-1.5', className)}>
        <label htmlFor={name} className="text-label text-ink-700">
          {label}
          {required && (
            <span className="ml-0.5 text-danger-base" aria-hidden>
              *
            </span>
          )}
        </label>
        {children}
        {hasError ? (
          <p className="flex items-center gap-1 text-help text-danger-fg" role="alert">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {resolved}
          </p>
        ) : help ? (
          <p id={helpId} className="text-help text-ink-400">
            {help}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  )
}

/* -------------------------------------------------------------------------- */
/*  Controles — herdam name/erro/mono do <Field>                              */
/* -------------------------------------------------------------------------- */

// estado → classes
const CONTROL_BASE =
  'h-control w-full rounded border border-line-strong bg-white px-3 text-base ' +
  'focus:ring-[3px] focus:ring-brand-400/35 focus:border-brand-400 focus:outline-none ' +
  'read-only:bg-surface-subtle ' +
  'disabled:bg-surface-subtle disabled:text-ink-400 disabled:cursor-not-allowed'
const CONTROL_ERROR = 'border-danger-base bg-danger-bg/40'

function useControlProps(explicitName?: string) {
  const f = useField()
  const name = explicitName ?? f.name
  return {
    id: name,
    name,
    'aria-invalid': f.hasError || undefined,
    className: cn(CONTROL_BASE, f.hasError && CONTROL_ERROR, f.mono && 'font-mono'),
  }
}

export function Input({
  className,
  name,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { name?: string }) {
  const base = useControlProps(name)
  return <input {...base} {...props} className={cn(base.className, className)} />
}

export function Select({
  className,
  name,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { name?: string }) {
  const base = useControlProps(name)
  return (
    <select {...base} {...props} className={cn(base.className, className)}>
      {children}
    </select>
  )
}

export function Textarea({
  className,
  name,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { name?: string }) {
  const base = useControlProps(name)
  return (
    <textarea
      {...base}
      {...props}
      className={cn(base.className, 'h-auto min-h-[88px] py-2', className)}
    />
  )
}

export function Checkbox({
  label,
  className,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn('flex min-h-control items-center gap-2 text-base text-ink-700', className)}>
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-line-strong text-brand-600 focus:ring-[3px] focus:ring-brand-400/35"
        {...props}
      />
      {label}
    </label>
  )
}

/* SegmentedControl — substitui <select> quando há 2–4 opções curtas */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div
      role="radiogroup"
      className={cn(
        'inline-flex h-control rounded border border-line-strong bg-white p-1',
        className
      )}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded px-3 text-label transition-colors',
            value === opt.value
              ? 'bg-brand-600 text-white'
              : 'text-ink-500 hover:bg-surface-subtle'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
