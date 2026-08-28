import { cn } from '@/utils/cn'

/** Skeleton com a forma da lista final — proibido spinner centralizado em página. */
export function TableSkeleton({ rows = 8, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line" aria-hidden>
      <div className="h-row bg-surface-subtle" />
      <div className="divide-y divide-line-soft">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex h-row items-center gap-4 px-4">
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className={cn(
                  'h-3 animate-pulse rounded bg-line',
                  c === 0 ? 'w-16' : c === cols - 1 ? 'ml-auto w-20' : 'w-32'
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
