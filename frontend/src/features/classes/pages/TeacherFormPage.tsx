import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/PageHeader'
import { Field, Input, Select } from '@/components/ui/Field'
import { FormSection, StickyActions } from '@/components/ui/FormSection'
import { Button } from '@/components/ui/Button'
import { FormError } from '@/components/feedback/FormError'
import { PersonLookupStep } from '@/components/feedback/PersonLookupStep'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { apiGet } from '@/utils/api-helpers'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/app/routes/paths'
import type { PaginatedResponse, TeacherProfile } from '@/types/api'
import {
  createTeacherProfile,
  createTeacherUser,
  updateTeacherProfile,
} from '../api/teachersApi'
import {
  teacherCreateSchema,
  teacherEditSchema,
  type TeacherCreateFormData,
  type TeacherEditFormData,
} from '../schemas/teacherSchema'
import { useEducationDepartmentsQuery } from '../hooks/useAllocationOptions'
import { useTeacherQuery } from '../hooks/useTeachersQuery'

export default function TeacherFormPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id } = useParams()
  const isEditing = !!id
  const user = useAuthStore((s) => s.user)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<unknown>(null)
  const [showForm, setShowForm] = useState(isEditing)

  const departmentsQuery = useEducationDepartmentsQuery()
  const departments = departmentsQuery.data?.results ?? []
  const teacherQuery = useTeacherQuery(id)

  const createMethods = useForm<TeacherCreateFormData>({
    resolver: zodResolver(teacherCreateSchema),
    defaultValues: { education_department: user?.education_department || '' },
  })
  const editMethods = useForm<TeacherEditFormData>({ resolver: zodResolver(teacherEditSchema) })

  useEffect(() => {
    if (teacherQuery.data) {
      const t = teacherQuery.data
      editMethods.reset({
        registration_number: t.registration_number,
        cpf: t.cpf,
        formation_area: t.formation_area || '',
        birth_date: t.birth_date || '',
        hiring_date: t.hiring_date || '',
      })
    }
  }, [teacherQuery.data, editMethods])

  useEffect(() => {
    if (teacherQuery.isError) {
      toast.error('Erro ao carregar professor')
    }
  }, [teacherQuery.isError])

  const onCreate = async (data: TeacherCreateFormData) => {
    setSubmitError(null)
    setSubmitting(true)
    try {
      const createdUser = await createTeacherUser({
        username: data.username,
        email: data.email,
        password: data.password,
        password_confirm: data.password_confirm,
        first_name: data.first_name,
        last_name: data.last_name,
        education_department: data.education_department,
      })
      if (!createdUser?.id) {
        throw new Error('Não foi possível criar o usuário do professor.')
      }
      await createTeacherProfile({
        user: createdUser.id,
        education_department: data.education_department,
        registration_number: data.registration_number,
        cpf: data.cpf,
        formation_area: data.formation_area || undefined,
        birth_date: data.birth_date || null,
        hiring_date: data.hiring_date || null,
      })
      toast.success('Professor cadastrado.')
      queryClient.invalidateQueries({ queryKey: ['classes', 'teachers'] })
      navigate(ROUTES.teachers)
    } catch (error) {
      setSubmitError(error)
    } finally {
      setSubmitting(false)
    }
  }

  const onEdit = async (data: TeacherEditFormData) => {
    setSubmitError(null)
    setSubmitting(true)
    try {
      await updateTeacherProfile(id as string, {
        registration_number: data.registration_number,
        cpf: data.cpf,
        formation_area: data.formation_area || undefined,
        birth_date: data.birth_date || null,
        hiring_date: data.hiring_date || null,
      })
      toast.success('Professor atualizado.')
      queryClient.invalidateQueries({ queryKey: ['classes', 'teachers'] })
      navigate(ROUTES.teachers)
    } catch (error) {
      setSubmitError(error)
    } finally {
      setSubmitting(false)
    }
  }

  const title = isEditing
    ? `Editar professor${teacherQuery.data?.user_name ? ` — ${teacherQuery.data.user_name}` : ''}`
    : 'Novo professor'

  if (isEditing && teacherQuery.isLoading) {
    return (
      <>
        <PageHeader breadcrumb={[{ label: 'Professores', to: ROUTES.teachers }]} title={title} />
        <TableSkeleton rows={5} cols={2} />
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Professores', to: ROUTES.teachers }, { label: title }]}
        title={title}
      />

      {!isEditing && !showForm && (
        <PersonLookupStep
          title="Buscar no quadro docente"
          placeholder="Nome, matrícula funcional ou CPF…"
          queryKey="teacher"
          search={async (term) => {
            const page = await apiGet<PaginatedResponse<TeacherProfile>>('teachers/', { search: term })
            return (page?.results ?? []).map((t) => ({
              id: t.id,
              name: t.user_name || t.registration_number,
              identifiers: [t.registration_number, t.cpf].filter(Boolean) as string[],
              detail: t.formation_area || undefined,
            }))
          }}
          onPick={(r) => navigate(ROUTES.teacherEdit(r.id))}
          onSkip={() => setShowForm(true)}
          skipLabel="Nenhum é — cadastrar novo professor"
        />
      )}

      {isEditing ? (
        <FormProvider {...editMethods}>
          <form onSubmit={editMethods.handleSubmit(onEdit)} className="grid gap-1">
            {!!submitError && <FormError error={submitError} />}
            <fieldset disabled={submitting} className="grid gap-1">
              <ProfileSection register={editMethods.register} first />
            </fieldset>
            <StickyActions>
              <Button type="button" variant="secondary" onClick={() => navigate(ROUTES.teachers)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" loading={submitting}>
                Salvar
              </Button>
            </StickyActions>
          </form>
        </FormProvider>
      ) : showForm ? (
        <FormProvider {...createMethods}>
          <form onSubmit={createMethods.handleSubmit(onCreate)} className="grid gap-1">
            {!!submitError && <FormError error={submitError} />}
            <fieldset disabled={submitting} className="grid gap-1">
              <FormSection title="Dados de acesso" description="Login do professor no sistema." first>
                <Field label="Nome" name="first_name" required>
                  <Input {...createMethods.register('first_name')} />
                </Field>
                <Field label="Sobrenome" name="last_name" required>
                  <Input {...createMethods.register('last_name')} />
                </Field>
                <Field label="E-mail" name="email" required>
                  <Input type="email" {...createMethods.register('email')} />
                </Field>
                <Field label="Usuário de acesso" name="username" required mono>
                  <Input {...createMethods.register('username')} />
                </Field>
                <Field label="Senha" name="password" required>
                  <Input type="password" {...createMethods.register('password')} />
                </Field>
                <Field label="Confirmar senha" name="password_confirm" required>
                  <Input type="password" {...createMethods.register('password_confirm')} />
                </Field>
                <Field label="Secretaria Municipal" name="education_department" required className="sm:col-span-2">
                  <Select {...createMethods.register('education_department')}>
                    <option value="">Selecionar</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.municipality_name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </FormSection>
              <ProfileSection register={createMethods.register} />
            </fieldset>
            <StickyActions>
              <Button type="button" variant="secondary" onClick={() => navigate(ROUTES.teachers)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" loading={submitting}>
                Salvar
              </Button>
            </StickyActions>
          </form>
        </FormProvider>
      ) : null}
    </>
  )
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function ProfileSection({ register, first }: { register: any; first?: boolean }) {
  return (
    <FormSection title="Dados funcionais" description="Matrícula e formação do docente." first={first}>
      <Field label="Matrícula funcional" name="registration_number" required mono>
        <Input {...register('registration_number')} />
      </Field>
      <Field label="CPF" name="cpf" required mono help="Somente números (11 dígitos)">
        <Input {...register('cpf')} placeholder="00000000000" />
      </Field>
      <Field label="Área de formação" name="formation_area">
        <Input {...register('formation_area')} placeholder="Ex.: Pedagogia" />
      </Field>
      <Field label="Data de nascimento" name="birth_date">
        <Input type="date" {...register('birth_date')} />
      </Field>
      <Field label="Data de contratação" name="hiring_date">
        <Input type="date" {...register('hiring_date')} />
      </Field>
    </FormSection>
  )
}
/* eslint-enable @typescript-eslint/no-explicit-any */
