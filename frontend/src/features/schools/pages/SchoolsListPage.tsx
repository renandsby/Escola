import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useCrud } from '@/hooks/useCrud'
import { type School, SCHOOL_TYPE_LABELS } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { getErrorMessage } from '@/utils/api-helpers'
import { Plus, Edit, Trash2 } from 'lucide-react'

const SKELETON_ROWS = 5

export default function SchoolsListPage() {
  const navigate = useNavigate()
  const { list, delete_ } = useCrud<School>('schools/', 'schools')
  const [searchTerm, setSearchTerm] = useState('')
  const [schoolToDelete, setSchoolToDelete] = useState<School | null>(null)

  const handleDeleteConfirm = async () => {
    if (!schoolToDelete) {
      return
    }
    try {
      await delete_.mutateAsync(schoolToDelete.id)
      toast.success('Escola excluída com sucesso!')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSchoolToDelete(null)
    }
  }

  const term = searchTerm.toLowerCase()
  const filteredData = (list.data?.results ?? []).filter(
    (school: School) =>
      school.name?.toLowerCase().includes(term) ||
      school.inep_code?.toLowerCase().includes(term)
  )

  if (list.isError) {
    return <div className="p-6 text-red-600">Erro ao carregar escolas</div>
  }

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
          placeholder="Buscar por nome ou INEP..."
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
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">INEP</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Tipo</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Cidade</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {list.isLoading &&
              Array.from({ length: SKELETON_ROWS }).map((_, index) => (
                <tr key={`skeleton-${index}`}>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-48" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-20 ml-auto" /></td>
                </tr>
              ))}

            {!list.isLoading &&
              filteredData.map((school: School) => (
                <tr key={school.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{school.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{school.inep_code || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {SCHOOL_TYPE_LABELS[school.school_type] || school.school_type}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{school.address_city || '—'}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/schools/${school.id}/edit`)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setSchoolToDelete(school)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}

            {!list.isLoading && filteredData.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  Nenhuma escola encontrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!schoolToDelete}
        title="Excluir escola"
        description={`Tem certeza que deseja excluir ${schoolToDelete?.name || 'esta escola'}? Esta ação não pode ser desfeita.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setSchoolToDelete(null)}
        confirmLabel="Excluir"
        destructive
      />
    </div>
  )
}
