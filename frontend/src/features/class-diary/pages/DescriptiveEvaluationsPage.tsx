import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useCrud } from '@/hooks/useCrud'
import { useAuthStore } from '@/stores/authStore'
import { apiPost, getErrorMessage } from '@/utils/api-helpers'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/Skeleton'
import type { DescriptiveEvaluation } from '@/types/api'
import { Plus } from 'lucide-react'
import { useEnrollmentsQuery } from '../hooks/useEnrollmentsQuery'
import { useAcademicPeriodsQuery } from '../hooks/useAcademicPeriodsQuery'
import {
  descriptiveEvaluationSchema,
  type DescriptiveEvaluationFormData,
} from '../schemas/descriptiveEvaluationSchema'

const SKELETON_ROWS = 5

export default function DescriptiveEvaluationsPage() {
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const { list } = useCrud<DescriptiveEvaluation>('evaluations/', 'evaluations')
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const enrollmentsQuery = useEnrollmentsQuery()
  const periodsQuery = useAcademicPeriodsQuery()
  const enrollments = enrollmentsQuery.data?.results || []
  const periods = periodsQuery.data?.results || []

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DescriptiveEvaluationFormData>({
    resolver: zodResolver(descriptiveEvaluationSchema),
    defaultValues: {
      enrollment: '',
      academic_period: '',
      development_report: '',
    },
  })

  const filteredData =
    list.data?.results?.filter(
      (ev: DescriptiveEvaluation) =>
        ev.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ev.academic_period_name?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || []

  const handleCancelForm = () => {
    setShowForm(false)
    reset()
  }

  const onSubmit = async (data: DescriptiveEvaluationFormData) => {
    try {
      setSubmitting(true)
      await apiPost('evaluations/', {
        ...data,
        teacher: user?.id,
      })
      queryClient.invalidateQueries({ queryKey: ['evaluations', 'list'] })
      toast.success('Parecer criado com sucesso!')
      setShowForm(false)
      reset()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  if (list.isError) {
    return <div className="p-6 text-red-600">Erro ao carregar pareceres</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pareceres Descritivos</h1>
          <p className="text-gray-600 mt-1">Avaliações qualitativas (Educação Infantil / AEE)</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Parecer
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow p-6 space-y-4">
          <fieldset disabled={submitting}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Matrícula</label>
                <select
                  {...register('enrollment')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Selecionar</option>
                  {enrollments.map((enr) => (
                    <option key={enr.id} value={enr.id}>
                      {enr.student_name} — {enr.school_class_name}
                    </option>
                  ))}
                </select>
                {errors.enrollment && (
                  <p className="mt-1 text-sm text-red-600">{errors.enrollment.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
                <select
                  {...register('academic_period')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Selecionar</option>
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {errors.academic_period && (
                  <p className="mt-1 text-sm text-red-600">{errors.academic_period.message}</p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Relatório de desenvolvimento
              </label>
              <textarea
                {...register('development_report')}
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
              />
              {errors.development_report && (
                <p className="mt-1 text-sm text-red-600">{errors.development_report.message}</p>
              )}
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancelForm} disabled={submitting}>
                Cancelar
              </Button>
            </div>
          </fieldset>
        </form>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <input
          type="text"
          placeholder="Buscar por aluno ou período..."
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
              <th className="px-4 py-3 text-left font-medium text-gray-700">Período</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Professor</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Resumo</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {list.isLoading &&
              Array.from({ length: SKELETON_ROWS }).map((_, index) => (
                <tr key={`skeleton-${index}`}>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-48" />
                  </td>
                </tr>
              ))}

            {!list.isLoading &&
              filteredData.map((ev: DescriptiveEvaluation) => (
                <tr key={ev.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{ev.student_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{ev.academic_period_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{ev.teacher_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-md truncate">
                    {ev.development_report || '—'}
                  </td>
                </tr>
              ))}
            {!list.isLoading && filteredData.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  Nenhum parecer encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
