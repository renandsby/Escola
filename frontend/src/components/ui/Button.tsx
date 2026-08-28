import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

/** DS "Rede": `primary | secondary | danger | ghost`. Aliases legados aceitos. */
type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type LegacyVariant = 'default' | 'outline' | 'destructive'
type Size = 'md' | 'sm'
type LegacySize = 'default' | 'lg' | 'icon'

export type ButtonProps = {
  variant?: Variant | LegacyVariant
  size?: Size | LegacySize
  /** desabilita e mostra spinner mantendo o texto atual */
  loading?: boolean
  iconLeft?: React.ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>

const VARIANT_ALIAS: Record<LegacyVariant, Variant> = {
  default: 'primary',
  outline: 'secondary',
  destructive: 'danger',
}
const SIZE_ALIAS: Record<LegacySize, Size> = { default: 'md', lg: 'md', icon: 'sm' }

// variant → classes
const VARIANT: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700',
  secondary: 'bg-white text-ink-700 border border-line-strong hover:bg-surface-subtle',
  danger: 'bg-white text-danger-fg border border-danger-border hover:bg-danger-bg',
  ghost: 'bg-transparent text-ink-500 hover:bg-surface-subtle',
}
// size → classes  (md = 44px · sm = 36px, só em linha de tabela)
const SIZE: Record<Size, string> = {
  md: 'h-control px-5',
  sm: 'h-control-sm px-3 text-sm',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, iconLeft, className, children, disabled, ...props },
  ref
) {
  const v: Variant = variant in VARIANT_ALIAS ? VARIANT_ALIAS[variant as LegacyVariant] : (variant as Variant)
  const s: Size = size in SIZE_ALIAS ? SIZE_ALIAS[size as LegacySize] : (size as Size)

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded font-semibold text-label',
        'disabled:opacity-45 disabled:cursor-not-allowed',
        VARIANT[v],
        SIZE[s],
        className
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : iconLeft}
      {children}
    </button>
  )
})
