import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCrud } from '@/hooks/useCrud'
import { School } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2 } from 'lucide-react'

export default function SchoolsPage() {
  const navigate = useNavigate()
  const { list, delete_ } = useCrud<School>('schools/', 'schools')
  const [searchTerm, setSearchTerm] = useState('')

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja deletar esta escola?')) {
      delete_.mutate(id)
    }
  }

  const filteredData = list.data?.results?.filter((school: School) =>
    school.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  if (list.isLoading) return <div className="p-6">Carregando...</div>
  if (list.isError) return <div className="p-6 text-red-600">Erro ao carregar escolas</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Escolas</h1>
        <Button onClick={() => navigate('/schools/create')}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Escola
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <input
          type="text"
          placeholder="Buscar escolas..."
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
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">CNPJ</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Cidade</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Email</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredData.map((school: School) => (
              <tr key={school.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">{school.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{school.cnpj}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{school.city}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{school.email}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/schools/${school.id}/edit`)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(school.id)}
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
