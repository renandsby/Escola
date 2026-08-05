import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { apiGet, apiPost, apiPut } from '@/utils/api-helpers'
import { ArrowLeft } from 'lucide-react'

const subjectSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  code: z.string().min(1, 'Código é obrigatório'),
  description: z.string().optional(),
  workload: z.coerce.number().min(1, 'Carga horária deve ser maior que 0'),
  minimum_passing_grade: z.coerce.number().min(0).max(10),
  requires_practicum: z.boolean().optional(),
  school: z.coerce.number().describe('Escola é obrigatória'),
})

type SubjectFormData = z.infer<typeof subjectSchema>

export default function SubjectFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id
  const [loading, setLoading] = useState(isEditing)
  const [submitting, setSubmitting] = useState(false)
  const [schools, setSchools] = useState<any[]>([])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
  })

  useEffect(() => {
    apiGet('schools/')
      .then((data: any) => setSchools(data.results || []))
      .catch(() => setSchools([]))
  }, [])

  useEffect(() => {
    if (isEditing) {
      apiGet(`subjects/${id}/`)
        .then((data: any) => {
          reset({
            name: data.name,
            code: data.code,
            description: data.description || '',
            workload: data.workload,
            minimum_passing_grade: data.minimum_passing_grade,
            requires_practicum: data.requires_practicum || false,
            school: typeof data.school === 'object' ? data.school.id : data.school,
          })
          setLoading(false)
        })
        .catch(() => {
          setLoading(false)
          alert('Erro ao carregar disciplina')
        })
    }
  }, [id, isEditing, reset])

  const onSubmit = async (data: SubjectFormData) => {
    try {
      setSubmitting(true)

      if (isEditing) {
        await apiPut(`subjects/${id}/`, data)
        alert('Disciplina atualizada com sucesso!')
      } else {
        await apiPost('subjects/', data)
        alert('Disciplina criada com sucesso!')
      }
      navigate('/subjects')
    } catch (error: any) {
      alert(`Erro ao salvar disciplina: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="p-6">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/subjects')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">
          {isEditing ? 'Editar Disciplina' : 'Nova Disciplina'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow p-8 space-y-6 max-w-2xl">
        <fieldset disabled={submitting}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome
              </label>
              <input
                {...register('name')}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Matemática"
              />
              {errors.name && (
                <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código
              </label>
              <input
                {...register('code')}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="MAT01"
              />
              {errors.code && (
                <p className="text-red-600 text-sm mt-1">{errors.code.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição
              </label>
              <textarea
                {...register('description')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Descrição da disciplina..."
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Carga Horária (horas)
              </label>
              <input
                {...register('workload')}
                type="number"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="60"
              />
              {errors.workload && (
                <p className="text-red-600 text-sm mt-1">{errors.workload.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nota Mínima de Aprovação
              </label>
              <input
                {...register('minimum_passing_grade')}
                type="number"
                step="0.1"
                min="0"
                max="10"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="6.0"
              />
              {errors.minimum_passing_grade && (
                <p className="text-red-600 text-sm mt-1">{errors.minimum_passing_grade.message}</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <input
                {...register('requires_practicum')}
                type="checkbox"
                className="w-4 h-4 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label className="text-sm font-medium text-gray-700">
                Requer Prática
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Escola
              </label>
              <select
                {...register('school', { valueAsNumber: true })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecionar</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
              {errors.school && (
                <p className="text-red-600 text-sm mt-1">{errors.school.message}</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/subjects')} disabled={submitting}>
              Cancelar
            </Button>
          </div>
        </fieldset>
      </form>
    </div>
  )
}
