import { useState, useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ClipboardList, Search } from 'lucide-react'
import { useCrud } from '@/hooks/useCrud'
import type { Grade } from '@/types/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { ScopeBar, useScope } from '@/components/ui/ScopeBar'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Field, Select } from '@/components/ui/Field'
import { FormError } from '@/components/feedback/FormError'
import { ROUTES } from '@/app/routes/paths'
import { apiPost } from '@/utils/api-helpers'
import { DIARY_TABS } from '../diaryTabs'
import { BatchGrid, type BatchCellValues, type BatchColumn } from '../components/BatchGrid'
import { useSchoolClassesQuery } from '../hooks/useSchoolClassesQuery'
import { useSubjectsQuery } from '../hooks/useSubjectsQuery'
import { useAcademicPeriodsQuery } from '../hooks/useAcademicPeriodsQuery'
import { useEnrollmentRosterQuery } from '../hooks/useEnrollmentRosterQuery'
import { useExistingGradesQuery } from '../hooks/useExistingGradesQuery'

type RosterRow = { id: string; student_name?: string }

const scoreToField = (v: number | null | undefined) => (typeof v === 'number' ? String(v) : '')

const validateScore = (value: string) => {
  if (value.trim() === '') {return undefined}
  const n = Number(value)
  if (Number.isNaN(n)) {return 'Número inválido'}
  if (n < 0 || n > 10) {return 'Entre 0 e 10'}
  return undefined
}

const GRID_COLUMNS: BatchColumn<RosterRow>[] = [
  { key: 'score', header: 'Nota', kind: 'number', min: 0, max: 10, validate: validateScore },
  { key: 'recovery_score', header: 'Recuperação', kind: 'number', min: 0, max: 10, validate: validateScore },
  { key: 'final_score', header: 'Nota final', kind: 'number', min: 0, max: 10, validate: validateScore },
]

