import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/PageHeader'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { FormSection, StickyActions } from '@/components/ui/FormSection'
import { Button } from '@/components/ui/Button'
import { FormError } from '@/components/feedback/FormError'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { apiGet, apiPost } from '@/utils/api-helpers'
import type { PaginatedResponse, User } from '@/types/api'
import { ROUTES } from '@/app/routes/paths'

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
  const [submitError, setSubmitError] = useState<unknown>(null)

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

  const methods = useForm<MessageFormData>({ resolver: zodResolver(messageSchema) })
  const { register, handleSubmit } = methods

  useEffect(() => {
    if (messageQuery.isError) {
      toast.error('Erro ao carregar mensagem')
    }
  }, [messageQuery.isError])

  const onSubmit = async (data: MessageFormData) => {
    setSubmitError(null)
    setSubmitting(true)
    try {
      await apiPost('communications/', data)
      toast.success('Mensagem enviada.')
      navigate(ROUTES.messages)
    } catch (error) {
      setSubmitError(error)
    } finally {
      setSubmitting(false)
    }
  }

  const messageData = messageQuery.data

  if (isViewing && messageQuery.isLoading) {
    return (
      <>
        <PageHeader breadcrumb={[{ label: 'Mensagens', to: ROUTES.messages }]} title="Mensagem" />
        <TableSkeleton rows={4} cols={1} />
      </>
    )
  }

  if (isViewing && messageData) {
    return (
      <>
        <PageHeader
          breadcrumb={[{ label: 'Mensagens', to: ROUTES.messages }, { label: messageData.subject }]}
          title={messageData.subject}
          meta={
            <>
              <span>De: {messageData.sender_name || '—'}</span>
              <span className="tabular-nums">
                {new Date(messageData.created_at).toLocaleString('pt-BR')}
              </span>
            </>
          }
          actions={
            <Button variant="secondary" onClick={() => navigate(ROUTES.messages)}>
              Voltar
            </Button>
          }
        />
        <div className="whitespace-pre-wrap rounded-lg border border-line bg-white p-6 text-base text-ink-700">
          {messageData.body}
        </div>
      </>
    )
  }

  return (
    <FormProvider {...methods}>
      <PageHeader
        breadcrumb={[{ label: 'Mensagens', to: ROUTES.messages }, { label: 'Nova mensagem' }]}
        title="Nova mensagem"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-1">
        {!!submitError && <FormError error={submitError} />}

        <fieldset disabled={submitting} className="grid gap-1">
          <FormSection title="Mensagem" description="Escolha o destinatário e escreva o conteúdo." first>
            <Field label="Destinatário" name="recipient" required className="sm:col-span-2">
              <Select {...register('recipient', { valueAsNumber: true })}>
                <option value="">Selecionar</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.first_name} {u.last_name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Assunto" name="subject" required className="sm:col-span-2">
              <Input {...register('subject')} placeholder="Assunto da mensagem" />
            </Field>
            <Field label="Mensagem" name="body" required className="sm:col-span-2">
              <Textarea rows={6} {...register('body')} placeholder="Digite sua mensagem…" />
            </Field>
          </FormSection>
        </fieldset>

        <StickyActions>
          <Button type="button" variant="secondary" onClick={() => navigate(ROUTES.messages)}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={submitting}>
            Enviar
          </Button>
        </StickyActions>
      </form>
    </FormProvider>
  )
}
