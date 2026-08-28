import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Search, Plus } from 'lucide-react'
import { useCrud } from '@/hooks/useCrud'
import type { Enrollment, EnrollmentStatus } from '@/types/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { ScopeBar, useScope } from '@/components/ui/ScopeBar'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/utils/formatting'
import { getErrorMessage } from '@/utils/api-helpers'
import { ENROLLMENT_STATUS } from '@/components/ui/statusMaps'
import { ROUTES } from '@/app/routes/paths'

export default function EnrollmentsListPage() {
  const navigate = useNavigate()
  const scope = useScope()
  const { list, update } = useCrud<Enrollment>('enrollments/', 'enrollments')
  const [term, setTerm] = useState('')

  const q = term.toLowerCase()
  const rows = (list.data?.results ?? []).filter(
    (e: Enrollment) =>
      e.student_name?.toLowerCase().includes(q) ||
      e.enrollment_number?.toLowerCase().includes(q)
  )

  const changeStatus = async (e: Enrollment, status: EnrollmentStatus) => {
    try {
      await update.mutateAsync({ id: e.id, data: { ...e, status } })
      toast.success('Status da matrícula atualizado.')
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const columns: Column<Enrollment>[] = [
    { key: 'student', header: 'Aluno', render: (e) => e.student_name || '—' },
    { key: 'class', header: 'Turma', render: (e) => e.school_class_name || '—' },
    {
      key: 'number',
      header: 'Nº matrícula',
      mono: true,
      align: 'right',
      render: (e) => e.enrollment_number,
    },
    { key: 'date', header: 'Data', render: (e) => formatDate(e.enrollment_date) },
    {
      key: 'status',
      header: 'Situação',
      render: (e) => {
        const def = ENROLLMENT_STATUS[e.status]
        return def ? (
          <Badge tone={def.tone} shape={def.shape}>
            {def.label}
          </Badge>
        ) : (
          e.status
        )
      },
    },
  ]

  if (list.isError) {
    return (
      <>
        <PageHeader title="Matrículas" />
        <EmptyState title="Erro ao carregar" description="Não foi possível carregar as matrículas." />
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Vida escolar' }, { label: 'Matrículas' }]}
        title="Matrículas"
        actions={
          <Button
            variant="primary"
            iconLeft={<Plus className="h-4 w-4" />}
            onClick={() => navigate(ROUTES.enrollmentNew)}
          >
            Nova matrícula
          </Button>
        }
      />
      <ScopeBar level={scope.level} title={scope.title} />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar por aluno ou número de matrícula…"
          className="h-control w-full rounded border border-line-strong bg-white pl-9 pr-3 text-base"
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(e) => e.id}
        isLoading={list.isLoading}
        empty={
          <EmptyState
            title="Nenhuma matrícula encontrada"
            description={term ? 'Ajuste a busca.' : 'Matricule um aluno numa turma.'}
          />
        }
        rowActions={(e) => (
          <select
            value={e.status}
            disabled={update.isPending}
            onChange={(ev) => changeStatus(e, ev.target.value as EnrollmentStatus)}
            className="h-control-sm rounded border border-line-strong bg-white px-2 text-sm"
          >
            {Object.entries(ENROLLMENT_STATUS).map(([value, def]) => (
              <option key={value} value={value}>
                {def.label}
              </option>
            ))}
          </select>
        )}
      />
    </>
  )
}
