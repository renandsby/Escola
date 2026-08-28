import { useCallback, useEffect, useMemo, useRef } from 'react'
import { AlertTriangle, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { cn } from '@/utils/cn'

/* -------------------------------------------------------------------------- */
/*  BatchGrid — lançamento em lote (notas, frequência…) — §7.3 do DS          */
/* -------------------------------------------------------------------------- */

export type BatchCellValues = Record<string, Record<string, string>>

export type BatchOption = {
  value: string
  label: string
  /** classe do botão quando ativo */
  activeClass?: string
}

export type BatchColumn<Row> = {
  key: string
  header: string
  kind: 'number' | 'segment'
  width?: string
  /** number */
  min?: number
  max?: number
  step?: number
  /** segment */
  options?: BatchOption[]
  /** devolve mensagem de erro ou undefined */
  validate?: (value: string, row: Row) => string | undefined
}

export type CellState = 'pristine' | 'dirty' | 'invalid' | 'saved'

export type BatchGridProps<Row> = {
  rows: Row[]
  rowKey: (row: Row) => string
  rowLabel: (row: Row) => string
  columns: BatchColumn<Row>[]
  values: BatchCellValues
  /** valores como vieram do servidor — base para calcular "dirty"/"saved" */
  baseline: BatchCellValues
  onChange: (rowKey: string, colKey: string, value: string) => void
  onSave: () => void
  onCancel?: () => void
  saving?: boolean
  isLoading?: boolean
  emptyLabel?: string
  /** prazo de lançamento */
  deadline?: { label: string; overdue?: boolean }
  /** ações de preenchimento rápido (ex.: "Marcar todos presentes") */
  bulkActions?: React.ReactNode
}

const cell = (v: BatchCellValues, r: string, c: string) => v[r]?.[c] ?? ''

export function cellState<Row>(
  col: BatchColumn<Row>,
  row: Row,
  current: string,
  base: string
): CellState {
  const err = col.validate?.(current, row)
  if (err) {return 'invalid'}
  if (current !== base) {return 'dirty'}
  if (current.trim() !== '') {return 'saved'}
  return 'pristine'
}

export function countDirty<Row>(
  columns: BatchColumn<Row>[],
  rows: Row[],
  rowKey: (r: Row) => string,
  values: BatchCellValues,
  baseline: BatchCellValues
) {
  let dirty = 0
  let invalid = 0
  for (const row of rows) {
    const rk = rowKey(row)
    for (const col of columns) {
      const cur = cell(values, rk, col.key)
      const base = cell(baseline, rk, col.key)
      const st = cellState(col, row, cur, base)
      if (st === 'dirty') {dirty += 1}
      if (st === 'invalid') {invalid += 1}
    }
  }
  return { dirty, invalid }
}

export function BatchGrid<Row>({
  rows,
  rowKey,
  rowLabel,
  columns,
  values,
  baseline,
  onChange,
  onSave,
  onCancel,
  saving,
  isLoading,
  emptyLabel = 'Nenhum aluno matriculado nesta turma.',
  deadline,
  bulkActions,
}: BatchGridProps<Row>) {
  const numberCols = useMemo(
    () => columns.filter((c) => c.kind === 'number').map((c) => c.key),
    [columns]
  )
  // matriz de refs só para inputs de número (navegação por setas)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const refKey = (r: number, c: number) => `${r}:${c}`

  const { dirty, invalid } = useMemo(
    () => countDirty(columns, rows, rowKey, values, baseline),
    [columns, rows, rowKey, values, baseline]
  )

  // guarda de saída com alterações não salvas
  useEffect(() => {
    if (dirty === 0) {return}
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const handleKeyNav = useCallback(
    (e: React.KeyboardEvent, rowIdx: number, colIdx: number) => {
      const move = (dr: number, dc: number) => {
        const target = inputRefs.current[refKey(rowIdx + dr, colIdx + dc)]
        if (target) {
          e.preventDefault()
          target.focus()
          target.select()
        }
      }
      if (e.key === 'ArrowDown' || e.key === 'Enter') {move(1, 0)}
      else if (e.key === 'ArrowUp') {move(-1, 0)}
      else if (e.key === 'ArrowRight' && (e.target as HTMLInputElement).selectionStart === (e.target as HTMLInputElement).value.length)
        {move(0, 1)}
      else if (e.key === 'ArrowLeft' && (e.target as HTMLInputElement).selectionStart === 0)
        {move(0, -1)}
    },
    []
  )

  if (isLoading) {
    return <TableSkeleton rows={6} cols={columns.length + 1} />
  }

  if (rows.length === 0) {
    return <EmptyState title="Sem alunos" description={emptyLabel} />
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-help text-ink-500">
          <span className="tabular-nums">{rows.length} alunos</span>
          {dirty > 0 && (
            <span className="tabular-nums text-brand-700">· {dirty} alteração(ões) não salva(s)</span>
          )}
          {invalid > 0 && (
            <span className="inline-flex items-center gap-1 text-danger-fg">
              <AlertTriangle className="h-3.5 w-3.5" />
              {invalid} inválida(s)
            </span>
          )}
          {deadline && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-help font-semibold',
                deadline.overdue ? 'bg-danger-bg text-danger-fg' : 'bg-surface-subtle text-ink-500'
              )}
            >
              {deadline.overdue ? 'Prazo encerrado' : 'Prazo'}: {deadline.label}
            </span>
          )}
        </div>
        {bulkActions}
      </div>

      <div className="overflow-hidden rounded-lg border border-line">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-subtle">
              <tr>
                <th className="px-4 py-2.5 text-left text-label uppercase tracking-wide text-ink-500">
                  Aluno
                </th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    style={col.width ? { width: col.width } : undefined}
                    className="px-4 py-2.5 text-left text-label uppercase tracking-wide text-ink-500"
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {rows.map((row, rowIdx) => {
                const rk = rowKey(row)
                return (
                  <tr key={rk} className="h-row">
                    <td className="px-4 text-base text-ink-700">{rowLabel(row)}</td>
                    {columns.map((col) => {
                      const cur = cell(values, rk, col.key)
                      const base = cell(baseline, rk, col.key)
                      const state = cellState(col, row, cur, base)
                      const err = state === 'invalid' ? col.validate?.(cur, row) : undefined

                      if (col.kind === 'segment') {
                        return (
                          <td key={col.key} className="px-4 py-1.5">
                            <div className="flex flex-wrap gap-1">
                              {col.options?.map((opt) => {
                                const active = cur === opt.value
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() =>
                                      onChange(rk, col.key, active ? '' : opt.value)
                                    }
                                    className={cn(
                                      'rounded border px-2.5 py-1 text-help font-semibold transition-colors',
                                      active
                                        ? opt.activeClass ??
                                            'border-transparent bg-brand-600 text-white'
                                        : 'border-line-strong bg-white text-ink-500 hover:bg-surface-subtle'
                                    )}
                                  >
                                    {opt.label}
                                  </button>
                                )
                              })}
                              {state === 'dirty' && (
                                <span className="ml-1 h-2 w-2 self-center rounded-full bg-brand-600" />
                              )}
                            </div>
                          </td>
                        )
                      }

                      const colIdx = numberCols.indexOf(col.key)
                      return (
                        <td key={col.key} className="px-4 py-1.5">
                          <div className="relative w-24">
                            <input
                              ref={(el) => {
                                inputRefs.current[refKey(rowIdx, colIdx)] = el
                              }}
                              type="number"
                              inputMode="decimal"
                              min={col.min}
                              max={col.max}
                              step={col.step ?? 0.1}
                              value={cur}
                              onChange={(e) => onChange(rk, col.key, e.target.value)}
                              onKeyDown={(e) => handleKeyNav(e, rowIdx, colIdx)}
                              aria-invalid={state === 'invalid' || undefined}
                              className={cn(
                                'h-control-sm w-full rounded border bg-white px-2 text-right text-base tabular-nums',
                                'focus:outline-none focus:ring-[3px] focus:ring-brand-400/35 focus:border-brand-400',
                                state === 'invalid'
                                  ? 'border-danger-base bg-danger-bg/40'
                                  : state === 'dirty'
                                    ? 'border-brand-400'
                                    : 'border-line-strong'
                              )}
                            />
                            {state === 'saved' && (
                              <Check className="pointer-events-none absolute -right-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ok-fg" />
                            )}
                          </div>
                          {err && <p className="mt-0.5 text-help text-danger-fg">{err}</p>}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t border-line bg-surface-subtle px-6 py-4 shadow-sticky lg:-mx-8">
        <span className="text-help text-ink-500">
          {dirty === 0
            ? 'Sem alterações'
            : `${dirty} alteração(ões) · ${invalid > 0 ? `${invalid} inválida(s)` : 'pronto para salvar'}`}
        </span>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
              Cancelar
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            loading={saving}
            disabled={dirty === 0 || invalid > 0}
            onClick={onSave}
          >
            Salvar lançamentos
          </Button>
        </div>
      </div>
    </div>
  )
}
