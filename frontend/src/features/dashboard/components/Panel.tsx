import { Link } from 'react-router-dom'
import { cn } from '@/utils/cn'

/** Painel branco padrão do dashboard (DS: bg-white border border-line rounded-lg). */
export function Panel({
  title,
  description,
  right,
  id,
  children,
  footer,
  className,
}: {
  title: string
  description?: string
  right?: React.ReactNode
  id?: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}) {
  return (
    <section id={id} className={cn('overflow-hidden rounded-lg border border-line bg-white', className)}>
      <div className="flex flex-wrap items-baseline gap-3 border-b border-line-soft px-[18px] py-4">
        <div>
          <h2 className="text-section text-ink-900">{title}</h2>
          {description && <p className="mt-1 text-help text-ink-400">{description}</p>}
        </div>
        {right && <div className="ml-auto flex items-center gap-3">{right}</div>}
      </div>
      {children}
      {footer && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line-soft bg-surface-subtle px-[18px] py-3 text-help text-ink-500">
          {footer}
        </div>
      )}
    </section>
  )
}

export function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="ml-auto font-semibold hover:no-underline">
      {children}
    </Link>
  )
}
