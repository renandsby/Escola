import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { TeacherProfile } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { getErrorMessage } from '@/utils/api-helpers'
import { Plus, Edit, Trash2, UserCog } from 'lucide-react'
import { deleteTeacher } from '../api/teachersApi'
import { useTeachersQuery } from '../hooks/useTeachersQuery'

const SKELETON_ROWS = 5

export default function TeachersListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const teachers = useTeachersQuery()
  const [searchTerm, setSearchTerm] = useState('')
  const [teacherToDelete, setTeacherToDelete] = useState<TeacherProfile | null>(null)

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteTeacher(id),
    onSuccess: () => {
      toast.success('Professor removido com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['classes', 'teachers'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
    onSettled: () => setTeacherToDelete(null),
  })

  const term = searchTerm.toLowerCase()
  const filteredData = (teachers.data?.results ?? []).filter(
    (t: TeacherProfile) =>
      t.user_name?.toLowerCase().includes(term) ||
      t.registration_number?.toLowerCase().includes(term) ||
      t.cpf?.includes(term) ||
      t.formation_area?.toLowerCase().includes(term)
  )

  if (teachers.isError) {
    return <div className="p-6 text-red-600">Erro ao carregar professores</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Professores</h1>
          <p className="text-gray-600 mt-1">Quadro docente da rede municipal</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/teachers/allocations')}>
            <UserCog className="w-4 h-4 mr-2" />
            Alocações
          </Button>
          <Button onClick={() => navigate('/teachers/create')}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Professor
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <input
          type="text"
          placeholder="Buscar por nome, matrícula, CPF ou área de formação..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Matrícula</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Nome</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                Área de formação
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Status</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {teachers.isLoading &&
              Array.from({ length: SKELETON_ROWS }).map((_, index) => (
                <tr key={`skeleton-${index}`}>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                  <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-20 ml-auto" /></td>
                </tr>
              ))}

            {!teachers.isLoading &&
              filteredData.map((teacher: TeacherProfile) => (
                <tr key={teacher.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {teacher.registration_number}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{teacher.user_name || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {teacher.formation_area || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        teacher.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {teacher.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/teachers/${teacher.id}/edit`)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTeacherToDelete(teacher)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}

            {!teachers.isLoading && filteredData.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  Nenhum professor cadastrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!teacherToDelete}
        title="Remover professor"
        description={`Remover ${teacherToDelete?.user_name || 'este professor'} do quadro? As alocações associadas também serão removidas.`}
        onConfirm={() => teacherToDelete && removeMutation.mutate(teacherToDelete.id)}
        onCancel={() => setTeacherToDelete(null)}
        confirmLabel="Remover"
        destructive
      />
    </div>
  )
}
