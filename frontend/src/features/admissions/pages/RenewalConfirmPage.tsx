import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea, Checkbox } from '@/components/ui/Field'
import { FormSection } from '@/components/ui/FormSection'
import { getErrorMessage } from '@/utils/api-helpers'
import { ROUTES } from '@/app/routes/paths'
import type { RenewalOutcome } from '@/types/api'
import { fetchRenewal, submitRenewal } from '../api/admissionsApi'

const OPTIONS: { value: RenewalOutcome; label: string; hint: string }[] = [
  { value: 'STAY', label: 'Permanecer na mesma escola', hint: 'A secretaria efetiva a matrícula do próximo ano.' },
  { value: 'INTERNAL_TRANSFER', label: 'Solicitar transferência interna', hint: 'Você escolhe até 3 escolas e entra na alocação de vagas.' },
  { value: 'NOT_RETURNING', label: 'Não retornará à rede', hint: 'A vaga é liberada.' },
]

export default function RenewalConfirmPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [outcome, setOutcome] = useState<RenewalOutcome | ''>('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [hasNee, setHasNee] = useState(false)
  const [neeNote, setNeeNote] = useState('')

  const q = useQuery({ queryKey: ['admissions', 'renewal', id], queryFn: () => fetchRenewal(id as string) })

  useEffect(() => {
    if (q.data) {
      setPhone(q.data.contact_phone || '')
      setAddress(q.data.residential_address || '')
    }
  }, [q.data])

  const submit = useMutation({
    mutationFn: () =>
      submitRenewal(id as string, {
        outcome: outcome as RenewalOutcome,
        contact_phone: phone,
        residential_address: address,
        has_new_special_needs: hasNee,
        special_needs_note: neeNote,
      }),
    onSuccess: (r) => {
      toast.success('Rematrícula confirmada.')
      const transferId = (r as { transfer_request_id?: string | null }).transfer_request_id
      if (r.outcome === 'INTERNAL_TRANSFER' && transferId) {
        navigate(ROUTES.enrollmentRequestEdit(transferId))
      } else {
        navigate(ROUTES.myAdmissions)
      }
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  if (q.isLoading) {
    return (
      <>
        <PageHeader breadcrumb={[{ label: 'Rematrícula', to: ROUTES.myAdmissions }]} title="Confirmar rematrícula" />
        <TableSkeleton rows={5} cols={2} />
      </>
    )
  }
  if (q.isError || !q.data) {
    return (
      <>
        <PageHeader breadcrumb={[{ label: 'Rematrícula', to: ROUTES.myAdmissions }]} title="Confirmar rematrícula" />
        <EmptyState title="Não encontrada" description="Esta rematrícula não está disponível." />
      </>
    )
  }

  const r = q.data

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Rematrícula', to: ROUTES.myAdmissions }, { label: r.student_name }]}
        title={`Rematrícula ${r.target_year} — ${r.student_name}`}
        meta={`${r.current_school} · ${r.current_class}`}
      />

      {!r.renewal_open && (
        <EmptyState title="Fora do período" description="A janela de rematrícula não está aberta." />
      )}

      <form
        className="grid gap-1"
        onSubmit={(e) => {
          e.preventDefault()
          if (!outcome) {
            toast.error('Escolha uma opção.')
            return
          }
          submit.mutate()
        }}
      >
        <FormSection title="Dados de contato" description="Confirme ou atualize." first>
          <Field label="Telefone" name="phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
          </Field>
          <Field label="Endereço residencial" name="address" className="sm:col-span-2">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
          <div className="sm:col-span-2 grid gap-2">
            <Checkbox label="Há um novo laudo / necessidade educacional especial" checked={hasNee} onChange={(e) => setHasNee(e.target.checked)} />
            {hasNee && (
              <Field label="Descreva" name="nee">
                <Textarea rows={3} value={neeNote} onChange={(e) => setNeeNote(e.target.value)} />
              </Field>
            )}
          </div>
        </FormSection>

        <FormSection title="Decisão" description="O que deseja para o próximo ano letivo?">
          <div className="sm:col-span-2 grid gap-2">
            {OPTIONS.map((o) => (
              <label
                key={o.value}
                className={`flex cursor-pointer items-start gap-3 rounded border p-3 ${outcome === o.value ? 'border-brand-500 bg-brand-50' : 'border-line-strong'}`}
              >
                <input
                  type="radio"
                  name="outcome"
                  className="mt-1"
                  checked={outcome === o.value}
                  onChange={() => setOutcome(o.value)}
                />
                <span>
                  <span className="block text-label text-ink-800">{o.label}</span>
                  <span className="block text-help text-ink-500">{o.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </FormSection>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="secondary" onClick={() => navigate(ROUTES.myAdmissions)}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={submit.isPending} disabled={!r.renewal_open}>
            Confirmar
          </Button>
        </div>
      </form>
    </>
  )
}
