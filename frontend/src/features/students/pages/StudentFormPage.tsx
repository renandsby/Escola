import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/Skeleton'
import { apiGet, apiPost, apiPut, getErrorMessage } from '@/utils/api-helpers'
import { useAuthStore } from '@/stores/authStore'
import { ArrowLeft } from 'lucide-react'
import type { Student } from '@/types/api'
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

  const departmentsQuery = useEducationDepartmentsQuery()
  const departments = departmentsQuery.data?.results || []

  const studentQuery = useQuery({
    queryKey: ['student', id],
    queryFn: () => apiGet<Student>(`students/${id}/`),
    enabled: isEditing,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      education_department: user?.education_department || '',
      has_special_needs: false,
    },
  })

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
    try {
      setSubmitting(true)
      if (id) {
        await apiPut(`students/${id}/`, data)
        toast.success('Aluno atualizado com sucesso!')
      } else {
        await apiPost('students/', data)
        toast.success('Aluno criado com sucesso!')
      }
      navigate('/students')
    } catch (error: unknown) {
      toast.error(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const loading = isEditing && studentQuery.isLoading

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="bg-white rounded-lg shadow p-8 space-y-6 max-w-2xl">
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={`field-skeleton-${index}`} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/students')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">
          {id ? 'Editar Aluno' : 'Novo Aluno'}
        </h1>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white rounded-lg shadow p-8 space-y-6 max-w-2xl"
      >
        <fieldset disabled={submitting}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome completo
              </label>
              <input
                {...register('full_name')}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nome completo do aluno"
              />
              {errors.full_name && (
                <p className="text-red-600 text-sm mt-1">{errors.full_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID municipal
              </label>
              <input
                {...register('unique_municipal_id')}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: MUN20260001"
              />
              {errors.unique_municipal_id && (
                <p className="text-red-600 text-sm mt-1">{errors.unique_municipal_id.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome da mãe
              </label>
              <input
                {...register('mother_name')}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.mother_name && (
                <p className="text-red-600 text-sm mt-1">{errors.mother_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome do pai
              </label>
              <input
                {...register('father_name')}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome social
              </label>
              <input
                {...register('social_name')}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">CPF</label>
              <input
                {...register('cpf')}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="00000000000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data de nascimento
              </label>
              <input
                {...register('birth_date')}
                type="date"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.birth_date && (
                <p className="text-red-600 text-sm mt-1">{errors.birth_date.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gênero</label>
              <select
                {...register('gender')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecionar</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
                <option value="O">Outro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código INEP
              </label>
              <input
                {...register('inep_id')}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                NIS (Bolsa Família / Auxílio Municipal)
              </label>
              <input
                {...register('nis_code')}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Raça/Cor
              </label>
              <select
                {...register('race_color')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecionar</option>
                <option value="BRANCA">Branca</option>
                <option value="PRETA">Preta</option>
                <option value="PARDA">Parda</option>
                <option value="AMARELA">Amarela</option>
                <option value="INDIGENA">Indígena</option>
                <option value="NAO_DECLARADA">Não declarada</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Secretaria Municipal
              </label>
              <select
                {...register('education_department')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecionar</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.municipality_name}
                  </option>
                ))}
              </select>
              {errors.education_department && (
                <p className="text-red-600 text-sm mt-1">
                  {errors.education_department.message}
                </p>
              )}
            </div>

            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                {...register('has_special_needs')}
                id="has_special_needs"
                className="rounded border-gray-300"
              />
              <label htmlFor="has_special_needs" className="text-sm text-gray-700">
                Possui necessidades especiais
              </label>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Detalhes das necessidades especiais
              </label>
              <textarea
                {...register('special_needs_details')}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/students')}
              disabled={submitting}
            >
              Cancelar
            </Button>
          </div>
        </fieldset>
      </form>
    </div>
  )
}
