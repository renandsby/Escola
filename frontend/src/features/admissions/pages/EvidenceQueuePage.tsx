import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Check, X } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { getErrorMessage } from '@/utils/api-helpers'
import { formatDate } from '@/utils/formatting'
import { EVIDENCE_KIND_LABELS, type PriorityEvidence } from '@/types/api'
import { fetchEvidenceQueue, verifyEvidence } from '../api/admissionsApi'

export default function EvidenceQueuePage() {
  const queryClient = useQueryClient()
  const [onlyPending, setOnlyPending] = useState(true)

  const list = useQuery({
    queryKey: ['admissions', 'evidence', { onlyPending }],
    queryFn: () => fetchEvidenceQueue(onlyPending ? { status: 'PENDING' } : {}),
  })

  const verify = useMutation({
    mutationFn: (v: { id: string; decision: 'VERIFIED' | 'REJECTED'; note?: string }) =>
      verifyEvidence(v.id, v.decision, v.note ?? ''),
    onSuccess: () => {
      toast.success('Comprovante verificado.')
      queryClient.invalidateQueries({ queryKey: ['admissions', 'evidence'] })
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  function onReject(ev: PriorityEvidence) {
    const reason = window.prompt('Motivo da rejeição (mostrado ao responsável):')
    if (reason && reason.trim()) {
      verify.mutate({ id: ev.id, decision: 'REJECTED', note: reason.trim() })
    }
  }

  const columns: Column<PriorityEvidence>[] = [
    { key: 'applicant', header: 'Candidato', render: (e) => e.request_applicant || '—' },
    { key: 'kind', header: 'Tipo', render: (e) => EVIDENCE_KIND_LABELS[e.kind] },
    { key: 'file', header: 'Arquivo', render: (e) => (
      <a className="text-brand-600 underline" href={e.file} target="_blank" rel="noreferrer">{e.file_name}</a>
    ) },
    { key: 'date', header: 'Enviado', render: (e) => (e.created_at ? formatDate(e.created_at) : '—') },
    {
      key: 'status',
      header: 'Situação',
      render: (e) => (
        <Badge tone={e.status === 'VERIFIED' ? 'ok' : e.status === 'REJECTED' ? 'danger' : 'neutral'}>
          {e.status === 'VERIFIED' ? 'Verificado' : e.status === 'REJECTED' ? 'Rejeitado' : 'Aguardando'}
        </Badge>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Admissões' }, { label: 'Comprovantes' }]}
        title="Verificação de comprovantes"
        actions={
          <Button variant="secondary" onClick={() => setOnlyPending((v) => !v)}>
            {onlyPending ? 'Ver todos' : 'Só pendentes'}
          </Button>
        }
      />
      <DataTable
        columns={columns}
        rows={list.data?.results ?? []}
        rowKey={(e) => e.id}
        isLoading={list.isLoading}
        empty={<EmptyState title="Fila vazia" description="Nenhum comprovante para verificar." />}
        rowActions={(e) =>
          e.status === 'PENDING' ? (
            <>
              <Button size="sm" variant="ghost" title="Aprovar" onClick={() => verify.mutate({ id: e.id, decision: 'VERIFIED' })}>
                <Check className="h-4 w-4 text-ok-fg" />
              </Button>
              <Button size="sm" variant="ghost" title="Rejeitar" onClick={() => onReject(e)}>
                <X className="h-4 w-4 text-danger-fg" />
              </Button>
            </>
          ) : null
        }
      />
    </>
  )
}
