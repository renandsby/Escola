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
import { useSchoolsQuery } from '@/features/students/hooks/useSchoolsQuery'
import { ROUTES } from '@/app/routes/paths'
import { userSchema, USER_ROLE_OPTIONS, type UserFormData } from '../schemas/userSchema'
import { createUser, fetchUser, updateUser } from '../api/usersApi'

const SCHOOL_ROLES = ['school_director', 'school_secretary']

export default function UserFormPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id } = useParams()
  const isEditing = !!id
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<unknown>(null)

  const schools = useSchoolsQuery().data?.results ?? []

  const userQuery = useQuery({
    queryKey: ['users', 'detail', id],
    queryFn: () => fetchUser(id as string),
    enabled: isEditing,
  })

  const methods = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      cpf: '',
      email: '',
      role: 'school_director',
      school: '',
      password: '',
    },
  })
  const { register, handleSubmit, reset, watch } = methods
  const role = watch('role')

  useEffect(() => {
    if (userQuery.data) {
      const d = userQuery.data
      reset({
        first_name: d.first_name,
        last_name: d.last_name,
        cpf: d.cpf ?? '',
        email: d.email,
        role: d.role as UserFormData['role'],
        school: d.school ?? '',
        password: '',
      })
    }
  }, [userQuery.data, reset])

  const onSubmit = async (data: UserFormData) => {
    setSubmitError(null)
    setSubmitting(true)
    try {
      if (id) {
        await updateUser(id, data)
        toast.success('Usuário atualizado.')
      } else {
        const { provisionalPassword } = await createUser(data)
        toast.success(
          provisionalPassword
            ? `Usuário criado. Senha provisória: ${provisionalPassword}`
            : 'Usuário criado.',
          { duration: 12000 }
        )
      }
      queryClient.invalidateQueries({ queryKey: ['users'] })
      navigate(ROUTES.users)
    } catch (error) {
      setSubmitError(error)
    } finally {
      setSubmitting(false)
    }
  }

  const title = id ? 'Editar usuário' : 'Novo usuário'

  if (isEditing && userQuery.isLoading) {
    return (
      <>
        <PageHeader breadcrumb={[{ label: 'Usuários', to: ROUTES.users }]} title={title} />
        <TableSkeleton rows={5} cols={2} />
      </>
    )
  }

  return (
    <FormProvider {...methods}>
      <PageHeader
        breadcrumb={[{ label: 'Administração' }, { label: 'Usuários', to: ROUTES.users }, { label: title }]}
        title={title}
      />
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-1">
        {!!submitError && <FormError error={submitError} />}
        <fieldset disabled={submitting} className="grid gap-1">
          <FormSection title="Identificação" description="Nome e credenciais institucionais." first>
            <Field label="Nome" name="first_name" required>
              <Input {...register('first_name')} />
            </Field>
            <Field label="Sobrenome" name="last_name" required>
              <Input {...register('last_name')} />
            </Field>
            <Field label="CPF" name="cpf" required mono help="Login do usuário (com ou sem máscara)">
              <Input {...register('cpf')} placeholder="000.000.000-00" />
            </Field>
            <Field label="E-mail institucional" name="email" required help="Também serve para login">
              <Input type="email" {...register('email')} />
            </Field>
          </FormSection>

          <FormSection title="Papel e vínculo" description="Define o que o usuário pode acessar.">
            <Field label="Papel no sistema" name="role" required>
              <Select {...register('role')}>
                {USER_ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Escola"
              name="school"
              required={SCHOOL_ROLES.includes(role)}
              help={SCHOOL_ROLES.includes(role) ? 'Obrigatória para este papel' : 'Opcional'}
            >
              <Select {...register('school')}>
                <option value="">Sem vínculo de escola</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            {!isEditing && (
              <Field
                label="Senha provisória"
                name="password"
                help="Deixe em branco para gerar automaticamente"
              >
                <Input type="text" {...register('password')} />
              </Field>
            )}
          </FormSection>

          <div className="flex items-center gap-2 py-4">
            <Button type="submit" variant="primary" loading={submitting}>
              {id ? 'Salvar alterações' : 'Criar usuário'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate(ROUTES.users)}>
              Cancelar
            </Button>
          </div>
        </fieldset>
      </form>
    </FormProvider>
  )
}
