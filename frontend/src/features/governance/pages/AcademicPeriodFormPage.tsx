import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/PageHeader'
import { Field, Input } from '@/components/ui/Field'
import { FormSection, StickyActions } from '@/components/ui/FormSection'
import { Button } from '@/components/ui/Button'
import { FormError } from '@/components/feedback/FormError'
import { EmptyState } from '@/components/ui/EmptyState'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { apiPost, apiPut } from '@/utils/api-helpers'
import { ROUTES } from '@/app/routes/paths'
import {
  academicPeriodSchema,
  type AcademicPeriodFormData,
} from '../schemas/academicPeriodSchema'
import { fetchAcademicYear } from '../api/academicYearsApi'
import { fetchAcademicPeriod } from '../api/academicPeriodsApi'

const fmtDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR')

export default function AcademicPeriodFormPage() {
  const navigate = useNavigate()
  const { yearId, periodId } = useParams<{ yearId: string; periodId?: string }>()
  const isEditing = !!periodId
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<unknown>(null)

  const yearQuery = useQuery({
    queryKey: ['academic-year', yearId],
    queryFn: () => fetchAcademicYear(yearId as string),
    enabled: !!yearId,
  })

  const periodQuery = useQuery({
    queryKey: ['academic-period', periodId],
    queryFn: () => fetchAcademicPeriod(periodId as string),
    enabled: isEditing,
  })

  const methods = useForm<AcademicPeriodFormData>({
    resolver: zodResolver(academicPeriodSchema),
    defaultValues: {
      academic_year: yearId || '',
      name: '',
      period_number: 1,
      start_date: '',
      end_date: '',
      grade_deadline: '',
    },
  })
  const { register, handleSubmit, reset } = methods
  const year = yearQuery.data
  const isClosed = year?.status === 'CLOSED'

  useEffect(() => {
    if (periodQuery.data) {
      const d = periodQuery.data
      reset({
        academic_year: d.academic_year,
        name: d.name,
        period_number: d.period_number,
        start_date: d.start_date,
        end_date: d.end_date,
        grade_deadline: d.grade_deadline,
      })
    }
  }, [periodQuery.data, reset])

  useEffect(() => {
    if (periodQuery.isError) {
      toast.error('Erro ao carregar o período.')
    }
  }, [periodQuery.isError])

  const onSubmit = async (data: AcademicPeriodFormData) => {
    setSubmitError(null)
    setSubmitting(true)
    try {
      if (periodId) {
        await apiPut(`sme/academic-periods/${periodId}/`, data)
        toast.success('Bimestre atualizado.')
      } else {
        await apiPost('sme/academic-periods/', data)
        toast.success('Bimestre criado.')
      }
      navigate(ROUTES.academicPeriods(yearId as string))
    } catch (error) {
      setSubmitError(error)
    } finally {
      setSubmitting(false)
    }
  }

  const title = isEditing ? 'Editar bimestre' : 'Novo bimestre'
  const breadcrumb = [
    { label: 'Rede' },
    { label: 'Ano letivo e bimestres', to: ROUTES.academicYear },
    {
      label: year ? `Bimestres ${year.year}` : 'Bimestres',
      to: ROUTES.academicPeriods(yearId as string),
    },
    { label: title },
  ]

  if (yearQuery.isLoading || (isEditing && periodQuery.isLoading)) {
    return (
      <>
        <PageHeader breadcrumb={breadcrumb} title={title} />
        <TableSkeleton rows={5} cols={2} />
      </>
    )
  }

  if (yearQuery.isError || !year) {
    return (
      <>
        <PageHeader breadcrumb={breadcrumb} title={title} />
        <EmptyState
          title="Ano letivo não encontrado"
          description="O registro foi removido ou está fora do seu escopo."
        />
      </>
    )
  }

  return (
    <FormProvider {...methods}>
      <PageHeader
        breadcrumb={breadcrumb}
        title={title}
        meta={`Ano letivo ${year.year} · ${fmtDate(year.start_date)} a ${fmtDate(year.end_date)}`}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-1">
        {!!submitError && <FormError error={submitError} />}

        {isClosed && (
          <p className="rounded border border-warn-border bg-warn-bg p-3 text-help text-warn-fg">
            Ano letivo encerrado — não é possível criar ou editar períodos.
          </p>
        )}

        <fieldset disabled={submitting || isClosed} className="grid gap-1">
          <input type="hidden" {...register('academic_year')} />

          <FormSection
            title="Identificação"
            description="Nome e numeração do período avaliativo."
            first
          >
            <Field label="Nome" name="name" required help='Ex.: "1º Bimestre"'>
              <Input {...register('name')} maxLength={50} />
            </Field>
            <Field label="Número do período" name="period_number" required mono>
              <Input type="number" min="1" max="12" {...register('period_number')} />
            </Field>
          </FormSection>

          <FormSection
            title="Datas"
            description="Duração do período e prazo para lançamento de notas."
          >
            <Field label="Data de início" name="start_date" required>
              <Input
                type="date"
                min={year.start_date}
                max={year.end_date}
                {...register('start_date')}
              />
            </Field>
            <Field label="Data de término" name="end_date" required>
              <Input
                type="date"
                min={year.start_date}
                max={year.end_date}
                {...register('end_date')}
              />
            </Field>
            <Field
              label="Prazo de lançamento de notas"
              name="grade_deadline"
              required
              help="Igual ou posterior ao término do período."
            >
              <Input type="date" min={year.start_date} {...register('grade_deadline')} />
            </Field>
          </FormSection>
        </fieldset>

        <StickyActions>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(ROUTES.academicPeriods(yearId as string))}
          >
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={submitting} disabled={isClosed}>
            {isEditing ? 'Salvar' : 'Criar bimestre'}
          </Button>
        </StickyActions>
      </form>
    </FormProvider>
  )
}
