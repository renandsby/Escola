import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Plus, Search } from 'lucide-react'
import { useCrud } from '@/hooks/useCrud'
import { useAuthStore } from '@/stores/authStore'
import { apiPost } from '@/utils/api-helpers'
import type { DescriptiveEvaluation } from '@/types/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { ScopeBar, useScope } from '@/components/ui/ScopeBar'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Field, Select, Textarea } from '@/components/ui/Field'
import { FormError } from '@/components/feedback/FormError'
import { ROUTES } from '@/app/routes/paths'
import { DIARY_TABS } from '../diaryTabs'
import { useEnrollmentsQuery } from '../hooks/useEnrollmentsQuery'
import { useAcademicPeriodsQuery } from '../hooks/useAcademicPeriodsQuery'
import {
  descriptiveEvaluationSchema,
  type DescriptiveEvaluationFormData,
} from '../schemas/descriptiveEvaluationSchema'

export default function DescriptiveEvaluationsPage() {
  const user = useAuthStore((state) => state.user)
  const scope = useScope()
  const queryClient = useQueryClient()
  const { list } = useCrud<DescriptiveEvaluation>('evaluations/', 'evaluations')
  const [term, setTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<unknown>(null)

  const enrollmentsQuery = useEnrollmentsQuery()
  const periodsQuery = useAcademicPeriodsQuery()
  const enrollments = enrollmentsQuery.data?.results || []
  const periods = periodsQuery.data?.results || []

  const methods = useForm<DescriptiveEvaluationFormData>({
    resolver: zodResolver(descriptiveEvaluationSchema),
    defaultValues: { enrollment: '', academic_period: '', development_report: '' },
  })
  const { register, handleSubmit, reset } = methods

  const q = term.toLowerCase()
  const rows =
    list.data?.results?.filter(
      (ev: DescriptiveEvaluation) =>
        ev.student_name?.toLowerCase().includes(q) ||
        ev.academic_period_name?.toLowerCase().includes(q)
    ) || []

  const closeForm = () => {
    setShowForm(false)
    setSubmitError(null)
    reset()
  }

  const onSubmit = async (data: DescriptiveEvaluationFormData) => {
    setSubmitError(null)
    setSubmitting(true)
    try {
      await apiPost('evaluations/', { ...data, teacher: user?.id })
      queryClient.invalidateQueries({ queryKey: ['evaluations', 'list'] })
      toast.success('Parecer registrado.')
      closeForm()
    } catch (error) {
      setSubmitError(error)
    } finally {
      setSubmitting(false)
    }
  }

  const columns: Column<DescriptiveEvaluation>[] = [
    { key: 'student', header: 'Aluno', render: (ev) => ev.student_name || '—' },
    { key: 'period', header: 'Período', render: (ev) => ev.academic_period_name || '—' },
    { key: 'teacher', header: 'Professor', render: (ev) => ev.teacher_name || '—' },
    {
      key: 'report',
      header: 'Resumo',
      render: (ev) => (
        <span className="line-clamp-1 max-w-md text-ink-500">{ev.development_report || '—'}</span>
      ),
    },
  ]

  if (list.isError) {
    return (
      <>
        <PageHeader title="Diário de classe" />
        <EmptyState title="Erro ao carregar" description="Não foi possível carregar os pareceres." />
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Diário de classe' }, { label: 'Pareceres' }]}
        title="Diário de classe"
        meta={<Badge tone="qual" shape="diamond">Avaliação qualitativa</Badge>}
        tabs={DIARY_TABS}
        activeTab={ROUTES.diaryEvaluations}
        actions={
          <Button
            variant={showForm ? 'secondary' : 'primary'}
            iconLeft={<Plus className="h-4 w-4" />}
            onClick={() => (showForm ? closeForm() : setShowForm(true))}
          >
            {showForm ? 'Fechar' : 'Novo parecer'}
          </Button>
        }
      />
      <ScopeBar level={scope.level} title={scope.title} />

      {showForm && (
        <FormProvider {...methods}>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="grid gap-4 rounded-lg border border-line bg-white p-6"
          >
            <h2 className="text-section text-ink-900">Parecer descritivo</h2>
            {!!submitError && <FormError error={submitError} />}
            <fieldset disabled={submitting} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Matrícula" name="enrollment" required>
                  <Select {...register('enrollment')}>
                    <option value="">Selecionar</option>
                    {enrollments.map((enr) => (
                      <option key={enr.id} value={enr.id}>
                        {enr.student_name} — {enr.school_class_name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Período" name="academic_period" required>
                  <Select {...register('academic_period')}>
                    <option value="">Selecionar</option>
                    {periods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field
                label="Relatório de desenvolvimento"
                name="development_report"
                required
                help="Descreva avanços, marcos da BNCC alcançados e pontos de atenção."
              >
                <Textarea rows={6} {...register('development_report')} />
              </Field>
            </fieldset>
            <div className="flex items-center gap-2">
              <Button type="submit" variant="primary" loading={submitting}>
                Salvar parecer
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
          placeholder="Buscar por aluno ou período…"
          className="h-control w-full rounded border border-line-strong bg-white pl-9 pr-3 text-base"
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(ev) => ev.id}
        isLoading={list.isLoading}
        empty={
          <EmptyState
            title="Nenhum parecer"
            description={term ? 'Ajuste a busca.' : 'Registre pareceres da Educação Infantil e do AEE.'}
          />
        }
      />
    </>
  )
}
