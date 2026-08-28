import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/PageHeader'
import { Field, Input, Select, Textarea, Checkbox } from '@/components/ui/Field'
import { FormSection, StickyActions } from '@/components/ui/FormSection'
import { Button } from '@/components/ui/Button'
import { FormError } from '@/components/feedback/FormError'
import { PersonLookupStep } from '@/components/feedback/PersonLookupStep'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { apiGet, apiPost, apiPut } from '@/utils/api-helpers'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/app/routes/paths'
import { GENDER, RACE_COLOR } from '@/components/ui/statusMaps'
import type { PaginatedResponse, Student } from '@/types/api'
import { useEducationDepartmentsQuery } from '../hooks/useEducationDepartmentsQuery'

const studentSchema = z.object({
  education_department: z.string().min(1, 'Secretaria é obrigatória'),
  unique_municipal_id: z.string().min(1, 'ID municipal é obrigatório'),
  full_name: z.string().min(1, 'Nome completo é obrigatório'),
  mother_name: z.string().min(1, 'Nome da mãe é obrigatório'),
  birth_date: z.string().min(1, 'Data de nascimento é obrigatória'),
  social_name: z.string().optional(),
  cpf: z.string().optional(),
  gender: z.string().optional(),
  father_name: z.string().optional(),
  has_special_needs: z.boolean().optional(),
  inep_id: z.string().optional(),
  nis_code: z.string().optional(),
  race_color: z.string().optional(),
  special_needs_details: z.string().optional(),
})

type StudentFormData = z.infer<typeof studentSchema>

