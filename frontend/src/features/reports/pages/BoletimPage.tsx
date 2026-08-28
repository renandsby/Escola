import { useState } from 'react'
import { Printer } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { ScopeBar, useScope } from '@/components/ui/ScopeBar'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { Field, Select } from '@/components/ui/Field'
import { labelOf, SHIFT } from '@/components/ui/statusMaps'
import type { Student } from '@/types/api'
import { useBoletimData } from '../hooks/useBoletimData'

export default function BoletimPage() {
  const scope = useScope()
  const [classId, setClassId] = useState('')
  const { students, classes, grades, enrollments } = useBoletimData(classId)

  if (students.isLoading || classes.isLoading) {
    return (
      <>
        <PageHeader title="Boletins consolidados" />
        <TableSkeleton rows={8} cols={4} />
      </>
    )
  }

  if (students.isError || classes.isError) {
    return (
      <>
        <PageHeader title="Boletins consolidados" />
        <EmptyState title="Erro ao carregar" description="Não foi possível carregar os boletins." />
      </>
    )
  }

  const studentList = students.data?.results ?? []
  const classList = classes.data?.results ?? []
  const gradesList = grades.data?.results ?? []
  const enrollmentList = enrollments.data?.results ?? []

  const enrolledStudentIds = new Set(enrollmentList.map((e) => e.student))
  const filteredStudents = classId
    ? studentList.filter((s) => enrolledStudentIds.has(s.id))
    : studentList

  const studentAvg = (studentId: string) => {
    const byEnrollment = gradesList.filter((g) =>
      enrollmentList.some((e) => e.id === g.enrollment && e.student === studentId)
    )
    const relevant =
      byEnrollment.length > 0
        ? byEnrollment
        : gradesList.filter(
            (g) =>
              g.student_name &&
              studentList.find((s) => s.id === studentId)?.full_name === g.student_name
          )
    if (relevant.length === 0) {return null}
    return (
      relevant.reduce((sum, g) => sum + Number(g.effective_score ?? g.score ?? 0), 0) /
      relevant.length
    )
  }

  const columns: Column<Student>[] = [
    {
      key: 'id',
      header: 'ID municipal',
      mono: true,
      align: 'right',
      width: '140px',
      render: (s) => s.unique_municipal_id,
    },
    { key: 'name', header: 'Aluno', render: (s) => s.full_name },
    {
      key: 'avg',
      header: 'Média geral',
      align: 'right',
      mono: true,
      render: (s) => {
        const avg = studentAvg(s.id)
        if (avg === null) {return <span className="text-ink-400">—</span>}
        return (
          <span className={avg >= 6 ? 'text-ok-fg' : 'text-danger-fg'}>{avg.toFixed(1)}</span>
        )
      },
    },
    {
      key: 'status',
      header: 'Situação',
      render: (s) =>
        s.is_active ? (
          <Badge tone="ok">Ativo</Badge>
        ) : (
          <Badge tone="neutral" shape="square">
            Inativo
          </Badge>
        ),
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Documentos' }, { label: 'Boletins' }]}
        title="Boletins consolidados"
        meta={`${filteredStudents.length} alunos · ${gradesList.length} lançamentos de nota`}
        actions={
          <Button
            variant="primary"
            iconLeft={<Printer className="h-4 w-4" />}
            onClick={() => window.print()}
          >
            Imprimir
          </Button>
        }
      />
      <ScopeBar level={scope.level} title={scope.title} />

      <div className="rounded-lg border border-line bg-white p-6">
        <Field label="Turma" name="class" className="sm:max-w-md">
          <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Todas as turmas</option>
            {classList.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} — {labelOf(SHIFT, cls.shift)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <DataTable
        columns={columns}
        rows={filteredStudents}
        rowKey={(s) => s.id}
        empty={<EmptyState title="Nenhum aluno" description="Nenhum aluno para a turma selecionada." />}
      />
    </>
  )
}