export default function GradesPage() {
  const queryClient = useQueryClient()
  const scope = useScope()
  const { list } = useCrud<Grade>('grades/', 'grades')
  const [term, setTerm] = useState('')

  const [showSheet, setShowSheet] = useState(false)
  const [classId, setClassId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [periodId, setPeriodId] = useState('')

  const [values, setValues] = useState<BatchCellValues>({})
  const [baseline, setBaseline] = useState<BatchCellValues>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<unknown>(null)

  const classesQuery = useSchoolClassesQuery()
  const subjectsQuery = useSubjectsQuery()
  const periodsQuery = useAcademicPeriodsQuery()
  const classes = classesQuery.data?.results || []
  const subjects = subjectsQuery.data?.results || []
  const periods = periodsQuery.data?.results || []

  const rosterQuery = useEnrollmentRosterQuery(classId)
  const existingGradesQuery = useExistingGradesQuery(periodId, subjectId)
  const roster = (rosterQuery.data?.results || []) as RosterRow[]

  const ready = !!(classId && subjectId && periodId)
  const rosterLoading = rosterQuery.isLoading || existingGradesQuery.isLoading

  useEffect(() => {
    if (!ready || !rosterQuery.data) {
      setValues({})
      setBaseline({})
      return
    }
    const enrollments = rosterQuery.data.results || []
    const existing = existingGradesQuery.data?.results || []
    const next: BatchCellValues = {}
    enrollments.forEach((enr) => {
      const g = existing.find((x) => x.enrollment === enr.id)
      next[enr.id] = {
        score: scoreToField(g?.score),
        recovery_score: scoreToField(g?.recovery_score),
        final_score: scoreToField(g?.final_score),
      }
    })
    setValues(next)
    setBaseline(JSON.parse(JSON.stringify(next)))
  }, [ready, rosterQuery.data, existingGradesQuery.data])

  const q = term.toLowerCase()
  const rows = useMemo(
    () =>
      list.data?.results?.filter(
        (g: Grade) =>
          g.student_name?.toLowerCase().includes(q) ||
          g.subject_name?.toLowerCase().includes(q) ||
          g.academic_period_name?.toLowerCase().includes(q)
      ) || [],
    [list.data, q]
  )

  const handleChange = (rk: string, ck: string, value: string) => {
    setValues((prev) => ({ ...prev, [rk]: { ...prev[rk], [ck]: value } }))
  }

  const resetSheet = () => {
    setShowSheet(false)
    setClassId('')
    setSubjectId('')
    setPeriodId('')
    setValues({})
    setBaseline({})
    setSaveError(null)
  }

  const handleSave = async () => {
    const items = Object.entries(values)
      .filter(([, row]) => (row.score ?? '').trim() !== '')
      .map(([enrollment, row]) => ({
        enrollment,
        subject: subjectId,
        academic_period: periodId,
        score: Number(row.score),
        recovery_score: row.recovery_score?.trim() ? Number(row.recovery_score) : undefined,
        final_score: row.final_score?.trim() ? Number(row.final_score) : undefined,
      }))

    if (items.length === 0) {
      toast.error('Informe ao menos uma nota antes de salvar.')
      return
    }

    setSaveError(null)
    setSaving(true)
    try {
      await apiPost('grades/batch-upsert/', { items })
      queryClient.invalidateQueries({ queryKey: ['grades', 'list'] })
      toast.success('Notas salvas.')
      resetSheet()
    } catch (error) {
      setSaveError(error)
    } finally {
      setSaving(false)
    }
  }

  const columns: Column<Grade>[] = [
    { key: 'student', header: 'Aluno', render: (g) => g.student_name },
    { key: 'subject', header: 'Disciplina', render: (g) => g.subject_name },
    { key: 'period', header: 'Período', render: (g) => g.academic_period_name || '—' },
    {
      key: 'score',
      header: 'Nota',
      align: 'right',
      mono: true,
      render: (g) => (typeof g.score === 'number' ? g.score.toFixed(1) : '—'),
    },
    {
      key: 'effective',
      header: 'Efetiva',
      align: 'right',
      mono: true,
      render: (g) => (typeof g.effective_score === 'number' ? g.effective_score.toFixed(1) : '—'),
    },
  ]

  if (list.isError) {
    return (
      <>
        <PageHeader title="Diário de classe" />
        <EmptyState title="Erro ao carregar" description="Não foi possível carregar as notas." />
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Diário de classe' }, { label: 'Notas' }]}
        title="Diário de classe"
        tabs={DIARY_TABS}
        activeTab={ROUTES.diaryGrades}
        actions={
          <Button
            variant={showSheet ? 'secondary' : 'primary'}
            iconLeft={<ClipboardList className="h-4 w-4" />}
            onClick={() => (showSheet ? resetSheet() : setShowSheet(true))}
          >
            {showSheet ? 'Fechar lançamento' : 'Lançar notas'}
          </Button>
        }
      />
      <ScopeBar level={scope.level} title={scope.title} />

      {showSheet && (
        <div className="grid gap-4 rounded-lg border border-line bg-white p-6">
          <h2 className="text-section text-ink-900">Lançamento de notas</h2>
          {!!saveError && <FormError error={saveError} />}
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Turma" name="class">
              <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
                <option value="">Selecionar</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.school_name ? ` — ${c.school_name}` : ''}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Disciplina" name="subject">
              <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                <option value="">Selecionar</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Período" name="period">
              <Select value={periodId} onChange={(e) => setPeriodId(e.target.value)}>
                <option value="">Selecionar</option>
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.academic_year_label ? ` (${p.academic_year_label})` : ''}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {ready && (
            <BatchGrid<RosterRow>
              rows={roster}
              rowKey={(r) => r.id}
              rowLabel={(r) => r.student_name || '—'}
              columns={GRID_COLUMNS}
              values={values}
              baseline={baseline}
              onChange={handleChange}
              onSave={handleSave}
              onCancel={resetSheet}
              saving={saving}
              isLoading={rosterLoading}
            />
          )}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar por aluno, disciplina ou período…"
          className="h-control w-full rounded border border-line-strong bg-white pl-9 pr-3 text-base"
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(g) => g.id}
        isLoading={list.isLoading}
        empty={
          <EmptyState
            title="Nenhuma nota lançada"
            description={term ? 'Ajuste a busca.' : 'Use "Lançar notas" para registrar o bimestre.'}
          />
        }
      />
    </>
  )
}
