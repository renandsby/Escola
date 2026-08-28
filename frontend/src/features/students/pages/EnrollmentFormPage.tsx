import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/PageHeader'
import { Field, Input, Select } from '@/components/ui/Field'
import { FormSection, StickyActions } from '@/components/ui/FormSection'
import { Button } from '@/components/ui/Button'
import { FormError } from '@/components/feedback/FormError'
import { apiPost } from '@/utils/api-helpers'
import { ROUTES } from '@/app/routes/paths'
import { useStudentsQuery } from '../hooks/useStudentsQuery'
import { useSchoolClassesQuery } from '../hooks/useSchoolClassesQuery'

const enrollmentSchema = z.object({
  student: z.string().min(1, 'Aluno é obrigatório'),
  school_class: z.string().min(1, 'Turma é obrigatória'),
  enrollment_number: z.string().min(1, 'Número da matrícula é obrigatório'),
})

type EnrollmentFormData = z.infer<typeof enrollmentSchema>

export default function EnrollmentFormPage() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<unknown>(null)

  const studentsQuery = useStudentsQuery()
  const classesQuery = useSchoolClassesQuery()
  const students = studentsQuery.data?.results || []
  const classes = classesQuery.data?.results || []

  const methods = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: { student: '', school_class: '', enrollment_number: '' },
  })
  const { register, handleSubmit } = methods

  const onSubmit = async (data: EnrollmentFormData) => {
    setSubmitError(null)
    setSubmitting(true)
    try {
      await apiPost('enrollments/', data)
      toast.success('Matrícula criada.')
      navigate(ROUTES.enrollments)
    } catch (error) {
      setSubmitError(error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormProvider {...methods}>
      <PageHeader
        breadcrumb={[{ label: 'Matrículas', to: ROUTES.enrollments }, { label: 'Nova matrícula' }]}
        title="Nova matrícula"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-1">
        {!!submitError && <FormError error={submitError} />}

        <fieldset disabled={submitting} className="grid gap-1">
          <FormSection title="Vínculo" description="Aluno e turma de destino." first>
            <Field label="Aluno" name="student" required className="sm:col-span-2">
              <Select {...register('student')} disabled={studentsQuery.isLoading}>
                <option value="">
                  {studentsQuery.isLoading ? 'Carregando…' : 'Selecionar'}
                </option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Turma" name="school_class" required className="sm:col-span-2">
              <Select {...register('school_class')} disabled={classesQuery.isLoading}>
                <option value="">
                  {classesQuery.isLoading ? 'Carregando…' : 'Selecionar'}
                </option>
                {classes.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.school_name ? `${sc.name} — ${sc.school_name}` : sc.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Número da matrícula"
              name="enrollment_number"
              required
              mono
              className="sm:col-span-2"
            >
              <Input {...register('enrollment_number')} placeholder="Ex.: MAT2026000123" />
            </Field>
          </FormSection>
        </fieldset>

        <StickyActions>
          <Button type="button" variant="secondary" onClick={() => navigate(ROUTES.enrollments)}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={submitting}>
            Criar matrícula
          </Button>
        </StickyActions>
      </form>
    </FormProvider>
  )
}
