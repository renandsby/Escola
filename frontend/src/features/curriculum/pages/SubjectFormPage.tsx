import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/PageHeader'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { FormSection, StickyActions } from '@/components/ui/FormSection'
import { Button } from '@/components/ui/Button'
import { FormError } from '@/components/feedback/FormError'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { apiPost, apiPut } from '@/utils/api-helpers'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/app/routes/paths'
import { subjectSchema, type SubjectFormData } from '../schemas/subjectSchema'
import { fetchSubject } from '../api/subjectsApi'
import { useEducationDepartmentsQuery } from '../hooks/useEducationDepartmentsQuery'

const AREAS = ['Linguagens', 'Matemática', 'Ciências da Natureza', 'Ciências Humanas', 'Ensino Religioso']

export default function SubjectFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id
  const user = useAuthStore((s) => s.user)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<unknown>(null)

  const departmentsQuery = useEducationDepartmentsQuery()
  const departments = departmentsQuery.data?.results ?? []

  const subjectQuery = useQuery({
    queryKey: ['curriculum', 'subject', id],
    queryFn: () => fetchSubject(id as string),
    enabled: isEditing,
  })

  const methods = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
    defaultValues: { education_department: user?.education_department || '', minimum_passing_grade: 6 },
  })
  const { register, handleSubmit, reset } = methods

  useEffect(() => {
    if (subjectQuery.data) {
      const d = subjectQuery.data
      reset({
        education_department: d.education_department,
        name: d.name,
        area_of_knowledge: d.area_of_knowledge,
        bncc_code: d.bncc_code || '',
        description: d.description || '',
        minimum_passing_grade: d.minimum_passing_grade ?? 6,
      })
    }
  }, [subjectQuery.data, reset])

  useEffect(() => {
    if (subjectQuery.isError) {
      toast.error('Erro ao carregar disciplina')
    }
  }, [subjectQuery.isError])

  const onSubmit = async (data: SubjectFormData) => {
    setSubmitError(null)
    setSubmitting(true)
    try {
      if (id) {
        await apiPut(`subjects/${id}/`, data)
        toast.success('Disciplina atualizada.')
      } else {
        await apiPost('subjects/', data)
        toast.success('Disciplina criada.')
      }
      navigate(ROUTES.curriculum)
    } catch (error) {
      setSubmitError(error)
    } finally {
      setSubmitting(false)
    }
  }

  const title = id ? 'Editar disciplina' : 'Nova disciplina'

  if (isEditing && subjectQuery.isLoading) {
    return (
      <>
        <PageHeader breadcrumb={[{ label: 'Currículo', to: ROUTES.curriculum }]} title={title} />
        <TableSkeleton rows={5} cols={2} />
      </>
    )
  }

  return (
    <FormProvider {...methods}>
      <PageHeader
        breadcrumb={[{ label: 'Currículo', to: ROUTES.curriculum }, { label: title }]}
        title={title}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-1">
        {!!submitError && <FormError error={submitError} />}

        <fieldset disabled={submitting} className="grid gap-1">
          <FormSection title="Identificação" description="Nome e código na base municipal." first>
            <Field label="Nome" name="name" required className="sm:col-span-2">
              <Input {...register('name')} />
            </Field>
            <Field label="Área do conhecimento" name="area_of_knowledge" required>
              <Select {...register('area_of_knowledge')}>
                <option value="">Selecionar</option>
                {AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Código BNCC" name="bncc_code" mono help="Ex.: EF05MA01">
              <Input {...register('bncc_code')} />
            </Field>
          </FormSection>

          <FormSection title="Parâmetros" description="Vínculo e critério de aprovação.">
            <Field label="Secretaria Municipal" name="education_department" required>
              <Select {...register('education_department')}>
                <option value="">Selecionar</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.municipality_name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Nota mínima" name="minimum_passing_grade" mono>
              <Input type="number" step="0.1" {...register('minimum_passing_grade')} />
            </Field>
            <Field label="Descrição" name="description" className="sm:col-span-2">
              <Textarea rows={3} {...register('description')} />
            </Field>
          </FormSection>
        </fieldset>

        <StickyActions>
          <Button type="button" variant="secondary" onClick={() => navigate(ROUTES.curriculum)}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={submitting}>
            Salvar
          </Button>
        </StickyActions>
      </form>
    </FormProvider>
  )
}
