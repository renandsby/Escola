import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Field, Select } from '@/components/ui/Field'
import { apiGet, getErrorMessage } from '@/utils/api-helpers'
import { RENEWAL_OUTCOME_LABELS, type PaginatedResponse, type RenewalRequest, type SchoolClass } from '@/types/api'
import { fetchRenewals, materializeRenewal } from '../api/admissionsApi'

export default function AdmissionRenewalsPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'STAY' | 'INTERNAL_TRANSFER' | 'NOT_RETURNING' | 'PENDING'>('STAY')
  const [target, setTarget] = useState<RenewalRequest | null>(null)

  const list = useQuery({
    queryKey: ['admissions', 'renewals', tab],
    queryFn: () => fetchRenewals({ outcome: tab }),
  })

  const columns: Column<RenewalRequest>[] = [
    { key: 'student', header: 'Aluno', render: (r) => r.student_name },
    { key: 'school', header: 'Escola atual', render: (r) => `${r.current_school} · ${r.current_class}` },
    { key: 'year', header: 'Ano alvo', align: 'right', render: (r) => r.target_year },
    { key: 'outcome', header: 'Decisão', render: (r) => <Badge tone="brand">{RENEWAL_OUTCOME_LABELS[r.outcome]}</Badge> },
    {
      key: 'done',
      header: 'Efetivada',
      render: (r) => (r.next_enrollment_id ? <Badge tone="ok">Sim</Badge> : <Badge tone="neutral" shape="square">Não</Badge>),
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Admissões' }, { label: 'Rematrículas' }]}
        title="Rematrículas"
      />
      <div className="flex gap-2">
        {(['STAY', 'INTERNAL_TRANSFER', 'NOT_RETURNING', 'PENDING'] as const).map((t) => (
          <Button key={t} size="sm" variant={tab === t ? 'primary' : 'secondary'} onClick={() => setTab(t)}>
            {t === 'PENDING' ? 'Pendentes' : RENEWAL_OUTCOME_LABELS[t]}
          </Button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={list.data?.results ?? []}
        rowKey={(r) => r.id}
        isLoading={list.isLoading}
        empty={<EmptyState title="Nada aqui" description="Nenhuma rematrícula nesta situação." />}
        rowActions={(r) =>
          tab === 'STAY' && !r.next_enrollment_id ? (
            <Button size="sm" variant="secondary" onClick={() => setTarget(r)}>
              Efetivar
            </Button>
          ) : null
        }
      />

      {target && (
        <MaterializeModal
          renewal={target}
          onClose={() => setTarget(null)}
          onDone={() => {
            setTarget(null)
            queryClient.invalidateQueries({ queryKey: ['admissions', 'renewals'] })
          }}
        />
      )}
    </>
  )
}

function MaterializeModal({
  renewal,
  onClose,
  onDone,
}: {
  renewal: RenewalRequest
  onClose: () => void
  onDone: () => void
}) {
  const [classId, setClassId] = useState('')
  const classes = useQuery({
    queryKey: ['classes', 'for-materialize', renewal.id],
    queryFn: () =>
      apiGet<PaginatedResponse<SchoolClass>>('classes/', {
        page_size: 200,
        academic_year__year: renewal.target_year,
      }),
  })

  const run = useMutation({
    mutationFn: () => materializeRenewal(renewal.id, classId),
    onSuccess: () => {
      toast.success('Matrícula efetivada.')
      onDone()
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="grid w-full max-w-md gap-4 rounded-lg border border-line bg-white p-6 shadow-overlay" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h2 className="text-section text-ink-900">Efetivar rematrícula — {renewal.student_name}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar"><X className="h-4 w-4 text-ink-400" /></button>
        </div>
        <p className="text-help text-ink-500">
          Escolha a turma de {renewal.target_year} na mesma escola ({renewal.current_school}).
        </p>
        <Field label="Turma" name="school_class" required>
          <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">{classes.isLoading ? 'Carregando…' : 'Selecionar'}</option>
            {(classes.data?.results ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.school_name ? ` — ${c.school_name}` : ''}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={!classId} loading={run.isPending} onClick={() => run.mutate()}>
            Efetivar
          </Button>
        </div>
      </div>
    </div>
  )
}
