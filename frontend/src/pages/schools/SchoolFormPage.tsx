import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCrud } from '@/hooks/useCrud'
import { School } from '@/types/api'
import { Button } from '@/components/ui/button'
import { apiGet } from '@/utils/api-helpers'

const schoolSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  cnpj: z.string().min(1, 'CNPJ é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  website: z.string().optional(),
  address: z.string().min(1, 'Endereço é obrigatório'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  state: z.string().min(1, 'Estado é obrigatório'),
  zip_code: z.string().optional(),
  director_name: z.string().optional(),
  max_students_per_class: z.number().optional(),
})

type SchoolFormData = z.infer<typeof schoolSchema>

export default function SchoolFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { create, update } = useCrud<School>('schools/', 'schools')
  const [loading, setLoading] = useState(!!id)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SchoolFormData>({
    resolver: zodResolver(schoolSchema),
  })

  useEffect(() => {
    if (id) {
      apiGet(`schools/${id}/`)
        .then((data: any) => {
          reset(data)
          setLoading(false)
        })
    }
  }, [id, reset])

  const onSubmit = async (data: SchoolFormData) => {
    try {
      if (id) {
        await update.mutateAsync({ id, data })
      } else {
        await create.mutateAsync(data)
      }
      navigate('/schools')
    } catch (error) {
      console.error('Erro ao salvar escola:', error)
    }
  }

  if (loading) return <div className="p-6">Carregando...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">
        {id ? 'Editar Escola' : 'Nova Escola'}
      </h1>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome</label>
              <input
                {...register('name')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">CNPJ</label>
              <input
                {...register('cnpj')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              {errors.cnpj && <p className="mt-1 text-sm text-red-600">{errors.cnpj.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                {...register('email')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Telefone</label>
              <input
                {...register('phone')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Endereço</label>
              <input
                {...register('address')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Cidade</label>
              <input
                {...register('city')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Estado</label>
              <input
                {...register('state')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              {errors.state && <p className="mt-1 text-sm text-red-600">{errors.state.message}</p>}
            </div>
          </div>

          <div className="flex space-x-4 pt-6">
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {id ? 'Atualizar' : 'Criar'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/schools')}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
