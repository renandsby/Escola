import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCrud } from '@/hooks/useCrud'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Edit } from 'lucide-react'

interface Subject {
  id: string
  name: string
  code: string
  workload: number
  requires_practicum: boolean
  minimum_passing_grade: number
  is_active: boolean
}

export default function SubjectsPage() {
  const navigate = useNavigate()
  const { list, delete_ } = useCrud<Subject>('subjects/', 'subjects')
  const [searchTerm, setSearchTerm] = useState('')

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja deletar esta disciplina?')) {
      delete_.mutate(id)
    }
  }

  const filteredData = list.data?.results?.filter((subject: Subject) =>
    subject.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subject.code?.includes(searchTerm)
  ) || []

  if (list.isLoading) return <div className="p-6">Carregando...</div>
  if (list.isError) return <div className="p-6 text-red-600">Erro ao carregar disciplinas</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Disciplinas</h1>
        <Button onClick={() => navigate('/subjects/create')}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Disciplina
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <input
          type="text"
          placeholder="Buscar por nome ou código..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Código</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Nome</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Carga Horária</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Nota Mínima</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredData.map((subject: Subject) => (
              <tr key={subject.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{subject.code}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{subject.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{subject.workload}h</td>
                <td className="px-6 py-4 text-sm text-gray-600">{subject.minimum_passing_grade}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/subjects/${subject.id}/edit`)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(subject.id)}
                  >
                    <Trash2 className="w-4 h-4" />
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
