import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/PageHeader'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { FormSection, StickyActions } from '@/components/ui/FormSection'
import { Button } from '@/components/ui/Button'
import { FormError } from '@/components/feedback/FormError'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { isValidCPF } from '@/utils/validation'
import { ROUTES } from '@/app/routes/paths'
import { createGuardian, fetchGuardian, updateGuardian } from '../api/guardiansApi'

const guardianSchema = z.object({
  full_name: z.string().min(3, 'Informe o nome completo'),
  cpf: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v.length === 11, 'CPF deve ter 11 dígitos')
    .refine(isValidCPF, 'CPF inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  occupation: z.string().optional().or(z.literal('')),
})

type GuardianFormData = z.infer<typeof guardianSchema>

export default function GuardianFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditing = !!id
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<unknown>(null)

  const guardianQuery = useQuery({
    queryKey: ['guardian', id],
    queryFn: () => fetchGuardian(id as string),
    enabled: isEditing,
  })

  const methods = useForm<GuardianFormData>({
    resolver: zodResolver(guardianSchema),
    defaultValues: { full_name: '', cpf: '', phone: '', email: '', address: '', occupation: '' },
  })
  const { register, handleSubmit, reset } = methods

  useEffect(() => {
    if (guardianQuery.data) {
      const g = guardianQuery.data
      reset({
        full_name: g.full_name,
        cpf: g.cpf ?? '',
        phone: g.phone ?? '',
        email: g.email ?? '',
        address: g.address ?? '',
        occupation: g.occupation ?? '',
      })
    }
  }, [guardianQuery.data, reset])

  useEffect(() => {
    if (guardianQuery.isError) {
      toast.error('Erro ao carregar responsável')
    }
  }, [guardianQuery.isError])

  const onSubmit = async (data: GuardianFormData) => {
    setSubmitError(null)
    setSubmitting(true)
    try {
      const payload = {
        full_name: data.full_name,
        cpf: data.cpf,
        phone: data.phone,
        email: data.email ?? '',
        address: data.address ?? '',
        occupation: data.occupation ?? '',
      }
      if (isEditing) {
        const updated = await updateGuardian(id as string, payload)
        toast.success('Responsável atualizado.')
        navigate(ROUTES.guardian(updated.id))
      } else {
        const created = await createGuardian(payload)
        toast.success('Responsável cadastrado.')
        navigate(ROUTES.guardian(created.id))
      }
    } catch (error) {
      setSubmitError(error)
    } finally {
      setSubmitting(false)
    }
  }

  const title = isEditing ? 'Editar responsável' : 'Novo responsável'

  if (isEditing && guardianQuery.isLoading) {
    return (
      <>
        <PageHeader breadcrumb={[{ label: 'Responsáveis', to: ROUTES.guardians }]} title={title} />
        <TableSkeleton rows={6} cols={2} />
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Responsáveis', to: ROUTES.guardians }, { label: title }]}
        title={title}
      />

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-1">
          {!!submitError && <FormError error={submitError} />}

          <fieldset disabled={submitting} className="grid gap-1">
            <FormSection title="Identificação" description="Dados civis do responsável." first>
              <Field label="Nome completo" name="full_name" required className="sm:col-span-2">
                <Input {...register('full_name')} placeholder="Nome completo do responsável" />
              </Field>
              <Field label="CPF" name="cpf" required mono>
                <Input {...register('cpf')} placeholder="000.000.000-00" maxLength={14} />
              </Field>
              <Field label="Ocupação / profissão" name="occupation">
                <Input {...register('occupation')} placeholder="Ex.: Comerciante" />
              </Field>
            </FormSection>

            <FormSection title="Contato" description="Usados para comunicação da escola.">
              <Field label="Telefone" name="phone" required>
                <Input {...register('phone')} placeholder="(00) 00000-0000" />
              </Field>
              <Field label="Email" name="email">
                <Input {...register('email')} type="email" placeholder="email@exemplo.com" />
              </Field>
              <Field label="Endereço" name="address" className="sm:col-span-2">
                <Textarea {...register('address')} rows={3} placeholder="Rua, número, bairro, cidade, CEP" />
              </Field>
            </FormSection>
          </fieldset>

          <StickyActions>
            <Button type="button" variant="secondary" onClick={() => navigate(ROUTES.guardians)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              {isEditing ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </StickyActions>
        </form>
      </FormProvider>
    </>
  )
}
