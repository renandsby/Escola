import { useAuthStore } from '@/stores/authStore'
import { Skeleton } from '@/components/ui/Skeleton'
import { SCHOOL_TYPE_LABELS } from '@/types/api'
import { useMyDepartmentQuery } from '../hooks/useDepartmentQuery'
import { useDepartmentSchoolsQuery } from '../hooks/useDepartmentSchoolsQuery'

const SKELETON_ROWS = 4

export default function DepartmentPage() {
  const user = useAuthStore((state) => state.user)
  const department = useMyDepartmentQuery(user?.education_department)
  const schools = useDepartmentSchoolsQuery(department.data?.id)

  if (department.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (department.isError || !department.data) {
    return <div className="p-6 text-red-600">Erro ao carregar a secretaria</div>
  }

  const dept = department.data
  const schoolList = schools.data?.results ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Secretaria Municipal</h1>
        <p className="text-gray-600 mt-1">Dados da rede e unidades escolares</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600">Município</p>
          <p className="text-lg font-semibold text-gray-900">{dept.municipality_name}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Código IBGE</p>
          <p className="text-lg font-semibold text-gray-900">{dept.ibge_code}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Secretário(a)</p>
          <p className="text-lg font-semibold text-gray-900">{dept.secretary_name || '—'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Nota mínima / Frequência mínima</p>
          <p className="text-lg font-semibold text-gray-900">
            {dept.min_passing_grade ?? '—'} / {dept.min_attendance_percentage ?? '—'}%
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Escolas da rede ({schoolList.length})
          </h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Nome</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">INEP</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Tipo</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Cidade</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {schools.isLoading &&
              Array.from({ length: SKELETON_ROWS }).map((_, index) => (
                <tr key={`skeleton-${index}`}>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-48" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-28" /></td>
                </tr>
              ))}

            {!schools.isLoading &&
              schoolList.map((school) => (
                <tr key={school.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{school.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{school.inep_code || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {SCHOOL_TYPE_LABELS[school.school_type] || school.school_type}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{school.address_city || '—'}</td>
                </tr>
              ))}

            {!schools.isLoading && schoolList.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  Nenhuma escola cadastrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
