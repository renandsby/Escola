import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/Skeleton'
import { apiGet, apiPost, getErrorMessage } from '@/utils/api-helpers'
import type { PaginatedResponse, User } from '@/types/api'
import { ArrowLeft } from 'lucide-react'

const messageSchema = z.object({
  recipient: z.coerce.number({ invalid_type_error: 'Destinatário é obrigatório' }),
  subject: z.string().min(1, 'Assunto é obrigatório'),
  body: z.string().min(1, 'Mensagem é obrigatória'),
})

type MessageFormData = z.infer<typeof messageSchema>

interface MessageDetail {
  sender_name?: string
  created_at: string
  subject: string
  body: string
}

export default function MessageFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isViewing = !!id
  const [submitting, setSubmitting] = useState(false)

  const usersQuery = useQuery({
    queryKey: ['messages', 'recipients'],
    queryFn: () => apiGet<PaginatedResponse<User>>('accounts/users/'),
  })
  const users = usersQuery.data?.results ?? []

  const messageQuery = useQuery({
    queryKey: ['messages', 'detail', id],
    queryFn: () => apiGet<MessageDetail>(`communications/${id}/`),
    enabled: isViewing,
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
  })

  useEffect(() => {
    if (messageQuery.isError) {
      toast.error('Erro ao carregar mensagem')
    }
  }, [messageQuery.isError])

  const onSubmit = async (data: MessageFormData) => {
    try {
      setSubmitting(true)
      await apiPost('communications/', data)
      toast.success('Mensagem enviada com sucesso!')
      navigate('/messages')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const messageData = messageQuery.data

  if (isViewing && messageQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-64 w-full max-w-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/messages')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">
          {isViewing ? 'Mensagem' : 'Nova Mensagem'}
        </h1>
      </div>

      {isViewing && messageData ? (
        <div className="bg-white rounded-lg shadow p-8 space-y-4 max-w-2xl">
          <div className="border-b pb-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">De:</label>
                <p className="text-gray-900 mt-1">{messageData.sender_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Data:</label>
                <p className="text-gray-900 mt-1">
                  {new Date(messageData.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Assunto:</label>
              <p className="text-gray-900 mt-1 font-semibold">{messageData.subject}</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mensagem:</label>
            <div className="bg-gray-50 p-4 rounded-md text-gray-900 whitespace-pre-wrap">
              {messageData.body}
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => navigate('/messages')}>
              Voltar
            </Button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white rounded-lg shadow p-8 space-y-6 max-w-2xl"
        >
          <fieldset disabled={submitting}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Destinatário</label>
                <select
                  {...register('recipient', { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecionar</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name}
                    </option>
                  ))}
                </select>
                {errors.recipient && (
                  <p className="text-red-600 text-sm mt-1">{errors.recipient.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assunto</label>
                <input
                  {...register('subject')}
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Assunto da mensagem"
                />
                {errors.subject && (
                  <p className="text-red-600 text-sm mt-1">{errors.subject.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mensagem</label>
                <textarea
                  {...register('body')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Digite sua mensagem..."
                  rows={6}
                />
                {errors.body && (
                  <p className="text-red-600 text-sm mt-1">{errors.body.message}</p>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Enviando...' : 'Enviar'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/messages')}
                disabled={submitting}
              >
                Cancelar
              </Button>
            </div>
          </fieldset>
        </form>
      )}
    </div>
  )
}
