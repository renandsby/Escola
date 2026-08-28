import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useCrud } from '@/hooks/useCrud'
import type { Enrollment, EnrollmentStatus } from '@/types/api'
import { ENROLLMENT_STATUS_LABELS } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDate } from '@/utils/formatting'
import { getErrorMessage } from '@/utils/api-helpers'
import { Plus } from 'lucide-react'

const SKELETON_ROWS = 5

export default function EnrollmentsListPage() {
  const navigate = useNavigate()
  const { list, update } = useCrud<Enrollment>('enrollments/', 'enrollments')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredData =
    list.data?.results?.filter(
      (enrollment: Enrollment) =>
        enrollment.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enrollment.enrollment_number?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || []

  const statusColor = (status: EnrollmentStatus) => {
    switch (status) {
      case 'ENROLLED':
      case 'APPROVED':
        return 'bg-green-100 text-green-800'
      case 'FAILED_ACADEMIC':
      case 'FAILED_ATTENDANCE':
      case 'DROPOUT':
      case 'DECEASED':
        return 'bg-red-100 text-red-800'
      case 'TRANSFERRED_INTERNAL':
        return 'bg-yellow-100 text-yellow-800'
      case 'TRANSFERRED_EXTERNAL':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleStatusChange = async (enrollment: Enrollment, newStatus: EnrollmentStatus) => {
    try {
      await update.mutateAsync({
        id: enrollment.id,
        data: { ...enrollment, status: newStatus },
      })
      toast.success('Status da matrícula atualizado com sucesso!')
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  if (list.isError) {
    return <div className="p-6 text-red-600">Erro ao carregar matrículas</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Matrículas</h1>
        <Button onClick={() => navigate('/enrollments/create')}>
          <Plus className="w-4 h-4 mr-1" />
          Nova Matrícula
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <input
          type="text"
          placeholder="Buscar por aluno ou número de matrícula..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Aluno</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Turma</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Nº Matrícula</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Data</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {list.isLoading &&
              Array.from({ length: SKELETON_ROWS }).map((_, index) => (
                <tr key={`skeleton-${index}`}>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-28" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Skeleton className="h-8 w-28 ml-auto" />
                  </td>
                </tr>
              ))}

            {!list.isLoading &&
              filteredData.map((enrollment: Enrollment) => (
                <tr key={enrollment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{enrollment.student_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{enrollment.school_class_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{enrollment.enrollment_number}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(enrollment.enrollment_date)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${statusColor(enrollment.status)}`}
                    >
                      {ENROLLMENT_STATUS_LABELS[enrollment.status] || enrollment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <select
                      value={enrollment.status}
                      disabled={update.isPending}
                      onChange={(e) =>
                        handleStatusChange(enrollment, e.target.value as EnrollmentStatus)
                      }
                      className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {(Object.keys(ENROLLMENT_STATUS_LABELS) as EnrollmentStatus[]).map((status) => (
                        <option key={status} value={status}>
                          {ENROLLMENT_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            {!list.isLoading && filteredData.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Nenhuma matrícula encontrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
