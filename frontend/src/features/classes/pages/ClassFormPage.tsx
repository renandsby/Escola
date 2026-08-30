import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/PageHeader'
import { Field, Input, Select } from '@/components/ui/Field'
import { FormSection } from '@/components/ui/FormSection'
import { Button } from '@/components/ui/Button'
import { FormError } from '@/components/feedback/FormError'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/app/routes/paths'
import { useSchoolsQuery } from '@/features/students/hooks/useSchoolsQuery'
import { useAcademicYearsQuery } from '@/features/students/hooks/useAcademicYearsQuery'
import { useCurriculumMatricesQuery } from '@/features/governance/hooks/useCurriculumMatricesQuery'
import { classSchema, SHIFT_OPTIONS, type ClassFormData } from '../schemas/classSchema'
import { createClass, fetchClass, fetchClassrooms, updateClass } from '../api/classesApi'

const SCHOOL_ROLES = ['school_director', 'school_secretary']

export default function ClassFormPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id } = useParams()
  const isEditing = !!id
  const user = useAuthStore((s) => s.user)
  const lockedSchool = SCHOOL_ROLES.includes(user?.role ?? '') ? (user?.school ?? '') : ''
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<unknown>(null)

  const schools = useSchoolsQuery().data?.results ?? []
  const years = useAcademicYearsQuery().data?.results ?? []
  const matrices = useCurriculumMatricesQuery().data?.results ?? []

  const classQuery = useQuery({
    queryKey: ['classes', 'detail', id],
    queryFn: () => fetchClass(id as string),
    enabled: isEditing,
  })

  const methods = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: '',
      school: lockedSchool,
      academic_year: '',
      curriculum_matrix: '',
      shift: 'MORNING',
      max_capacity: 30,
      classroom: '',
      room_number: '',
    },
  })
  const { register, handleSubmit, reset, watch } = methods
  const selectedSchool = watch('school')

  const classroomsQuery = useQuery({
    queryKey: ['classrooms', 'by-school', selectedSchool],
    enabled: !!selectedSchool,
    queryFn: () => fetchClassrooms({ school: selectedSchool, page_size: 200 }),
  })

  useEffect(() => {
    if (classQuery.data) {
      const d = classQuery.data
      reset({
        name: d.name,
        school: String(d.school),
        academic_year: String(d.academic_year),
        curriculum_matrix: String(d.curriculum_matrix ?? ''),
        shift: (d.shift as ClassFormData['shift']) ?? 'MORNING',
        max_capacity: d.max_capacity ?? 30,
        classroom: d.classroom ? String(d.classroom) : '',
        room_number: d.room_number ?? '',
      })
    }
  }, [classQuery.data, reset])

  const onSubmit = async (data: ClassFormData) => {
    setSubmitError(null)
    setSubmitting(true)
    try {
      if (id) {
        await updateClass(id, data)
        toast.success('Turma atualizada.')
      } else {
        await createClass(data)
        toast.success('Turma criada.')
      }
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      navigate(ROUTES.classes)
    } catch (error) {
      setSubmitError(error)
    } finally {
      setSubmitting(false)
    }
  }

  const title = id ? 'Editar turma' : 'Nova turma'

  if (isEditing && classQuery.isLoading) {
    return (
      <>
        <PageHeader breadcrumb={[{ label: 'Turmas', to: ROUTES.classes }]} title={title} />
        <TableSkeleton rows={5} cols={2} />
      </>
    )
  }

  return (
    <FormProvider {...methods}>
      <PageHeader
        breadcrumb={[{ label: 'Vida escolar' }, { label: 'Turmas', to: ROUTES.classes }, { label: title }]}
        title={title}
      />
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-1">
        {!!submitError && <FormError error={submitError} />}
        <fieldset disabled={submitting} className="grid gap-1">
          <FormSection title="Identificação" description="Nome, escola e ano letivo da turma." first>
            <Field label="Nome da turma" name="name" required>
              <Input {...register('name')} placeholder="Ex.: 1º Ano A" />
            </Field>
            <Field label="Escola" name="school" required>
              <Select {...register('school')} disabled={!!lockedSchool}>
                <option value="">Selecionar</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Ano letivo" name="academic_year" required>
              <Select {...register('academic_year')}>
                <option value="">Selecionar</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.year}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Matriz curricular" name="curriculum_matrix" required>
              <Select {...register('curriculum_matrix')}>
                <option value="">Selecionar</option>
                {matrices.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </Field>
          </FormSection>

          <FormSection title="Organização" description="Turno, capacidade e sala.">
            <Field label="Turno" name="shift" required>
              <Select {...register('shift')}>
                {SHIFT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Capacidade máxima" name="max_capacity" mono required>
              <Input type="number" min={1} {...register('max_capacity')} />
            </Field>
            <Field label="Sala de aula" name="classroom" help="Opcional">
              <Select {...register('classroom')} disabled={classroomsQuery.isLoading}>
                <option value="">Sem sala fixa</option>
                {(classroomsQuery.data?.results ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    Sala {c.number} · {c.capacity} lugares
                  </option>
                ))}
              </Select>
            </Field>
          </FormSection>

          <div className="flex items-center gap-2 py-4">
            <Button type="submit" variant="primary" loading={submitting}>
              {id ? 'Salvar alterações' : 'Criar turma'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate(ROUTES.classes)}>
              Cancelar
            </Button>
          </div>
        </fieldset>
      </form>
    </FormProvider>
  )
}
