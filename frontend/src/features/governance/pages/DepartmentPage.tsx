import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/ui/PageHeader'
import { ScopeBar, useScope } from '@/components/ui/ScopeBar'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { labelOf, SCHOOL_TYPE } from '@/components/ui/statusMaps'
import { apiGet } from '@/utils/api-helpers'
import { ROUTES } from '@/app/routes/paths'
import type { AcademicYear, PaginatedResponse, School } from '@/types/api'
import { useMyDepartmentQuery } from '../hooks/useDepartmentQuery'
import { useDepartmentSchoolsQuery } from '../hooks/useDepartmentSchoolsQuery'
import { AcademicYearClosingModal } from './AcademicYearClosingModal'

const YEAR_STATUS: Record<string, { label: string; tone: 'ok' | 'warn' | 'neutral' }> = {
  ACTIVE: { label: 'Ativo', tone: 'ok' },
  PLANNED: { label: 'Planejado', tone: 'warn' },
  CLOSED: { label: 'Encerrado', tone: 'neutral' },
}

export default function DepartmentPage() {
  const navigate = useNavigate()
  const scope = useScope()
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === 'sme_admin'
  const [closing, setClosing] = useState<AcademicYear | null>(null)
  const department = useMyDepartmentQuery(user?.education_department)
  const schools = useDepartmentSchoolsQuery(department.data?.id)
  const years = useQuery({
    queryKey: ['academic-years', 'department'],
    queryFn: () => apiGet<PaginatedResponse<AcademicYear>>('sme/academic-years/'),
  })

  if (department.isLoading) {
    return (
      <>
        <PageHeader title="Secretaria Municipal" />
        <TableSkeleton rows={6} cols={2} />
      </>
    )
  }

  if (department.isError || !department.data) {
    return (
      <>
        <PageHeader title="Secretaria Municipal" />
        <EmptyState title="Erro ao carregar" description="Não foi possível carregar a secretaria." />
      </>
    )
  }

  const dept = department.data
  const schoolList = schools.data?.results ?? []

  const columns: Column<School>[] = [
    { key: 'name', header: 'Nome', render: (s) => s.name },
    {
      key: 'inep',
      header: 'INEP',
      mono: true,
      align: 'right',
      width: '120px',
      render: (s) => s.inep_code || '—',
    },
    { key: 'type', header: 'Tipo', render: (s) => labelOf(SCHOOL_TYPE, s.school_type) },
    { key: 'city', header: 'Cidade', render: (s) => s.address_city || '—' },
  ]

  const info: [string, string][] = [
    ['Município', dept.municipality_name],
    ['Código IBGE', dept.ibge_code],
    ['Secretário(a)', dept.secretary_name || '—'],
    [
      'Nota mínima / frequência mínima',
      `${dept.min_passing_grade ?? '—'} / ${dept.min_attendance_percentage ?? '—'}%`,
    ],
  ]

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Rede' }, { label: 'Secretaria' }]}
        title="Secretaria Municipal"
        meta={`${schoolList.length} escolas na rede`}
      />
      <ScopeBar level={scope.level} title={scope.title} />

      <div className="grid gap-4 rounded-lg border border-line bg-white p-6">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {info.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-line-soft pb-2">
              <dt className="text-help text-ink-400">{k}</dt>
              <dd className="text-right text-base text-ink-700">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <section className="grid gap-3 rounded-lg border border-line bg-white p-6">
        <h2 className="text-section text-ink-900">Anos letivos</h2>
        <ul className="grid gap-2">
          {(years.data?.results ?? []).map((y) => {
            const st = YEAR_STATUS[y.status] ?? { label: y.status, tone: 'neutral' as const }
            return (
              <li
                key={y.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft pb-2 last:border-0 last:pb-0"
              >
                <span className="flex items-center gap-2 text-base text-ink-800">
                  <span className="font-mono tabular-nums">{y.year}</span>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </span>
                {isAdmin && y.status === 'ACTIVE' && (
                  <Button size="sm" variant="secondary" onClick={() => setClosing(y)}>
                    Encerrar ano letivo
                  </Button>
                )}
              </li>
            )
          })}
          {years.data && years.data.results.length === 0 && (
            <li className="text-help text-ink-400">Nenhum ano letivo cadastrado.</li>
          )}
        </ul>
      </section>

      <DataTable
        columns={columns}
        rows={schoolList}
        rowKey={(s) => s.id}
        isLoading={schools.isLoading}
        onRowClick={(s) => navigate(ROUTES.schoolEdit(s.id))}
        empty={<EmptyState title="Nenhuma escola" description="A rede ainda não tem escolas cadastradas." />}
      />

      {closing && (
        <AcademicYearClosingModal
          academicYearId={closing.id}
          year={closing.year}
          onClose={() => setClosing(null)}
        />
      )}
    </>
  )
}
