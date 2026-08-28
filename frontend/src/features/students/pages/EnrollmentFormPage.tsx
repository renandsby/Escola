import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { apiPost, getErrorMessage } from '@/utils/api-helpers'
import { ArrowLeft } from 'lucide-react'
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

  const studentsQuery = useStudentsQuery()
  const classesQuery = useSchoolClassesQuery()
  const students = studentsQuery.data?.results || []
  const classes = classesQuery.data?.results || []

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      student: '',
      school_class: '',
      enrollment_number: '',
    },
  })

  const onSubmit = async (data: EnrollmentFormData) => {
    try {
      setSubmitting(true)
      await apiPost('enrollments/', data)
      toast.success('Matrícula criada com sucesso!')
      navigate('/enrollments')
    } catch (error: unknown) {
      toast.error(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/enrollments')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Nova Matrícula</h1>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white rounded-lg shadow p-8 space-y-6 max-w-2xl"
      >
        <fieldset disabled={submitting}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Aluno</label>
              <select
                {...register('student')}
                disabled={studentsQuery.isLoading}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">
                  {studentsQuery.isLoading ? 'Carregando...' : 'Selecionar'}
                </option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
              {errors.student && (
                <p className="text-red-600 text-sm mt-1">{errors.student.message}</p>
              )}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Turma</label>
              <select
                {...register('school_class')}
                disabled={classesQuery.isLoading}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">
                  {classesQuery.isLoading ? 'Carregando...' : 'Selecionar'}
                </option>
                {classes.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.school_name ? `${sc.name} — ${sc.school_name}` : sc.name}
                  </option>
                ))}
              </select>
              {errors.school_class && (
                <p className="text-red-600 text-sm mt-1">{errors.school_class.message}</p>
              )}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número da matrícula
              </label>
              <input
                {...register('enrollment_number')}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: MAT2026000123"
              />
              {errors.enrollment_number && (
                <p className="text-red-600 text-sm mt-1">{errors.enrollment_number.message}</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/enrollments')}
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
