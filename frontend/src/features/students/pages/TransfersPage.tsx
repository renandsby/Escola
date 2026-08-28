import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useCrud } from '@/hooks/useCrud'
import { smeService } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import type { TransferRequest, CreateTransferRequestPayload } from '@/types/api'
import { TRANSFER_STATUS_LABELS } from '@/types/api'
import { formatDate } from '@/utils/formatting'
import { getErrorMessage } from '@/utils/api-helpers'
import { Check, ThumbsUp, Plus } from 'lucide-react'
import { useStudentsQuery } from '../hooks/useStudentsQuery'
import { useSchoolsQuery } from '../hooks/useSchoolsQuery'
import { useAcademicYearsQuery } from '../hooks/useAcademicYearsQuery'
import { transferSchema, type TransferFormData } from '../schemas/transferSchema'

const SKELETON_ROWS = 5

type PendingAction = { type: 'authorize' | 'accept'; id: string } | null

export default function TransfersPage() {
  const queryClient = useQueryClient()
  const { list } = useCrud<TransferRequest>('sme/transfers/', 'transfers')
  const [searchTerm, setSearchTerm] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)

  const studentsQuery = useStudentsQuery()
  const schoolsQuery = useSchoolsQuery()
  const academicYearsQuery = useAcademicYearsQuery()
  const students = studentsQuery.data?.results || []
  const schools = schoolsQuery.data?.results || []
  const academicYears = academicYearsQuery.data?.results || []

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      student: '',
      origin_school: '',
      destination_school: '',
      academic_year: '',
      reason: '',
    },
  })

  const filteredData =
    list.data?.results?.filter(
      (t: TransferRequest) =>
        t.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.origin_school_name?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || []

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['transfers', 'list'] })
  }

  const handleAuthorize = async (id: string) => {
    try {
      setBusyId(id)
      await smeService.transfers.authorize(id)
      toast.success('Transferência autorizada com sucesso!')
      invalidate()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setBusyId(null)
      setPendingAction(null)
    }
  }

  const handleAccept = async (id: string) => {
    try {
      setBusyId(id)
      await smeService.transfers.accept(id)
      toast.success('Transferência aceita com sucesso!')
      invalidate()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setBusyId(null)
      setPendingAction(null)
    }
  }

  const handleConfirmPendingAction = () => {
    if (!pendingAction) {
      return
    }
    if (pendingAction.type === 'authorize') {
      handleAuthorize(pendingAction.id)
    } else {
      handleAccept(pendingAction.id)
    }
  }

  const onCreateSubmit = async (data: TransferFormData) => {
    try {
      setCreating(true)
      const payload: CreateTransferRequestPayload = {
        student: data.student,
        origin_school: data.origin_school,
        destination_school: data.destination_school || null,
        academic_year: data.academic_year,
        reason: data.reason,
      }
      await smeService.transfers.create(payload as unknown as Record<string, unknown>)
      toast.success('Solicitação de transferência criada com sucesso!')
      invalidate()
      setShowCreateForm(false)
      reset()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setCreating(false)
    }
  }

  const handleCancelCreate = () => {
    setShowCreateForm(false)
    reset()
  }

  if (list.isError) {
    return <div className="p-6 text-red-600">Erro ao carregar transferências</div>
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'PENDING_SME':
        return 'bg-yellow-100 text-yellow-800'
      case 'APPROVED_BY_SME':
        return 'bg-blue-100 text-blue-800'
      case 'ACCEPTED_BY_DESTINATION':
        return 'bg-green-100 text-green-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transferências</h1>
          <p className="text-gray-600 mt-1">Central de vagas e movimentação entre escolas</p>
        </div>
        <Button onClick={() => setShowCreateForm((prev) => !prev)}>
          <Plus className="w-4 h-4 mr-1" />
          Nova Transferência
        </Button>
      </div>

      {showCreateForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Nova Solicitação de Transferência</h2>
          <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Aluno</label>
                <select
                  {...register('student')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">Selecionar</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name}
                    </option>
                  ))}
                </select>
                {errors.student && (
                  <p className="mt-1 text-sm text-red-600">{errors.student.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Ano Letivo</label>
                <select
                  {...register('academic_year')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">Selecionar</option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {`${y.year}`}
                    </option>
                  ))}
                </select>
                {errors.academic_year && (
                  <p className="mt-1 text-sm text-red-600">{errors.academic_year.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Escola de Origem</label>
                <select
                  {...register('origin_school')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">Selecionar</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {errors.origin_school && (
                  <p className="mt-1 text-sm text-red-600">{errors.origin_school.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Escola de Destino</label>
                <select
                  {...register('destination_school')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">Externa ao município</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Motivo</label>
                <textarea
                  rows={3}
                  {...register('reason')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                {errors.reason && (
                  <p className="mt-1 text-sm text-red-600">{errors.reason.message}</p>
                )}
              </div>
            </div>

            <div className="flex space-x-4 pt-2">
              <Button type="submit" disabled={creating}>
                Criar Solicitação
              </Button>
              <Button type="button" variant="outline" onClick={handleCancelCreate}>
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <input
          type="text"
          placeholder="Buscar por aluno ou escola de origem..."
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
              <th className="px-4 py-3 text-left font-medium text-gray-700">Origem</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Destino</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Solicitado em</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Ações</th>
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
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Skeleton className="h-8 w-24 ml-auto" />
                  </td>
                </tr>
              ))}

            {!list.isLoading &&
              filteredData.map((transfer: TransferRequest) => (
                <tr key={transfer.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{transfer.student_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{transfer.origin_school_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {transfer.destination_school_name || 'Externa / não definida'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusColor(transfer.status)}`}>
                      {TRANSFER_STATUS_LABELS[transfer.status] || transfer.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(transfer.requested_at)}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {transfer.status === 'PENDING_SME' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === transfer.id}
                        onClick={() => setPendingAction({ type: 'authorize', id: transfer.id })}
                      >
                        <ThumbsUp className="w-4 h-4 mr-1" />
                        Autorizar
                      </Button>
                    )}
                    {transfer.status === 'APPROVED_BY_SME' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === transfer.id}
                        onClick={() => setPendingAction({ type: 'accept', id: transfer.id })}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Aceitar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            {!list.isLoading && filteredData.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Nenhuma transferência encontrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!pendingAction}
        title={pendingAction?.type === 'authorize' ? 'Autorizar transferência' : 'Aceitar transferência'}
        description={
          pendingAction?.type === 'authorize'
            ? 'Autorizar esta transferência pela SME?'
            : 'Aceitar transferência na escola de destino?'
        }
        onConfirm={handleConfirmPendingAction}
        onCancel={() => setPendingAction(null)}
        confirmLabel={pendingAction?.type === 'authorize' ? 'Autorizar' : 'Aceitar'}
        destructive={false}
      />
    </div>
  )
}
