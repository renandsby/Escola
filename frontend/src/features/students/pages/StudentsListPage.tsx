import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useCrud } from '@/hooks/useCrud'
import { Student } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { getErrorMessage } from '@/utils/api-helpers'
import { Plus, Edit, Trash2, Eye } from 'lucide-react'

const SKELETON_ROWS = 5

export default function StudentsListPage() {
  const navigate = useNavigate()
  const { list, delete_ } = useCrud<Student>('students/', 'students')
  const [searchTerm, setSearchTerm] = useState('')
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null)

  const handleDeleteConfirm = async () => {
    if (!studentToDelete) {
      return
    }
    try {
      await delete_.mutateAsync(studentToDelete.id)
      toast.success('Aluno excluído com sucesso!')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setStudentToDelete(null)
    }
  }

  const filteredData =
    list.data?.results?.filter(
      (student: Student) =>
        student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.unique_municipal_id?.includes(searchTerm) ||
        student.mother_name?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || []

  if (list.isError) {
    return <div className="p-6 text-red-600">Erro ao carregar alunos</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Alunos</h1>
        <Button onClick={() => navigate('/students/create')}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Aluno
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <input
          type="text"
          placeholder="Buscar por nome, ID municipal ou nome da mãe..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">ID Municipal</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Nome</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Nome da mãe</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Status</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {list.isLoading &&
              Array.from({ length: SKELETON_ROWS }).map((_, index) => (
                <tr key={`skeleton-${index}`}>
                  <td className="px-6 py-4">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-4 w-40" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-4 w-40" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Skeleton className="h-8 w-24 ml-auto" />
                  </td>
                </tr>
              ))}

            {!list.isLoading &&
              filteredData.map((student: Student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {student.unique_municipal_id}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{student.full_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{student.mother_name}</td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        student.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {student.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/students/${student.id}`)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/students/${student.id}/edit`)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStudentToDelete(student)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}

            {!list.isLoading && filteredData.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  Nenhum aluno encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!studentToDelete}
        title="Excluir aluno"
        description={`Tem certeza que deseja excluir ${studentToDelete?.full_name || 'este aluno'}? Esta ação não pode ser desfeita.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setStudentToDelete(null)}
        confirmLabel="Excluir"
        destructive
      />
    </div>
  )
}
