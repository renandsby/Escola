import { cn } from '@/utils/cn'
import { Button } from './Button'
import { TableSkeleton } from './TableSkeleton'

export type Column<T> = {
  key: string
  header: string
  /** 'right' para identificadores e números */
  align?: 'left' | 'right'
  mono?: boolean
  width?: string
  render: (row: T) => React.ReactNode
}

export type DataTableProps<T> = {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  /** aparecem no fim da linha em hover/focus */
  rowActions?: (row: T) => React.ReactNode
  isLoading?: boolean
  empty?: React.ReactNode
  pagination?: {
    page: number
    pageSize: number
    total: number
    onPageChange: (p: number) => void
  }
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  rowActions,
  isLoading,
  empty,
  pagination,
}: DataTableProps<T>) {
  if (isLoading) {
    return <TableSkeleton rows={8} cols={columns.length} />
  }

  if (rows.length === 0 && empty) {
    return <>{empty}</>
  }

  const colCount = columns.length + (rowActions ? 1 : 0)

  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-surface-subtle">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    'px-4 py-2.5 text-label uppercase tracking-wide text-ink-500',
                    col.align === 'right' ? 'text-right' : 'text-left'
                  )}
                >
                  {col.header}
                </th>
              ))}
              {rowActions && <th className="w-24 px-4" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'group h-row',
                  onRowClick && 'cursor-pointer hover:bg-surface-hover'
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 text-base text-ink-700',
                      col.align === 'right' ? 'text-right' : 'text-left',
                      col.mono && 'font-mono tabular-nums'
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
                {rowActions && (
                  <td className="px-4 text-right">
                    <div
                      className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {rowActions(row)}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={colCount} className="px-4 py-8 text-center text-help text-ink-400">
                  Nenhum registro
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination && <Pagination {...pagination} />}
    </div>
  )
}

function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: NonNullable<DataTableProps<unknown>['pagination']>) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const lastPage = Math.max(1, Math.ceil(total / pageSize))
  return (
    <div className="flex items-center justify-between border-t border-line bg-surface-subtle px-4 py-2 text-sm text-ink-500">
      <span className="tabular-nums">
        {from}–{to} de {total}
      </span>
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Anterior
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={page >= lastPage}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
        </Button>
      </div>
    </div>
  )
}
