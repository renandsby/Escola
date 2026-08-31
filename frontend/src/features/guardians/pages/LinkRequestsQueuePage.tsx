import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Check, X } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { getErrorCode } from '@/utils/api-helpers'
import { resolveError } from '@/services/errorMessages'
import { formatDate } from '@/utils/formatting'
import { KINSHIP_TYPE_LABELS, type StudentGuardianLink } from '@/types/api'
import { fetchLinkRequests, reviewLinkRequest } from '../api/guardiansApi'

const METHOD_LABEL: Record<string, string> = {
  SCHOOL_APPROVAL: 'Solicitação',
  LINK_CODE: 'Código',
  STAFF_CREATED: 'Equipe',
}

export default function LinkRequestsQueuePage() {
  const queryClient = useQueryClient()
  const [onlyPending, setOnlyPending] = useState(true)

  const list = useQuery({
    queryKey: ['guardians', 'link-requests', { onlyPending }],
    queryFn: () => fetchLinkRequests(onlyPending ? { status: 'PENDING' } : {}),
  })

  const review = useMutation({
    mutationFn: (v: { id: string; decision: 'approve' | 'reject'; note?: string }) =>
      reviewLinkRequest(v.id, { decision: v.decision, note: v.note }),
    onSuccess: (_data, v) => {
      toast.success(v.decision === 'approve' ? 'Vínculo aprovado.' : 'Solicitação recusada.')
      queryClient.invalidateQueries({ queryKey: ['guardians', 'link-requests'] })
    },
    onError: (e) => toast.error(resolveError(getErrorCode(e)).message()),
  })

  function onReject(link: StudentGuardianLink) {
    const reason = window.prompt('Motivo da recusa (mostrado ao responsável):')
    if (reason && reason.trim()) {
      review.mutate({ id: link.id, decision: 'reject', note: reason.trim() })
    }
  }

  const columns: Column<StudentGuardianLink>[] = [
    { key: 'student', header: 'Estudante', render: (l) => l.student_name || '—' },
    { key: 'guardian', header: 'Responsável', render: (l) => l.guardian_name || l.requested_by_name || '—' },
    { key: 'kinship', header: 'Parentesco', render: (l) => KINSHIP_TYPE_LABELS[l.kinship_type] ?? l.kinship_type },
    { key: 'method', header: 'Origem', render: (l) => METHOD_LABEL[l.verification_method ?? ''] ?? '—' },
    { key: 'date', header: 'Atualizado', render: (l) => (l.confirmed_at ? formatDate(l.confirmed_at) : '—') },
    {
      key: 'status',
      header: 'Situação',
      render: (l) => (
        <Badge
          tone={l.status === 'CONFIRMED' ? 'ok' : l.status === 'REJECTED' ? 'danger' : 'neutral'}
        >
          {l.status === 'CONFIRMED' ? 'Confirmado' : l.status === 'REJECTED' ? 'Recusado' : 'Aguardando'}
        </Badge>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Pessoas' }, { label: 'Solicitações de vínculo' }]}
        title="Solicitações de vínculo de responsáveis"
        meta="Confirme o parentesco antes de liberar o acesso à vida escolar do estudante."
        actions={
          <Button variant="secondary" onClick={() => setOnlyPending((v) => !v)}>
            {onlyPending ? 'Ver todas' : 'Só pendentes'}
          </Button>
        }
      />
      <DataTable
        columns={columns}
        rows={list.data?.results ?? []}
        rowKey={(l) => l.id}
        isLoading={list.isLoading}
        empty={<EmptyState title="Fila vazia" description="Nenhuma solicitação de vínculo pendente." />}
        rowActions={(l) =>
          l.status === 'PENDING' ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                title="Aprovar"
                onClick={() => review.mutate({ id: l.id, decision: 'approve' })}
              >
                <Check className="h-4 w-4 text-ok-fg" />
              </Button>
              <Button size="sm" variant="ghost" title="Recusar" onClick={() => onReject(l)}>
                <X className="h-4 w-4 text-danger-fg" />
              </Button>
            </>
          ) : null
        }
      />
    </>
  )
}
