import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Field, Select, SegmentedControl, Checkbox } from '@/components/ui/Field'
import { InlineError } from '@/components/ui/InlineError'
import { resolveError } from '@/services/errorMessages'
import { cn } from '@/utils/cn'
import { useCreateExecution } from '../hooks/useReports'
import type { CreateExecutionInput, ReportDef, ReportFormat } from '../types'

type Props = {
  report: ReportDef | null
  scope: { level: string; title: string }
  /** turma pré-selecionada (quando o escopo é de turma) */
  classGroupId?: string | null
  schoolId?: string | null
  onClose: () => void
  onQueued: (executionId: string) => void
}

const TERMS = [
  { value: 'current', label: 'Bimestre atual' },
  { value: 'year', label: 'Ano inteiro' },
]
const COVERAGE = [
  { value: 'all', label: 'Todas' },
  { value: 'late_only', label: 'Em atraso' },
]

export function ReportGeneratorDrawer({
  report,
  scope,
  classGroupId,
  schoolId,
  onClose,
  onQueued,
}: Props) {
  const create = useCreateExecution()
  const panelRef = useRef<HTMLDivElement>(null)
  const originRef = useRef<HTMLElement | null>(null)

  const [format, setFormat] = useState<ReportFormat>('PDF')
  const [coverage, setCoverage] = useState('all')
  const [term, setTerm] = useState('current')
  const [includeCharts, setIncludeCharts] = useState(true)
  const [includeComparison, setIncludeComparison] = useState(true)
  const [includeStudentList, setIncludeStudentList] = useState(false)

  useEffect(() => {
    if (report) {
      originRef.current = document.activeElement as HTMLElement
      setFormat(report.formats[0])
      setCoverage('all')
      setTerm('current')
      setIncludeCharts(report.formats.includes('PDF'))
      setIncludeComparison(true)
      setIncludeStudentList(false)
      create.reset()
      // foca o primeiro campo
      requestAnimationFrame(() => {
        panelRef.current?.querySelector<HTMLElement>('button, select, input')?.focus()
      })
    } else {
      originRef.current?.focus?.()
    }
  }, [report])

  useEffect(() => {
    if (!report) {
      return
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
      if (e.key === 'Tab' && panelRef.current) {
        const items = panelRef.current.querySelectorAll<HTMLElement>(
          'button, select, input, a[href], [tabindex]:not([tabindex="-1"])'
        )
        if (!items.length) {
          return
        }
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [report, onClose])

  const hasParam = (p: string) => !!report?.parameters.includes(p)
  const estimate = report
    ? `Estimativa: ~${report.estimate_seconds}s · ${scope.title}`
    : ''

  const err = useMemo(() => {
    const e = create.error as { response?: { data?: { error?: { code?: string; details?: Record<string, unknown> } } } } | null
    return e?.response?.data?.error ?? null
  }, [create.error])

  if (!report) {
    return null
  }

  const submit = () => {
    const params: CreateExecutionInput['parameters'] = {
      output_format: format,
      coverage: coverage as 'all' | 'late_only',
      term: term === 'current' ? undefined : 'year',
    }
    if (classGroupId) {params.class_group_id = classGroupId}
    if (schoolId) {params.school_id = schoolId}
    if (hasParam('include_charts')) {params.include_charts = includeCharts && format === 'PDF'}
    if (hasParam('include_school_comparison')) {params.include_school_comparison = includeComparison}
    if (hasParam('include_student_list')) {params.include_student_list = includeStudentList}

    create.mutate(
      { report_key: report.key, parameters: params },
      {
        onSuccess: (execution) => {
          toast.success('Relatório na fila — você será avisado ao concluir.')
          onQueued(execution.id)
          onClose()
        },
      }
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`Gerar: ${report.name}`}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        ref={panelRef}
        className="relative flex h-full w-full max-w-md flex-col bg-white shadow-overlay"
      >
        <div className="border-b border-line px-5 py-4">
          <p className="text-section text-ink-900">{report.name}</p>
          <p className="mt-1 text-help text-ink-500">{report.description}</p>
          <div className="mt-3 rounded border border-brand-200 bg-brand-50 px-3 py-2">
            <p className="font-mono text-micro text-brand-700">ESCOPO HERDADO</p>
            <p className="text-sm text-ink-700">{scope.title}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="grid gap-4">
            <Field label="Formato" name="output_format">
              <Select value={format} name="output_format" onChange={(e) => setFormat(e.target.value as ReportFormat)}>
                {report.formats.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </Select>
            </Field>

            {hasParam('coverage') && (
              <Field label="Cobertura" name="coverage">
                <SegmentedControl value={coverage} onChange={setCoverage} options={COVERAGE} />
              </Field>
            )}

            {hasParam('term') && (
              <Field label="Período" name="term">
                <SegmentedControl value={term} onChange={setTerm} options={TERMS} />
              </Field>
            )}

            {hasParam('include_charts') && format === 'PDF' && (
              <Checkbox
                label="Incluir gráficos no PDF"
                checked={includeCharts}
                onChange={(e) => setIncludeCharts(e.target.checked)}
              />
            )}

            {hasParam('include_school_comparison') && scope.level === 'network' && (
              <Checkbox
                label="Incluir comparativo entre escolas"
                checked={includeComparison}
                onChange={(e) => setIncludeComparison(e.target.checked)}
              />
            )}

            {hasParam('include_student_list') && (
              <Checkbox
                label="Incluir lista nominal de alunos"
                checked={includeStudentList}
                onChange={(e) => setIncludeStudentList(e.target.checked)}
              />
            )}

            {(report.contains_personal_data || includeStudentList) && (
              <div className="rounded border border-warn-border bg-warn-bg px-3 py-2 text-help text-warn-fg">
                <span className="mr-1 inline-block h-1.5 w-1.5 rotate-45 bg-warn-base align-middle" />
                Este relatório contém dados pessoais de alunos. A geração fica registrada em
                auditoria com o seu nome, o escopo e o horário.
              </div>
            )}

            {err && (
              <InlineError
                code={err.code}
                title={resolveError(err.code).title}
                message={resolveError(err.code).message(err.details)}
              />
            )}
          </div>
        </div>

        <div
          className={cn(
            'sticky bottom-0 flex items-center justify-between gap-3 border-t border-line',
            'bg-surface-subtle px-5 py-3 shadow-sticky'
          )}
        >
          <span className="text-help text-ink-500">{estimate}</span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" loading={create.isPending} onClick={submit}>
              Gerar relatório
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
