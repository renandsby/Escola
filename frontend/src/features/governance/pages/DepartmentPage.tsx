import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/ui/PageHeader'
import { ScopeBar, useScope } from '@/components/ui/ScopeBar'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { labelOf, SCHOOL_TYPE } from '@/components/ui/statusMaps'
import { ROUTES } from '@/app/routes/paths'
import type { School } from '@/types/api'
import { useMyDepartmentQuery } from '../hooks/useDepartmentQuery'
import { useDepartmentSchoolsQuery } from '../hooks/useDepartmentSchoolsQuery'

export default function DepartmentPage() {
  const navigate = useNavigate()
  const scope = useScope()
  const user = useAuthStore((state) => state.user)
  const department = useMyDepartmentQuery(user?.education_department)
  const schools = useDepartmentSchoolsQuery(department.data?.id)

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

      <DataTable
        columns={columns}
        rows={schoolList}
        rowKey={(s) => s.id}
        isLoading={schools.isLoading}
        onRowClick={(s) => navigate(ROUTES.schoolEdit(s.id))}
        empty={<EmptyState title="Nenhuma escola" description="A rede ainda não tem escolas cadastradas." />}
      />
    </>
  )
}
