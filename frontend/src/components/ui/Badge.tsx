import { cn } from '@/utils/cn'

export type BadgeProps = {
  tone: 'brand' | 'ok' | 'warn' | 'danger' | 'qual' | 'neutral'
  /** redundância não-cromática — estado nunca é só cor. default 'dot' */
  shape?: 'dot' | 'square' | 'diamond'
  children: React.ReactNode
  className?: string
}

// tone → classes (fundo + texto + marcador)
const TONE: Record<BadgeProps['tone'], { chip: string; marker: string }> = {
  brand: { chip: 'bg-brand-50 text-brand-700', marker: 'bg-brand-600' },
  ok: { chip: 'bg-ok-bg text-ok-fg', marker: 'bg-ok-base' },
  warn: { chip: 'bg-warn-bg text-warn-fg', marker: 'bg-warn-base' },
  danger: { chip: 'bg-danger-bg text-danger-fg', marker: 'bg-danger-base' },
  qual: { chip: 'bg-qual-bg text-qual-fg', marker: 'bg-qual-base' },
  neutral: { chip: 'bg-surface-subtle text-ink-500', marker: 'bg-ink-400' },
}

const SHAPE: Record<NonNullable<BadgeProps['shape']>, string> = {
  dot: 'rounded-pill',
  square: '',
  diamond: 'rotate-45',
}

export function Badge({ tone, shape = 'dot', children, className }: BadgeProps) {
  const t = TONE[tone]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-help font-semibold',
        t.chip,
        className
      )}
    >
      <span
        aria-hidden
        className={cn('h-[7px] w-[7px] shrink-0', t.marker, SHAPE[shape])}
      />
      {children}
    </span>
  )
}
