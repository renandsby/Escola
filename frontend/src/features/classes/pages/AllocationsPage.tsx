import { useState } from 'react'
import type { TeacherAllocation } from '@/types/api'
import { Skeleton } from '@/components/ui/Skeleton'
import { useTeacherAllocationsQuery } from '../hooks/useTeacherAllocationsQuery'

const SKELETON_ROWS = 5

export default function AllocationsPage() {
  const allocations = useTeacherAllocationsQuery()
  const [searchTerm, setSearchTerm] = useState('')

  const term = searchTerm.toLowerCase()
  const filteredData = (allocations.data?.results ?? []).filter(
    (a: TeacherAllocation) =>
      a.teacher_name?.toLowerCase().includes(term) ||
      a.school_class_name?.toLowerCase().includes(term) ||
      a.subject_name?.toLowerCase().includes(term)
  )

  if (allocations.isError) {
    return <div className="p-6 text-red-600">Erro ao carregar alocações</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Alocações Docentes</h1>
        <p className="text-gray-600 mt-1">Professores alocados em turmas e disciplinas</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <input
          type="text"
          placeholder="Buscar por professor, turma ou disciplina..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Professor</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Turma</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Disciplina</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Regente</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {allocations.isLoading &&
              Array.from({ length: SKELETON_ROWS }).map((_, index) => (
                <tr key={`skeleton-${index}`}>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-5 w-12 rounded-full" /></td>
                </tr>
              ))}

            {!allocations.isLoading &&
              filteredData.map((allocation: TeacherAllocation) => (
                <tr key={allocation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {allocation.teacher_name || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {allocation.school_class_name || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {allocation.subject_name || 'Unidocente / regente'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        allocation.is_regent
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {allocation.is_regent ? 'Sim' : 'Não'}
                    </span>
                  </td>
                </tr>
              ))}

            {!allocations.isLoading && filteredData.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  Nenhuma alocação encontrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
