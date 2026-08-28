import { useState, useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, CheckCheck, Search } from 'lucide-react'
import { useCrud } from '@/hooks/useCrud'
import type { Attendance, AttendanceStatus } from '@/types/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { ScopeBar, useScope } from '@/components/ui/ScopeBar'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Field, Select, Input } from '@/components/ui/Field'
import { FormError } from '@/components/feedback/FormError'
import { ROUTES } from '@/app/routes/paths'
import { apiPost } from '@/utils/api-helpers'
import { formatDate } from '@/utils/formatting'
import { ATTENDANCE_STATUS, labelOf } from '@/components/ui/statusMaps'
import { DIARY_TABS } from '../diaryTabs'
import { BatchGrid, type BatchCellValues, type BatchColumn } from '../components/BatchGrid'
import { useSchoolClassesQuery } from '../hooks/useSchoolClassesQuery'
import { useSubjectsQuery } from '../hooks/useSubjectsQuery'
import { useEnrollmentRosterQuery } from '../hooks/useEnrollmentRosterQuery'
import { useExistingAttendanceQuery } from '../hooks/useExistingAttendanceQuery'

type RosterRow = { id: string; student_name?: string }

const GRID_COLUMNS: BatchColumn<RosterRow>[] = [
  {
    key: 'status',
    header: 'Frequência',
    kind: 'segment',
    options: [
      { value: 'PRESENT', label: 'Presente', activeClass: 'border-transparent bg-ok-base text-white' },
      { value: 'ABSENT', label: 'Falta', activeClass: 'border-transparent bg-danger-base text-white' },
      {
        value: 'EXCUSED_ABSENCE',
        label: 'Justificada',
        activeClass: 'border-transparent bg-warn-base text-ink-900',
      },
    ],
  },
]

const attendanceToneOf = (s: string) => ATTENDANCE_STATUS[s]?.tone ?? 'neutral'

export default function AttendancePage() {
  const queryClient = useQueryClient()
  const scope = useScope()
  const { list } = useCrud<Attendance>('attendance/', 'attendance')
  const [term, setTerm] = useState('')

  const [showSheet, setShowSheet] = useState(false)
  const [classId, setClassId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))

  const [values, setValues] = useState<BatchCellValues>({})
  const [baseline, setBaseline] = useState<BatchCellValues>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<unknown>(null)

  const classesQuery = useSchoolClassesQuery()
  const subjectsQuery = useSubjectsQuery()
  const classes = classesQuery.data?.results || []
  const subjects = subjectsQuery.data?.results || []

  const rosterQuery = useEnrollmentRosterQuery(classId)
  const existingQuery = useExistingAttendanceQuery(classId, date, subjectId)
  const roster = (rosterQuery.data?.results || []) as RosterRow[]

  const ready = !!(classId && date)
  const rosterLoading = rosterQuery.isLoading || existingQuery.isLoading

  useEffect(() => {
    if (!ready || !rosterQuery.data) {
      setValues({})
      setBaseline({})
      return
    }
    const enrollments = rosterQuery.data.results || []
    const existing = existingQuery.data?.results || []
    const next: BatchCellValues = {}
    enrollments.forEach((enr) => {
      const match = existing.find((a) => a.enrollment === enr.id)
      next[enr.id] = { status: match?.status ?? '' }
    })
    setValues(next)
    setBaseline(JSON.parse(JSON.stringify(next)))
  }, [ready, rosterQuery.data, existingQuery.data])

  const q = term.toLowerCase()
  const rows = useMemo(
    () =>
      list.data?.results?.filter((a: Attendance) => a.student_name?.toLowerCase().includes(q)) || [],
    [list.data, q]
  )

  const handleChange = (rk: string, ck: string, value: string) => {
    setValues((prev) => ({ ...prev, [rk]: { ...prev[rk], [ck]: value } }))
  }

  const markAllPresent = () => {
    setValues((prev) => {
      const next = { ...prev }
      roster.forEach((r) => {
        if (!next[r.id]?.status) {next[r.id] = { ...next[r.id], status: 'PRESENT' }}
      })
      return next
    })
  }

  const resetSheet = () => {
    setShowSheet(false)
    setClassId('')
    setSubjectId('')
    setValues({})
    setBaseline({})
    setSaveError(null)
  }

  const handleSave = async () => {
    const items = Object.entries(values)
      .filter(([, row]) => (row.status ?? '').trim() !== '')
      .map(([enrollment, row]) => ({
        enrollment,
        school_class: classId,
        subject: subjectId || null,
        date,
        status: row.status as AttendanceStatus,
      }))

    if (items.length === 0) {
      toast.error('Marque a frequência de ao menos um aluno.')
      return
    }

    setSaveError(null)
    setSaving(true)
    try {
      await apiPost('attendance/batch-upsert/', { items })
      toast.success('Frequência salva.')
      queryClient.invalidateQueries({ queryKey: ['attendance', 'list'] })
      resetSheet()
    } catch (error) {
      setSaveError(error)
    } finally {
      setSaving(false)
    }
  }

  const columns: Column<Attendance>[] = [
    { key: 'student', header: 'Aluno', render: (a) => a.student_name },
    { key: 'class', header: 'Turma', render: (a) => a.school_class_name || '—' },
    { key: 'date', header: 'Data', render: (a) => formatDate(a.date) },
    { key: 'subject', header: 'Disciplina', render: (a) => a.subject_name || 'Diária' },
    {
      key: 'status',
      header: 'Situação',
      render: (a) => (
        <Badge tone={attendanceToneOf(a.status)}>{labelOf(ATTENDANCE_STATUS, a.status)}</Badge>
      ),
    },
  ]

  if (list.isError) {
    return (
      <>
        <PageHeader title="Diário de classe" />
        <EmptyState title="Erro ao carregar" description="Não foi possível carregar a frequência." />
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Diário de classe' }, { label: 'Frequência' }]}
        title="Diário de classe"
        tabs={DIARY_TABS}
        activeTab={ROUTES.diaryAttendance}
        actions={
          <Button
            variant={showSheet ? 'secondary' : 'primary'}
            iconLeft={<Plus className="h-4 w-4" />}
            onClick={() => (showSheet ? resetSheet() : setShowSheet(true))}
          >
            {showSheet ? 'Fechar lançamento' : 'Lançar frequência'}
          </Button>
        }
      />
      <ScopeBar level={scope.level} title={scope.title} />

      {showSheet && (
        <div className="grid gap-4 rounded-lg border border-line bg-white p-6">
          <h2 className="text-section text-ink-900">Lançar frequência</h2>
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
            <Field label="Disciplina" name="subject" help="Vazio = frequência diária">
              <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                <option value="">Frequência diária</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Data" name="date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
              bulkActions={
                <Button type="button" variant="secondary" size="sm" onClick={markAllPresent}>
                  <CheckCheck className="mr-1 h-4 w-4" />
                  Marcar todos presentes
                </Button>
              }
            />
          )}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar por aluno…"
          className="h-control w-full rounded border border-line-strong bg-white pl-9 pr-3 text-base"
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(a) => a.id}
        isLoading={list.isLoading}
        empty={
          <EmptyState
            title="Nenhum registro"
            description={term ? 'Ajuste a busca.' : 'Use "Lançar frequência" para registrar a chamada.'}
          />
        }
      />
    </>
  )
}
