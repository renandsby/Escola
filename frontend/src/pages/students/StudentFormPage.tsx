import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { apiGet, apiPost, apiPut } from '@/utils/api-helpers'
import { ArrowLeft } from 'lucide-react'

const studentCreateSchema = z.object({
  username: z.string().min(1, 'Usuário é obrigatório'),
  email: z.string().email('Email inválido'),
  first_name: z.string().min(1, 'Primeiro nome é obrigatório'),
  last_name: z.string().min(1, 'Sobrenome é obrigatório'),
  registration_number: z.string().min(1, 'Matrícula é obrigatória'),
  cpf: z.string().min(1, 'CPF é obrigatório'),
  birth_date: z.string().min(1, 'Data de nascimento é obrigatória'),
  gender: z.enum(['M', 'F', 'O']).describe('Gênero inválido'),
  nationality: z.string().optional(),
  school: z.coerce.number().describe('Escola é obrigatória'),
})

const studentUpdateSchema = z.object({
  registration_number: z.string().min(1, 'Matrícula é obrigatória'),
  cpf: z.string().min(1, 'CPF é obrigatório'),
  birth_date: z.string().min(1, 'Data de nascimento é obrigatória'),
  gender: z.enum(['M', 'F', 'O']).describe('Gênero inválido'),
  nationality: z.string().optional(),
  school: z.coerce.number().describe('Escola é obrigatória'),
})

type StudentCreateData = z.infer<typeof studentCreateSchema>
type StudentUpdateData = z.infer<typeof studentUpdateSchema>
type StudentFormData = StudentCreateData | StudentUpdateData

export default function StudentFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id
  const [loading, setLoading] = useState(isEditing)
  const [submitting, setSubmitting] = useState(false)
  const [schools, setSchools] = useState<any[]>([])
  const [studentData, setStudentData] = useState<any>(null)

  const schema = isEditing ? studentUpdateSchema : studentCreateSchema

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StudentFormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    apiGet('schools/')
      .then((data: any) => setSchools(data.results || []))
      .catch(() => setSchools([]))
  }, [])

  useEffect(() => {
    if (isEditing) {
      apiGet(`students/${id}/`)
        .then((data: any) => {
          setStudentData(data)
          reset({
            registration_number: data.registration_number,
            cpf: data.cpf,
            birth_date: data.birth_date,
            gender: data.gender,
            nationality: data.nationality || '',
            school: typeof data.school === 'object' ? data.school.id : data.school,
          } as StudentUpdateData)
          setLoading(false)
        })
        .catch(() => {
          setLoading(false)
          alert('Erro ao carregar aluno')
        })
    }
  }, [id, isEditing, reset])

  const onSubmit = async (data: StudentFormData) => {
    try {
      setSubmitting(true)
      if (id) {
        await apiPut(`students/${id}/`, data)
        alert('Aluno atualizado com sucesso!')
      } else {
        await apiPost('students/', data)
        alert('Aluno criado com sucesso!')
      }
      navigate('/students')
    } catch (error: any) {
      alert(`Erro ao salvar aluno: ${error.message}`)
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
        <Button variant="outline" size="sm" onClick={() => navigate('/students')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">
          {id ? 'Editar Aluno' : 'Novo Aluno'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow p-8 space-y-6 max-w-2xl">
        <fieldset disabled={submitting}>
          <div className="grid grid-cols-2 gap-4">
            {!isEditing && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primeiro Nome
                  </label>
                  <input
                    {...register('first_name')}
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="João"
                  />
                  {'first_name' in errors && errors.first_name && (
                    <p className="text-red-600 text-sm mt-1">{(errors.first_name as any).message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sobrenome
                  </label>
                  <input
                    {...register('last_name')}
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Silva"
                  />
                  {'last_name' in errors && errors.last_name && (
                    <p className="text-red-600 text-sm mt-1">{(errors.last_name as any).message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Usuário
                  </label>
                  <input
                    {...register('username')}
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="joao_silva"
                  />
                  {'username' in errors && errors.username && (
                    <p className="text-red-600 text-sm mt-1">{(errors.username as any).message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="joao@example.com"
                  />
                  {'email' in errors && errors.email && (
                    <p className="text-red-600 text-sm mt-1">{(errors.email as any).message}</p>
                  )}
                </div>
              </>
            )}

            {isEditing && studentData && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome
                  </label>
                  <div className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700">
                    {studentData.user_name}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700">
                    {studentData.user_email}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Matrícula
              </label>
              <input
                {...register('registration_number')}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="MAT001"
              />
              {errors.registration_number && (
                <p className="text-red-600 text-sm mt-1">{errors.registration_number.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CPF
              </label>
              <input
                {...register('cpf')}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="000.000.000-00"
              />
              {errors.cpf && (
                <p className="text-red-600 text-sm mt-1">{errors.cpf.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data de Nascimento
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gênero
              </label>
              <select
                {...register('gender')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecionar</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
                <option value="O">Outro</option>
              </select>
              {errors.gender && (
                <p className="text-red-600 text-sm mt-1">{errors.gender.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nacionalidade
              </label>
              <input
                {...register('nationality')}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Brasileiro"
              />
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
            <Button type="button" variant="outline" onClick={() => navigate('/students')} disabled={submitting}>
              Cancelar
            </Button>
          </div>
        </fieldset>
      </form>
    </div>
  )
}
