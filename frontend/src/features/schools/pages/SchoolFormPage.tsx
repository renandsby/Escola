import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useCrud } from '@/hooks/useCrud'
import type { School } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/Skeleton'
import { getErrorMessage } from '@/utils/api-helpers'
import { useAuthStore } from '@/stores/authStore'
import { schoolSchema, type SchoolFormData } from '../schemas/schoolSchema'
import {
  useEducationDepartmentsQuery,
  useSchoolDirectorsQuery,
  useSchoolQuery,
} from '../hooks/useSchoolFormData'

const FIELD_CLASS =
  'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'

export default function SchoolFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const user = useAuthStore((state) => state.user)
  const { create, update } = useCrud<School>('schools/', 'schools')

  const departmentsQuery = useEducationDepartmentsQuery()
  const directorsQuery = useSchoolDirectorsQuery()
  const schoolQuery = useSchoolQuery(id)

  const departments = departmentsQuery.data?.results ?? []
  const directors = directorsQuery.data?.results ?? []

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SchoolFormData>({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
      education_department: user?.education_department || '',
      school_type: 'FUNDAMENTAL_1',
    },
  })

  useEffect(() => {
    if (schoolQuery.data) {
      reset(schoolQuery.data as unknown as SchoolFormData)
    }
  }, [schoolQuery.data, reset])

  useEffect(() => {
    if (schoolQuery.isError) {
      toast.error('Erro ao carregar escola')
    }
  }, [schoolQuery.isError])

  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (data: SchoolFormData) => {
    try {
      setSubmitting(true)
      if (id) {
        await update.mutateAsync({ id, data })
        toast.success('Escola atualizada com sucesso!')
      } else {
        await create.mutateAsync(data)
        toast.success('Escola criada com sucesso!')
      }
      navigate('/schools')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  if (id && schoolQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <div className="bg-white rounded-lg shadow p-6 grid grid-cols-2 gap-4">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={`field-skeleton-${index}`} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">{id ? 'Editar Escola' : 'Nova Escola'}</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <fieldset disabled={submitting} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Nome</label>
              <input {...register('name')} className={FIELD_CLASS} />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Secretaria Municipal</label>
              <select {...register('education_department')} className={FIELD_CLASS}>
                <option value="">Selecionar</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.municipality_name}
                  </option>
                ))}
              </select>
              {errors.education_department && (
                <p className="mt-1 text-sm text-red-600">{errors.education_department.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Tipo</label>
              <select {...register('school_type')} className={FIELD_CLASS}>
                <option value="CRECHE">Creche</option>
                <option value="PRE_ESCOLA">Pré-escola</option>
                <option value="FUNDAMENTAL_1">Fundamental I</option>
                <option value="FUNDAMENTAL_2">Fundamental II</option>
                <option value="EJA">EJA</option>
                <option value="MISTA">Mista</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Diretor(a)</label>
              <select {...register('director_user')} className={FIELD_CLASS}>
                <option value="">Selecionar</option>
                {directors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.first_name} {d.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Código INEP</label>
              <input {...register('inep_code')} className={FIELD_CLASS} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">CNPJ</label>
              <input {...register('cnpj')} className={FIELD_CLASS} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input type="email" {...register('email')} className={FIELD_CLASS} />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Telefone</label>
              <input {...register('phone')} className={FIELD_CLASS} />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Logradouro</label>
              <input {...register('address_street')} className={FIELD_CLASS} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Número</label>
              <input {...register('address_number')} className={FIELD_CLASS} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Bairro</label>
              <input {...register('address_neighborhood')} className={FIELD_CLASS} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Cidade</label>
              <input {...register('address_city')} className={FIELD_CLASS} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">UF</label>
              <input {...register('address_state')} maxLength={2} className={FIELD_CLASS} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">CEP</label>
              <input {...register('address_zip_code')} className={FIELD_CLASS} />
            </div>
          </fieldset>

          <div className="flex space-x-4 pt-6">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Salvando...' : id ? 'Atualizar' : 'Criar'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/schools')}
              disabled={submitting}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
