import { cn } from '@/utils/cn'

export type EmptyStateProps = {
  title: string
  description: string
  actions?: React.ReactNode
  className?: string
}

export function EmptyState({ title, description, actions, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'grid justify-items-center gap-2 rounded-lg border border-dashed border-line-strong p-7 text-center',
        className
      )}
    >
      <p className="text-label text-ink-700">{title}</p>
      <p className="max-w-md text-help text-ink-500">{description}</p>
      {actions && <div className="mt-2 flex items-center gap-2">{actions}</div>}
    </div>
  )
}
