import { useState } from 'react'
import { toast } from 'sonner'
import { useCrud } from '@/hooks/useCrud'
import { type SchoolClass, SHIFT_LABELS } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { getErrorMessage } from '@/utils/api-helpers'
import { Trash2 } from 'lucide-react'

const SKELETON_ROWS = 5

export default function ClassesListPage() {
  const { list, delete_ } = useCrud<SchoolClass>('classes/', 'classes')
  const [searchTerm, setSearchTerm] = useState('')
  const [classToDelete, setClassToDelete] = useState<SchoolClass | null>(null)

  const handleDeleteConfirm = async () => {
    if (!classToDelete) {
      return
    }
    try {
      await delete_.mutateAsync(classToDelete.id)
      toast.success('Turma excluída com sucesso!')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setClassToDelete(null)
    }
  }

  const term = searchTerm.toLowerCase()
  const filteredData = (list.data?.results ?? []).filter(
    (cls: SchoolClass) =>
      cls.name?.toLowerCase().includes(term) ||
      cls.school_name?.toLowerCase().includes(term)
  )

  if (list.isError) {
    return <div className="p-6 text-red-600">Erro ao carregar turmas</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Turmas</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <input
          type="text"
          placeholder="Buscar por nome ou escola..."
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
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Turno</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Escola</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Alunos</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Status</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {list.isLoading &&
              Array.from({ length: SKELETON_ROWS }).map((_, index) => (
                <tr key={`skeleton-${index}`}>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-8" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                  <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-10 ml-auto" /></td>
                </tr>
              ))}

            {!list.isLoading &&
              filteredData.map((cls: SchoolClass) => (
                <tr key={cls.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{cls.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {SHIFT_LABELS[cls.shift] || cls.shift}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{cls.school_name || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{cls.student_count ?? 0}</td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        cls.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {cls.is_active ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setClassToDelete(cls)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}

            {!list.isLoading && filteredData.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Nenhuma turma encontrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!classToDelete}
        title="Excluir turma"
        description={`Tem certeza que deseja excluir ${classToDelete?.name || 'esta turma'}? Esta ação não pode ser desfeita.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setClassToDelete(null)}
        confirmLabel="Excluir"
        destructive
      />
    </div>
  )
}
