import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Check, ThumbsUp, Plus, Search, ArrowRight } from 'lucide-react'
import { useCrud } from '@/hooks/useCrud'
import { smeService } from '@/services/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { ScopeBar, useScope } from '@/components/ui/ScopeBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Field, Select, Textarea } from '@/components/ui/Field'
import { FormError } from '@/components/feedback/FormError'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import type { TransferRequest, CreateTransferRequestPayload } from '@/types/api'
import { formatDate } from '@/utils/formatting'
import { labelOf, TRANSFER_STATUS } from '@/components/ui/statusMaps'
import { TransferTimeline } from '../components/TransferTimeline'
import { useStudentsQuery } from '../hooks/useStudentsQuery'
import { useSchoolsQuery } from '../hooks/useSchoolsQuery'
import { useAcademicYearsQuery } from '../hooks/useAcademicYearsQuery'
import { transferSchema, type TransferFormData } from '../schemas/transferSchema'

type PendingAction = { type: 'authorize' | 'accept'; id: string } | null

const toneOf = (status: string) => TRANSFER_STATUS[status]?.tone ?? 'neutral'

export default function TransfersPage() {
  const queryClient = useQueryClient()
  const scope = useScope()
  const { list } = useCrud<TransferRequest>('sme/transfers/', 'transfers')
  const [term, setTerm] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<unknown>(null)

  const studentsQuery = useStudentsQuery()
  const schoolsQuery = useSchoolsQuery()
  const academicYearsQuery = useAcademicYearsQuery()
  const students = studentsQuery.data?.results || []
  const schools = schoolsQuery.data?.results || []
  const academicYears = academicYearsQuery.data?.results || []

  const methods = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      student: '',
      origin_school: '',
      destination_school: '',
      academic_year: '',
      reason: '',
    },
  })
  const { register, handleSubmit, reset } = methods

  const q = term.toLowerCase()
  const rows =
    list.data?.results?.filter(
      (t: TransferRequest) =>
        t.student_name?.toLowerCase().includes(q) ||
        t.origin_school_name?.toLowerCase().includes(q)
    ) || []

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['transfers', 'list'] })

  const runAction = async (action: PendingAction) => {
    if (!action) {return}
    setBusyId(action.id)
    try {
      if (action.type === 'authorize') {
        await smeService.transfers.authorize(action.id)
        toast.success('Transferência autorizada.')
      } else {
        await smeService.transfers.accept(action.id)
        toast.success('Transferência aceita.')
      }
      invalidate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao processar a transferência.')
    } finally {
      setBusyId(null)
      setPendingAction(null)
    }
  }

  const closeForm = () => {
    setShowForm(false)
    setFormError(null)
    reset()
  }

  const onCreate = async (data: TransferFormData) => {
    setFormError(null)
    setCreating(true)
    try {
      const payload: CreateTransferRequestPayload = {
        student: data.student,
        origin_school: data.origin_school,
        destination_school: data.destination_school || null,
        academic_year: data.academic_year,
        reason: data.reason,
      }
      await smeService.transfers.create(payload as unknown as Record<string, unknown>)
      toast.success('Solicitação de transferência criada.')
      invalidate()
      closeForm()
    } catch (error) {
      setFormError(error)
    } finally {
      setCreating(false)
    }
  }

  if (list.isError) {
    return (
      <>
        <PageHeader title="Transferências" />
        <EmptyState title="Erro ao carregar" description="Não foi possível carregar as transferências." />
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Vida escolar' }, { label: 'Transferências' }]}
        title="Transferências"
        meta="Central de vagas e movimentação entre escolas."
        actions={
          <Button
            variant={showForm ? 'secondary' : 'primary'}
            iconLeft={<Plus className="h-4 w-4" />}
            onClick={() => (showForm ? closeForm() : setShowForm(true))}
          >
            {showForm ? 'Fechar' : 'Nova transferência'}
          </Button>
        }
      />
      <ScopeBar level={scope.level} title={scope.title} />

      {showForm && (
        <FormProvider {...methods}>
          <form
            onSubmit={handleSubmit(onCreate)}
            className="grid gap-4 rounded-lg border border-line bg-white p-6"
          >
            <h2 className="text-section text-ink-900">Nova solicitação de transferência</h2>
            {!!formError && <FormError error={formError} />}
            <fieldset disabled={creating} className="grid gap-4 sm:grid-cols-2">
              <Field label="Aluno" name="student" required>
                <Select {...register('student')}>
                  <option value="">Selecionar</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Ano letivo" name="academic_year" required>
                <Select {...register('academic_year')}>
                  <option value="">Selecionar</option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.year}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Escola de origem" name="origin_school" required>
                <Select {...register('origin_school')}>
                  <option value="">Selecionar</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Escola de destino"
                name="destination_school"
                help="Vazio = transferência para fora do município"
              >
                <Select {...register('destination_school')}>
                  <option value="">Externa ao município</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Motivo" name="reason" required className="sm:col-span-2">
                <Textarea rows={3} {...register('reason')} />
              </Field>
            </fieldset>
            <div className="flex items-center gap-2">
              <Button type="submit" variant="primary" loading={creating}>
                Criar solicitação
              </Button>
              <Button type="button" variant="secondary" onClick={closeForm}>
                Cancelar
              </Button>
            </div>
          </form>
        </FormProvider>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar por aluno ou escola de origem…"
          className="h-control w-full rounded border border-line-strong bg-white pl-9 pr-3 text-base"
        />
      </div>

      {list.isLoading ? (
        <TableSkeleton rows={4} cols={2} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Nenhuma transferência"
          description={term ? 'Ajuste a busca.' : 'Não há movimentações registradas.'}
        />
      ) : (
        <ul className="grid gap-3">
          {rows.map((t: TransferRequest) => (
            <li key={t.id} className="grid gap-3 rounded-lg border border-line bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid gap-1">
                  <p className="text-label text-ink-900">{t.student_name || '—'}</p>
                  <p className="flex flex-wrap items-center gap-1.5 text-help text-ink-500">
                    {t.origin_school_name || '—'}
                    <ArrowRight className="h-3.5 w-3.5" />
                    {t.destination_school_name || 'Externa / não definida'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={toneOf(t.status)}>{labelOf(TRANSFER_STATUS, t.status)}</Badge>
                  {t.status === 'PENDING_SME' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={busyId === t.id}
                      iconLeft={<ThumbsUp className="h-4 w-4" />}
                      onClick={() => setPendingAction({ type: 'authorize', id: t.id })}
                    >
                      Autorizar
                    </Button>
                  )}
                  {t.status === 'APPROVED_BY_SME' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={busyId === t.id}
                      iconLeft={<Check className="h-4 w-4" />}
                      onClick={() => setPendingAction({ type: 'accept', id: t.id })}
                    >
                      Aceitar no destino
                    </Button>
                  )}
                </div>
              </div>
              <TransferTimeline status={t.status} />
              <p className="text-help text-ink-400">Solicitada em {formatDate(t.requested_at)}</p>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!pendingAction}
        title={pendingAction?.type === 'authorize' ? 'Autorizar transferência' : 'Aceitar transferência'}
        description={
          pendingAction?.type === 'authorize'
            ? 'Autorizar esta transferência pela SME? A escola de destino poderá então aceitar a vaga.'
            : 'Aceitar a transferência na escola de destino? Uma nova matrícula será criada.'
        }
        onConfirm={() => runAction(pendingAction)}
        onCancel={() => setPendingAction(null)}
        confirmLabel={pendingAction?.type === 'authorize' ? 'Autorizar' : 'Aceitar'}
      />
    </>
  )
}
