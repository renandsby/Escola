import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCrud } from '@/hooks/useCrud'
import { Attendance } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Plus, Edit } from 'lucide-react'
import { formatDate } from '@/utils/formatting'

export default function AttendancePage() {
  const navigate = useNavigate()
  const { list } = useCrud<Attendance>('attendance/', 'attendance')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredData = list.data?.results?.filter((att: Attendance) =>
    att.student_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  if (list.isLoading) return <div className="p-6">Carregando...</div>
  if (list.isError) return <div className="p-6 text-red-600">Erro ao carregar frequência</div>

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800'
      case 'absent':
        return 'bg-red-100 text-red-800'
      case 'justified':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'present':
        return 'Presente'
      case 'absent':
        return 'Ausente'
      case 'justified':
        return 'Justificado'
      default:
        return 'Permitido'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Frequência</h1>
        <Button onClick={() => navigate('/attendance/create')}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Chamada
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <input
          type="text"
          placeholder="Buscar aluno..."
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
              <th className="px-4 py-3 text-left font-medium text-gray-700">Data</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Disciplina</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredData.map((attendance: Attendance) => (
              <tr key={attendance.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-900">{attendance.student_name}</td>
                <td className="px-4 py-3 text-gray-600">{formatDate(attendance.date)}</td>
                <td className="px-4 py-3 text-gray-600">{attendance.subject_name}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(attendance.status)}`}>
                    {getStatusLabel(attendance.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/attendance/${attendance.id}/edit`)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
