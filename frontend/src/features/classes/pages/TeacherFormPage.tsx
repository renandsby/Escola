import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/Skeleton'
import { getErrorMessage } from '@/utils/api-helpers'
import { useAuthStore } from '@/stores/authStore'
import { ArrowLeft } from 'lucide-react'
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

const FIELD = 'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm sm:text-sm'

export default function TeacherFormPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id } = useParams()
  const isEditing = !!id
  const user = useAuthStore((state) => state.user)
  const [submitting, setSubmitting] = useState(false)

  const departmentsQuery = useEducationDepartmentsQuery()
  const departments = departmentsQuery.data?.results ?? []
  const teacherQuery = useTeacherQuery(id)

  const createForm = useForm<TeacherCreateFormData>({
    resolver: zodResolver(teacherCreateSchema),
    defaultValues: { education_department: user?.education_department || '' },
  })
  const editForm = useForm<TeacherEditFormData>({ resolver: zodResolver(teacherEditSchema) })

  useEffect(() => {
    if (teacherQuery.data) {
      const t = teacherQuery.data
      editForm.reset({
        registration_number: t.registration_number,
        cpf: t.cpf,
        formation_area: t.formation_area || '',
        birth_date: t.birth_date || '',
        hiring_date: t.hiring_date || '',
      })
    }
  }, [teacherQuery.data, editForm])

  useEffect(() => {
    if (teacherQuery.isError) {
      toast.error('Erro ao carregar professor')
    }
  }, [teacherQuery.isError])

  const onCreate = async (data: TeacherCreateFormData) => {
    try {
      setSubmitting(true)
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
      toast.success('Professor cadastrado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['classes', 'teachers'] })
      navigate('/teachers')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const onEdit = async (data: TeacherEditFormData) => {
    try {
      setSubmitting(true)
      await updateTeacherProfile(id as string, {
        registration_number: data.registration_number,
        cpf: data.cpf,
        formation_area: data.formation_area || undefined,
        birth_date: data.birth_date || null,
        hiring_date: data.hiring_date || null,
      })
      toast.success('Professor atualizado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['classes', 'teachers'] })
      navigate('/teachers')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  if (isEditing && teacherQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <div className="bg-white rounded-lg shadow p-8 grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={`sk-${i}`} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const teacherName = teacherQuery.data?.user_name

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/teachers')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">
          {isEditing ? `Editar Professor${teacherName ? ` — ${teacherName}` : ''}` : 'Novo Professor'}
        </h1>
      </div>

      {isEditing ? (
        <form
          onSubmit={editForm.handleSubmit(onEdit)}
          className="bg-white rounded-lg shadow p-8 space-y-4 max-w-2xl"
        >
          <fieldset disabled={submitting} className="grid grid-cols-2 gap-4">
            <ProfileFields
              register={editForm.register}
              errors={editForm.formState.errors}
            />
          </fieldset>
          <FormActions submitting={submitting} onCancel={() => navigate('/teachers')} />
        </form>
      ) : (
        <form
          onSubmit={createForm.handleSubmit(onCreate)}
          className="bg-white rounded-lg shadow p-8 space-y-4 max-w-2xl"
        >
          <fieldset disabled={submitting} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome</label>
              <input {...createForm.register('first_name')} className={FIELD} />
              <FieldError message={createForm.formState.errors.first_name?.message} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Sobrenome</label>
              <input {...createForm.register('last_name')} className={FIELD} />
              <FieldError message={createForm.formState.errors.last_name?.message} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">E-mail</label>
              <input type="email" {...createForm.register('email')} className={FIELD} />
              <FieldError message={createForm.formState.errors.email?.message} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Usuário de acesso</label>
              <input {...createForm.register('username')} className={FIELD} />
              <FieldError message={createForm.formState.errors.username?.message} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Senha</label>
              <input type="password" {...createForm.register('password')} className={FIELD} />
              <FieldError message={createForm.formState.errors.password?.message} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Confirmar senha</label>
              <input
                type="password"
                {...createForm.register('password_confirm')}
                className={FIELD}
              />
              <FieldError message={createForm.formState.errors.password_confirm?.message} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Secretaria Municipal</label>
              <select {...createForm.register('education_department')} className={FIELD}>
                <option value="">Selecionar</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.municipality_name}
                  </option>
                ))}
              </select>
              <FieldError message={createForm.formState.errors.education_department?.message} />
            </div>

            <ProfileFields
              register={createForm.register}
              errors={createForm.formState.errors}
            />
          </fieldset>
          <FormActions submitting={submitting} onCancel={() => navigate('/teachers')} />
        </form>
      )}
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null
  }
  return <p className="mt-1 text-sm text-red-600">{message}</p>
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function ProfileFields({ register, errors }: { register: any; errors: any }) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700">Matrícula funcional</label>
        <input {...register('registration_number')} className={FIELD} />
        <FieldError message={errors.registration_number?.message} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">CPF (somente números)</label>
        <input {...register('cpf')} className={FIELD} placeholder="00000000000" />
        <FieldError message={errors.cpf?.message} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Área de formação</label>
        <input {...register('formation_area')} className={FIELD} placeholder="Ex.: Pedagogia" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Data de nascimento</label>
        <input type="date" {...register('birth_date')} className={FIELD} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Data de contratação</label>
        <input type="date" {...register('hiring_date')} className={FIELD} />
      </div>
    </>
  )
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function FormActions({ submitting, onCancel }: { submitting: boolean; onCancel: () => void }) {
  return (
    <div className="flex gap-2 pt-2">
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Salvando...' : 'Salvar'}
      </Button>
      <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
        Cancelar
      </Button>
    </div>
  )
}
