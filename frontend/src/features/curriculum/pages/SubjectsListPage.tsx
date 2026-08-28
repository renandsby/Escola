import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useCrud } from '@/hooks/useCrud'
import type { Subject } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { getErrorMessage } from '@/utils/api-helpers'
import { Plus, Trash2, Edit } from 'lucide-react'

const SKELETON_ROWS = 5

export default function SubjectsListPage() {
  const navigate = useNavigate()
  const { list, delete_ } = useCrud<Subject>('subjects/', 'subjects')
  const [searchTerm, setSearchTerm] = useState('')
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null)

  const handleDeleteConfirm = async () => {
    if (!subjectToDelete) {
      return
    }
    try {
      await delete_.mutateAsync(subjectToDelete.id)
      toast.success('Disciplina excluída com sucesso!')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSubjectToDelete(null)
    }
  }

  const term = searchTerm.toLowerCase()
  const filteredData = (list.data?.results ?? []).filter(
    (subject: Subject) =>
      subject.name?.toLowerCase().includes(term) ||
      subject.bncc_code?.toLowerCase().includes(term) ||
      subject.area_of_knowledge?.toLowerCase().includes(term)
  )

  if (list.isError) {
    return <div className="p-6 text-red-600">Erro ao carregar disciplinas</div>
  }

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
          placeholder="Buscar por nome, BNCC ou área..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">BNCC</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Nome</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                Área do conhecimento
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Nota mínima</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {list.isLoading &&
              Array.from({ length: SKELETON_ROWS }).map((_, index) => (
                <tr key={`skeleton-${index}`}>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-36" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-10" /></td>
                  <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-20 ml-auto" /></td>
                </tr>
              ))}

            {!list.isLoading &&
              filteredData.map((subject: Subject) => (
                <tr key={subject.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {subject.bncc_code || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{subject.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{subject.area_of_knowledge}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {subject.minimum_passing_grade ?? '—'}
                  </td>
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
                      onClick={() => setSubjectToDelete(subject)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}

            {!list.isLoading && filteredData.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  Nenhuma disciplina encontrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!subjectToDelete}
        title="Excluir disciplina"
        description={`Tem certeza que deseja excluir ${subjectToDelete?.name || 'esta disciplina'}? Esta ação não pode ser desfeita.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setSubjectToDelete(null)}
        confirmLabel="Excluir"
        destructive
      />
    </div>
  )
}
