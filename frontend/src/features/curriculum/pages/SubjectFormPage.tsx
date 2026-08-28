import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/Skeleton'
import { apiPost, apiPut, getErrorMessage } from '@/utils/api-helpers'
import { useAuthStore } from '@/stores/authStore'
import { ArrowLeft } from 'lucide-react'
import { subjectSchema, type SubjectFormData } from '../schemas/subjectSchema'
import { fetchSubject } from '../api/subjectsApi'
import { useEducationDepartmentsQuery } from '../hooks/useEducationDepartmentsQuery'

const AREAS = [
  'Linguagens',
  'Matemática',
  'Ciências da Natureza',
  'Ciências Humanas',
  'Ensino Religioso',
]

export default function SubjectFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id
  const user = useAuthStore((state) => state.user)
  const [submitting, setSubmitting] = useState(false)

  const departmentsQuery = useEducationDepartmentsQuery()
  const departments = departmentsQuery.data?.results ?? []

  const subjectQuery = useQuery({
    queryKey: ['curriculum', 'subject', id],
    queryFn: () => fetchSubject(id as string),
    enabled: isEditing,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      education_department: user?.education_department || '',
      minimum_passing_grade: 6,
    },
  })

  useEffect(() => {
    if (subjectQuery.data) {
      const data = subjectQuery.data
      reset({
        education_department: data.education_department,
        name: data.name,
        area_of_knowledge: data.area_of_knowledge,
        bncc_code: data.bncc_code || '',
        description: data.description || '',
        minimum_passing_grade: data.minimum_passing_grade ?? 6,
      })
    }
  }, [subjectQuery.data, reset])

  useEffect(() => {
    if (subjectQuery.isError) {
      toast.error('Erro ao carregar disciplina')
    }
  }, [subjectQuery.isError])

  const onSubmit = async (data: SubjectFormData) => {
    try {
      setSubmitting(true)
      if (id) {
        await apiPut(`subjects/${id}/`, data)
        toast.success('Disciplina atualizada com sucesso!')
      } else {
        await apiPost('subjects/', data)
        toast.success('Disciplina criada com sucesso!')
      }
      navigate('/subjects')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  if (isEditing && subjectQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="bg-white rounded-lg shadow p-8 space-y-4 max-w-2xl">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={`field-skeleton-${index}`} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/subjects')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">
          {id ? 'Editar Disciplina' : 'Nova Disciplina'}
        </h1>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white rounded-lg shadow p-8 space-y-6 max-w-2xl"
      >
        <fieldset disabled={submitting} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
            <input
              {...register('name')}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Área do conhecimento
            </label>
            <select
              {...register('area_of_knowledge')}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecionar</option>
              {AREAS.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
            {errors.area_of_knowledge && (
              <p className="text-red-600 text-sm mt-1">{errors.area_of_knowledge.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Código BNCC</label>
            <input
              {...register('bncc_code')}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: EF05MA01"
            />
          </div>

          <div>
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
              <p className="text-red-600 text-sm mt-1">{errors.education_department.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nota mínima</label>
            <input
              type="number"
              step="0.1"
              {...register('minimum_passing_grade')}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {errors.minimum_passing_grade && (
              <p className="text-red-600 text-sm mt-1">{errors.minimum_passing_grade.message}</p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/subjects')}
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