export default function StudentFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id
  const user = useAuthStore((state) => state.user)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<unknown>(null)
  const [showForm, setShowForm] = useState(isEditing)

  const departmentsQuery = useEducationDepartmentsQuery()
  const departments = departmentsQuery.data?.results || []

  const studentQuery = useQuery({
    queryKey: ['student', id],
    queryFn: () => apiGet<Student>(`students/${id}/`),
    enabled: isEditing,
  })

  const methods = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      education_department: user?.education_department || '',
      has_special_needs: false,
    },
  })
  const { register, handleSubmit, reset, watch } = methods
  const hasSpecialNeeds = watch('has_special_needs')

  useEffect(() => {
    if (studentQuery.data) {
      const data = studentQuery.data
      reset({
        education_department: data.education_department,
        unique_municipal_id: data.unique_municipal_id,
        full_name: data.full_name,
        mother_name: data.mother_name,
        birth_date: data.birth_date,
        social_name: data.social_name || '',
        cpf: data.cpf || '',
        gender: data.gender || '',
        father_name: data.father_name || '',
        has_special_needs: data.has_special_needs || false,
        inep_id: data.inep_id || '',
        nis_code: data.nis_code || '',
        race_color: data.race_color || '',
        special_needs_details: data.special_needs_details || '',
      })
    }
  }, [studentQuery.data, reset])

  useEffect(() => {
    if (studentQuery.isError) {
      toast.error('Erro ao carregar aluno')
    }
  }, [studentQuery.isError])

  const onSubmit = async (data: StudentFormData) => {
    setSubmitError(null)
    setSubmitting(true)
    try {
      if (id) {
        await apiPut(`students/${id}/`, data)
        toast.success('Aluno atualizado.')
      } else {
        await apiPost('students/', data)
        toast.success('Aluno criado.')
      }
      navigate(ROUTES.students)
    } catch (error) {
      setSubmitError(error)
    } finally {
      setSubmitting(false)
    }
  }

  const title = isEditing ? 'Editar aluno' : 'Novo aluno'

  if (isEditing && studentQuery.isLoading) {
    return (
      <>
        <PageHeader breadcrumb={[{ label: 'Alunos', to: ROUTES.students }]} title={title} />
        <TableSkeleton rows={8} cols={2} />
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Alunos', to: ROUTES.students }, { label: title }]}
        title={title}
      />

      {!isEditing && !showForm && (
        <PersonLookupStep
          title="Buscar aluno na rede"
          placeholder="Nome, ID municipal ou CPF…"
          queryKey="student"
          search={async (term) => {
            const page = await apiGet<PaginatedResponse<Student>>('students/', { search: term })
            return (page?.results ?? []).map((s) => ({
              id: s.id,
              name: s.full_name,
              identifiers: [s.unique_municipal_id, s.cpf].filter(Boolean) as string[],
              detail: s.mother_name ? `mãe: ${s.mother_name}` : undefined,
            }))
          }}
          onPick={(r) => navigate(ROUTES.student(r.id))}
          onSkip={() => setShowForm(true)}
          skipLabel="Nenhum é — cadastrar novo aluno"
        />
      )}

      {showForm && (
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-1">
            {!!submitError && <FormError error={submitError} />}

            <fieldset disabled={submitting} className="grid gap-1">
              <FormSection title="Identificação" description="Dados civis do aluno." first>
                <Field label="Nome completo" name="full_name" required className="sm:col-span-2">
                  <Input {...register('full_name')} />
                </Field>
                <Field label="Nome social" name="social_name">
                  <Input {...register('social_name')} />
                </Field>
                <Field label="Data de nascimento" name="birth_date" required>
                  <Input type="date" {...register('birth_date')} />
                </Field>
                <Field label="Gênero" name="gender">
                  <Select {...register('gender')}>
                    <option value="">Selecionar</option>
                    {Object.entries(GENDER).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Raça / cor" name="race_color">
                  <Select {...register('race_color')}>
                    <option value="">Selecionar</option>
                    {Object.entries(RACE_COLOR).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </FormSection>

              <FormSection title="Filiação" description="Responsáveis familiares.">
                <Field label="Nome da mãe" name="mother_name" required>
                  <Input {...register('mother_name')} />
                </Field>
                <Field label="Nome do pai" name="father_name">
                  <Input {...register('father_name')} />
                </Field>
              </FormSection>

              <FormSection title="Documentos" description="Códigos oficiais e programas sociais.">
                <Field label="ID municipal" name="unique_municipal_id" required mono>
                  <Input {...register('unique_municipal_id')} placeholder="Ex.: MUN20260001" />
                </Field>
                <Field label="CPF" name="cpf" mono>
                  <Input {...register('cpf')} placeholder="00000000000" />
                </Field>
                <Field label="Código INEP" name="inep_id" mono>
                  <Input {...register('inep_id')} />
                </Field>
                <Field
                  label="NIS"
                  name="nis_code"
                  mono
                  help="Bolsa Família / Auxílio Municipal"
                >
                  <Input {...register('nis_code')} />
                </Field>
                <Field label="Secretaria Municipal" name="education_department" required className="sm:col-span-2">
                  <Select {...register('education_department')}>
                    <option value="">Selecionar</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.municipality_name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </FormSection>

              <FormSection
                title="Atendimento educacional especializado"
                description="Informe se o aluno é público-alvo da educação especial (AEE)."
              >
                <div className="sm:col-span-2 grid gap-3">
                  <Checkbox
                    label="Aluno é público-alvo da educação especial (AEE)"
                    {...register('has_special_needs')}
                  />
                  {hasSpecialNeeds && (
                    <Field
                      label="Detalhamento do atendimento"
                      name="special_needs_details"
                      help="Barreiras, recursos de acessibilidade e apoios necessários."
                    >
                      <Textarea rows={3} {...register('special_needs_details')} />
                    </Field>
                  )}
                </div>
              </FormSection>
            </fieldset>

            <StickyActions>
              <Button type="button" variant="secondary" onClick={() => navigate(ROUTES.students)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" loading={submitting}>
                {id ? 'Atualizar' : 'Criar'}
              </Button>
            </StickyActions>
          </form>
        </FormProvider>
      )}
    </>
  )
}
