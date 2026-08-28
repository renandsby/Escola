import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { TeacherAllocation } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { getErrorMessage } from '@/utils/api-helpers'
import { ArrowLeft, Plus, Trash2, X } from 'lucide-react'
import { createTeacherAllocation, deleteTeacherAllocation } from '../api/teachersApi'
import { useAllocationOptions } from '../hooks/useAllocationOptions'
import { useTeacherAllocationsQuery } from '../hooks/useTeacherAllocationsQuery'
import { allocationSchema, type AllocationFormData } from '../schemas/allocationSchema'

const SKELETON_ROWS = 5
const FIELD = 'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm sm:text-sm'

export default function AllocationsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const allocations = useTeacherAllocationsQuery()
  const { teachers, schoolClasses, subjects } = useAllocationOptions()
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [toDelete, setToDelete] = useState<TeacherAllocation | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AllocationFormData>({
    resolver: zodResolver(allocationSchema),
    defaultValues: { is_regent: false },
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['classes', 'teacher-allocations'] })

  const createMutation = useMutation({
    mutationFn: (data: AllocationFormData) =>
      createTeacherAllocation({
        teacher_profile: data.teacher_profile,
        school_class: data.school_class,
        subject: data.subject || null,
        is_regent: !!data.is_regent,
      }),
    onSuccess: () => {
      toast.success('Alocação criada com sucesso!')
      invalidate()
      reset({ is_regent: false })
      setShowForm(false)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteTeacherAllocation(id),
    onSuccess: () => {
      toast.success('Alocação removida.')
      invalidate()
    },
    onError: (error) => toast.error(getErrorMessage(error)),
    onSettled: () => setToDelete(null),
  })

  const term = searchTerm.toLowerCase()
  const filteredData = (allocations.data?.results ?? []).filter(
    (a: TeacherAllocation) =>
      a.teacher_name?.toLowerCase().includes(term) ||
      a.school_class_name?.toLowerCase().includes(term) ||
      a.subject_name?.toLowerCase().includes(term)
  )

  if (allocations.isError) {
    return <div className="p-6 text-red-600">Erro ao carregar alocações</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/teachers')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Alocações Docentes</h1>
            <p className="text-gray-600 mt-1">Professores alocados em turmas e disciplinas</p>
          </div>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {showForm ? 'Fechar' : 'Nova Alocação'}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit((data) => createMutation.mutate(data))}
          className="bg-white rounded-lg shadow p-6"
        >
          <fieldset disabled={createMutation.isPending} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Professor</label>
              <select {...register('teacher_profile')} className={FIELD}>
                <option value="">Selecionar</option>
                {(teachers.data?.results ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.user_name || t.registration_number}
                  </option>
                ))}
              </select>
              {errors.teacher_profile && (
                <p className="mt-1 text-sm text-red-600">{errors.teacher_profile.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Turma</label>
              <select {...register('school_class')} className={FIELD}>
                <option value="">Selecionar</option>
                {(schoolClasses.data?.results ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.school_name ? ` — ${c.school_name}` : ''}
                  </option>
                ))}
              </select>
              {errors.school_class && (
                <p className="mt-1 text-sm text-red-600">{errors.school_class.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Disciplina <span className="text-gray-400">(opcional — vazio = regente)</span>
              </label>
              <select {...register('subject')} className={FIELD}>
                <option value="">Sem disciplina (unidocente / regente)</option>
                {(subjects.data?.results ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" id="is_regent" {...register('is_regent')} className="rounded" />
              <label htmlFor="is_regent" className="text-sm text-gray-700">
                Professor regente da turma
              </label>
            </div>
          </fieldset>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Salvando...' : 'Alocar'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset({ is_regent: false })
                setShowForm(false)
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <input
          type="text"
          placeholder="Buscar por professor, turma ou disciplina..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Professor</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Turma</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Disciplina</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Regente</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {allocations.isLoading &&
              Array.from({ length: SKELETON_ROWS }).map((_, index) => (
                <tr key={`skeleton-${index}`}>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-5 w-12 rounded-full" /></td>
                  <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-10 ml-auto" /></td>
                </tr>
              ))}

            {!allocations.isLoading &&
              filteredData.map((allocation: TeacherAllocation) => (
                <tr key={allocation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {allocation.teacher_name || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {allocation.school_class_name || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {allocation.subject_name || 'Unidocente / regente'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        allocation.is_regent
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {allocation.is_regent ? 'Sim' : 'Não'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="outline" size="sm" onClick={() => setToDelete(allocation)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}

            {!allocations.isLoading && filteredData.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  Nenhuma alocação encontrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!toDelete}
        title="Remover alocação"
        description={`Remover a alocação de ${toDelete?.teacher_name || 'este professor'} em ${toDelete?.school_class_name || 'esta turma'}?`}
        onConfirm={() => toDelete && removeMutation.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
        confirmLabel="Remover"
        destructive
      />
    </div>
  )
}
