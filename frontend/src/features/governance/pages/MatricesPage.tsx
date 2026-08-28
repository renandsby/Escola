import { useState } from 'react'
import type { CurriculumMatrix } from '@/types/api'
import { Skeleton } from '@/components/ui/Skeleton'
import { useCurriculumMatricesQuery } from '../hooks/useCurriculumMatricesQuery'

const SKELETON_ROWS = 5

export default function MatricesPage() {
  const matrices = useCurriculumMatricesQuery()
  const [searchTerm, setSearchTerm] = useState('')

  const term = searchTerm.toLowerCase()
  const filteredData = (matrices.data?.results ?? []).filter(
    (matrix) =>
      matrix.name?.toLowerCase().includes(term) ||
      matrix.education_stage_name?.toLowerCase().includes(term)
  )

  if (matrices.isError) {
    return <div className="p-6 text-red-600">Erro ao carregar matrizes</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Matrizes Curriculares</h1>
        <p className="text-gray-600 mt-1">Base curricular municipal alinhada à BNCC</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <input
          type="text"
          placeholder="Buscar por nome ou etapa..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Nome</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Etapa</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {matrices.isLoading &&
              Array.from({ length: SKELETON_ROWS }).map((_, index) => (
                <tr key={`skeleton-${index}`}>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-56" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                </tr>
              ))}

            {!matrices.isLoading &&
              filteredData.map((matrix: CurriculumMatrix) => (
                <tr key={matrix.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{matrix.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {matrix.education_stage_name || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        matrix.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {matrix.is_active ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                </tr>
              ))}

            {!matrices.isLoading && filteredData.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                  Nenhuma matriz encontrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
