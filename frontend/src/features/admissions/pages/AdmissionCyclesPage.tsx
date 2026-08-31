import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Plus, ChevronRight, Send } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { FormSection } from '@/components/ui/FormSection'
import { getErrorMessage } from '@/utils/api-helpers'
import { formatDateTime } from '@/utils/formatting'
import { useAcademicYearsQuery } from '@/features/students/hooks/useAcademicYearsQuery'
import { ADMISSION_CYCLE_STATUS_LABELS, type AdmissionCycle } from '@/types/api'
import {
  advanceCycle,
  createCycle,
  fetchCycles,
  openRenewals,
} from '../api/admissionsApi'

type FormData = {
  target_academic_year: string
  name: string
  renewal_opens_at: string
  renewal_closes_at: string
  new_request_opens_at: string
  new_request_closes_at: string
}

export default function AdmissionCyclesPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const years = useAcademicYearsQuery().data?.results ?? []

  const list = useQuery({ queryKey: ['admissions', 'cycles'], queryFn: fetchCycles })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admissions', 'cycles'] })

  const create = useMutation({
    mutationFn: (d: FormData) => createCycle(d),
    onSuccess: () => {
      toast.success('Ciclo criado.')
      setShowForm(false)
      invalidate()
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const advance = useMutation({
    mutationFn: (id: string) => advanceCycle(id),
    onSuccess: (c) => {
      toast.success(`Ciclo em: ${ADMISSION_CYCLE_STATUS_LABELS[c.status]}`)
      invalidate()
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const renewals = useMutation({
    mutationFn: (id: string) => openRenewals(id),
    onSuccess: (r) =>
      toast.success(`${r.created} rematrícula(s) aberta(s), ${r.notified} responsável(is) avisado(s).`),
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const { register, handleSubmit, reset } = useForm<FormData>()

  const columns: Column<AdmissionCycle>[] = [
    { key: 'name', header: 'Ciclo', render: (c) => <span className="font-medium">{c.name}</span> },
    { key: 'year', header: 'Ano alvo', align: 'right', render: (c) => c.target_year },
    {
      key: 'status',
      header: 'Status',
      render: (c) => <Badge tone="brand">{ADMISSION_CYCLE_STATUS_LABELS[c.status]}</Badge>,
    },
    { key: 'renewal', header: 'Rematrícula', render: (c) => formatDateTime(c.renewal_opens_at) + ' → ' + formatDateTime(c.renewal_closes_at) },
    { key: 'new', header: 'Novas', render: (c) => formatDateTime(c.new_request_opens_at) + ' → ' + formatDateTime(c.new_request_closes_at) },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Admissões' }, { label: 'Ciclos' }]}
        title="Ciclos de admissão"
        actions={
          <Button variant="primary" iconLeft={<Plus className="h-4 w-4" />} onClick={() => { reset(); setShowForm((v) => !v) }}>
            Novo ciclo
          </Button>
        }
      />

      {showForm && (
        <form
          onSubmit={handleSubmit((d) => create.mutate(d))}
          className="grid gap-1 rounded-lg border border-line bg-white p-6"
        >
          <FormSection title="Novo ciclo" description="A rematrícula precisa fechar antes de abrir as novas matrículas." first>
            <Field label="Nome" name="name" required className="sm:col-span-2">
              <Input {...register('name', { required: true })} placeholder="Ex.: Admissão 2027" />
            </Field>
            <Field label="Ano letivo de destino" name="target_academic_year" required>
              <select
                {...register('target_academic_year', { required: true })}
                className="h-control w-full rounded border border-line-strong bg-white px-3 text-base"
              >
                <option value="">Selecionar</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>{y.year}</option>
                ))}
              </select>
            </Field>
            <Field label="Rematrícula abre" name="renewal_opens_at" required>
              <Input type="datetime-local" {...register('renewal_opens_at', { required: true })} />
            </Field>
            <Field label="Rematrícula fecha" name="renewal_closes_at" required>
              <Input type="datetime-local" {...register('renewal_closes_at', { required: true })} />
            </Field>
            <Field label="Novas matrículas abrem" name="new_request_opens_at" required>
              <Input type="datetime-local" {...register('new_request_opens_at', { required: true })} />
            </Field>
            <Field label="Novas matrículas fecham" name="new_request_closes_at" required>
              <Input type="datetime-local" {...register('new_request_closes_at', { required: true })} />
            </Field>
          </FormSection>
          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" variant="primary" loading={create.isPending}>Criar ciclo</Button>
          </div>
        </form>
      )}

      <DataTable
        columns={columns}
        rows={list.data?.results ?? []}
        rowKey={(c) => c.id}
        isLoading={list.isLoading}
        empty={<EmptyState title="Nenhum ciclo" description="Crie o primeiro ciclo de admissão." />}
        rowActions={(c) => (
          <>
            {c.status === 'RENEWAL_OPEN' && (
              <Button size="sm" variant="ghost" onClick={() => renewals.mutate(c.id)} title="Abrir rematrículas">
                <Send className="h-4 w-4" />
              </Button>
            )}
            {c.next_status && (
              <Button size="sm" variant="ghost" onClick={() => advance.mutate(c.id)} title={`Avançar para ${ADMISSION_CYCLE_STATUS_LABELS[c.next_status]}`}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      />
    </>
  )
}
