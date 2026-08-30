import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/PageHeader'
import { Field, Input, Select } from '@/components/ui/Field'
import { FormSection, StickyActions } from '@/components/ui/FormSection'
import { Button } from '@/components/ui/Button'
import { FormError } from '@/components/feedback/FormError'
import { EmptyState } from '@/components/ui/EmptyState'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { apiPost, apiPut } from '@/utils/api-helpers'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/app/routes/paths'
import {
  academicYearSchema,
  type AcademicYearFormData,
} from '../schemas/academicYearSchema'
import { fetchAcademicYear } from '../api/academicYearsApi'
import { useMyDepartmentQuery } from '../hooks/useDepartmentQuery'

const STATUS_OPTIONS: { value: AcademicYearFormData['status']; label: string }[] = [
  { value: 'PLANNED', label: 'Planejado' },
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'CLOSED', label: 'Encerrado' },
]

export default function AcademicYearFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id
  const user = useAuthStore((s) => s.user)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<unknown>(null)

  const department = useMyDepartmentQuery(user?.education_department)

  const yearQuery = useQuery({
    queryKey: ['academic-year', id],
    queryFn: () => fetchAcademicYear(id as string),
    enabled: isEditing,
  })

  const methods = useForm<AcademicYearFormData>({
    resolver: zodResolver(academicYearSchema),
    defaultValues: {
      education_department: user?.education_department || '',
      status: 'PLANNED',
      year: new Date().getFullYear(),
      start_date: '',
      end_date: '',
    },
  })
  const { register, handleSubmit, reset, watch } = methods
  const status = watch('status')
  const isClosed = status === 'CLOSED'

  useEffect(() => {
    if (yearQuery.data) {
      const d = yearQuery.data
      reset({
        education_department: d.education_department,
        year: d.year,
        status: d.status,
        start_date: d.start_date,
        end_date: d.end_date,
      })
    }
  }, [yearQuery.data, reset])

  useEffect(() => {
    if (department.data && !isEditing) {
      methods.setValue('education_department', department.data.id)
    }
  }, [department.data, isEditing, methods])

  useEffect(() => {
    if (yearQuery.isError) {
      toast.error('Erro ao carregar o ano letivo.')
    }
  }, [yearQuery.isError])

  const onSubmit = async (data: AcademicYearFormData) => {
    setSubmitError(null)
    setSubmitting(true)
    try {
      if (id) {
        await apiPut(`sme/academic-years/${id}/`, data)
        toast.success('Ano letivo atualizado.')
      } else {
        await apiPost('sme/academic-years/', data)
        toast.success('Ano letivo criado.')
      }
      navigate(ROUTES.academicYear)
    } catch (error) {
      setSubmitError(error)
    } finally {
      setSubmitting(false)
    }
  }

  const title = isEditing ? 'Editar ano letivo' : 'Novo ano letivo'
  const breadcrumb = [
    { label: 'Rede' },
    { label: 'Ano letivo e bimestres', to: ROUTES.academicYear },
    { label: title },
  ]

  if (isEditing && yearQuery.isLoading) {
    return (
      <>
        <PageHeader breadcrumb={breadcrumb} title={title} />
        <TableSkeleton rows={5} cols={2} />
      </>
    )
  }

  if (isEditing && (yearQuery.isError || !yearQuery.data)) {
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
      <PageHeader breadcrumb={breadcrumb} title={title} />

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-1">
        {!!submitError && <FormError error={submitError} />}

        {isClosed && isEditing && (
          <p className="rounded border border-warn-border bg-warn-bg p-3 text-help text-warn-fg">
            Ano letivo encerrado — as alterações são bloqueadas no servidor.
          </p>
        )}

        <fieldset disabled={submitting} className="grid gap-1">
          <FormSection
            title="Identificação"
            description="Ano e secretaria responsável."
            first
          >
            <Field label="Secretaria Municipal" name="education_department" required>
              <Select {...register('education_department')} disabled>
                <option value={department.data?.id ?? ''}>
                  {department.data?.municipality_name ?? 'Carregando…'}
                </option>
              </Select>
            </Field>

            <Field label="Ano" name="year" required mono>
              <Input type="number" min="2020" max="2100" {...register('year')} disabled={isClosed} />
            </Field>

            <Field label="Status" name="status" required>
              <Select {...register('status')}>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </Field>
          </FormSection>

          <FormSection
            title="Vigência"
            description="Datas de início e término do ano letivo."
          >
            <Field label="Data de início" name="start_date" required>
              <Input type="date" {...register('start_date')} disabled={isClosed} />
            </Field>
            <Field label="Data de término" name="end_date" required>
              <Input type="date" {...register('end_date')} disabled={isClosed} />
            </Field>
          </FormSection>
        </fieldset>

        <StickyActions>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(ROUTES.academicYear)}
          >
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={submitting} disabled={isClosed}>
            {isEditing ? 'Salvar' : 'Criar ano letivo'}
          </Button>
        </StickyActions>
      </form>
    </FormProvider>
  )
}
