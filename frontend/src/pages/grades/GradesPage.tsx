import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCrud } from '@/hooks/useCrud'
import { Grade } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Plus, Edit } from 'lucide-react'

export default function GradesPage() {
  const navigate = useNavigate()
  const { list } = useCrud<Grade>('grades/', 'grades')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredData = list.data?.results?.filter((grade: Grade) =>
    grade.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    grade.subject_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  if (list.isLoading) return <div className="p-6">Carregando...</div>
  if (list.isError) return <div className="p-6 text-red-600">Erro ao carregar notas</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Notas</h1>
        <Button onClick={() => navigate('/grades/create')}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Nota
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <input
          type="text"
          placeholder="Buscar aluno ou disciplina..."
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
              <th className="px-4 py-3 text-left font-medium text-gray-700">Disciplina</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700">Média</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredData.map((grade: Grade) => (
              <tr key={grade.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-900">{grade.student_name}</td>
                <td className="px-4 py-3 text-gray-600">{grade.subject_name}</td>
                <td className="px-4 py-3 text-center font-medium">
                  {grade.average?.toFixed(1) || 'N/A'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      grade.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : grade.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {grade.status === 'approved'
                      ? 'Aprovado'
                      : grade.status === 'failed'
                        ? 'Reprovado'
                        : 'Pendente'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/grades/${grade.id}/edit`)}
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
