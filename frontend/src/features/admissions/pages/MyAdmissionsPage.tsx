import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, ClipboardCheck, FileText } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { ROUTES } from '@/app/routes/paths'
import { formatDate } from '@/utils/formatting'
import { RENEWAL_OUTCOME_LABELS } from '@/types/api'
import { fetchCycles, fetchEnrollmentRequests, fetchRenewals } from '../api/admissionsApi'

const REQ_STATUS: Record<string, string> = {
  DRAFT: 'Rascunho',
  SUBMITTED: 'Enviada',
  AWAITING_PROCESSING: 'Aguardando processamento',
  CANCELLED: 'Cancelada',
}

export default function MyAdmissionsPage() {
  const navigate = useNavigate()
  const cycles = useQuery({ queryKey: ['admissions', 'cycles'], queryFn: fetchCycles })
  const renewals = useQuery({ queryKey: ['admissions', 'my-renewals'], queryFn: () => fetchRenewals() })
  const requests = useQuery({
    queryKey: ['admissions', 'my-requests'],
    queryFn: () => fetchEnrollmentRequests(),
  })

  const newOpen = (cycles.data?.results ?? []).some((c) => c.new_request_open)
  const pendingRenewals = (renewals.data?.results ?? []).filter((r) => r.outcome === 'PENDING')
  const doneRenewals = (renewals.data?.results ?? []).filter((r) => r.outcome !== 'PENDING')

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Matrícula e rematrícula' }]}
        title="Matrícula e rematrícula"
        meta="Confirme a rematrícula dos seus filhos ou solicite uma nova vaga."
        actions={
          newOpen ? (
            <Button
              variant="primary"
              iconLeft={<Plus className="h-4 w-4" />}
              onClick={() => navigate(ROUTES.enrollmentRequestNew)}
            >
              Nova solicitação
            </Button>
          ) : undefined
        }
      />

      <section className="grid gap-3 rounded-lg border border-line bg-white p-6">
        <h2 className="flex items-center gap-2 text-section text-ink-900">
          <ClipboardCheck className="h-4 w-4 text-brand-600" /> Rematrícula
        </h2>
        {renewals.isLoading ? (
          <TableSkeleton rows={2} cols={2} />
        ) : pendingRenewals.length === 0 && doneRenewals.length === 0 ? (
          <EmptyState title="Nada pendente" description="Não há rematrícula em aberto para os seus filhos." />
        ) : (
          <ul className="grid gap-2">
            {pendingRenewals.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-4 border-b border-line-soft pb-2">
                <div>
                  <p className="text-label text-ink-800">{r.student_name}</p>
                  <p className="text-help text-ink-500">
                    {r.current_school} · {r.current_class} → {r.target_year}
                  </p>
                </div>
                <Button size="sm" variant="primary" onClick={() => navigate(ROUTES.renewalConfirm(r.id))}>
                  Revisar e confirmar
                </Button>
              </li>
            ))}
            {doneRenewals.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-4 border-b border-line-soft pb-2 last:border-0">
                <div>
                  <p className="text-label text-ink-800">{r.student_name}</p>
                  <p className="text-help text-ink-500">{r.current_school} → {r.target_year}</p>
                </div>
                <Badge tone={r.next_enrollment_id ? 'ok' : 'brand'}>
                  {RENEWAL_OUTCOME_LABELS[r.outcome]}
                  {r.next_enrollment_id ? ' · efetivada' : ''}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-3 rounded-lg border border-line bg-white p-6">
        <h2 className="flex items-center gap-2 text-section text-ink-900">
          <FileText className="h-4 w-4 text-brand-600" /> Solicitações de matrícula
        </h2>
        {requests.isLoading ? (
          <TableSkeleton rows={2} cols={2} />
        ) : (requests.data?.results ?? []).length === 0 ? (
          <EmptyState
            title="Nenhuma solicitação"
            description={newOpen ? 'Clique em "Nova solicitação" para começar.' : 'As novas matrículas não estão abertas no momento.'}
          />
        ) : (
          <ul className="grid gap-2">
            {(requests.data?.results ?? []).map((req) => (
              <li key={req.id} className="flex items-center justify-between gap-4 border-b border-line-soft pb-2 last:border-0">
                <div>
                  <p className="text-label text-ink-800">{req.applicant_display}</p>
                  <p className="text-help text-ink-500">
                    {req.target_year} · {req.preferences.length} escola(s) ·{' '}
                    {req.submitted_at ? `enviada em ${formatDate(req.submitted_at)}` : 'rascunho'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={req.status === 'AWAITING_PROCESSING' ? 'ok' : 'neutral'}>
                    {REQ_STATUS[req.status] ?? req.status}
                  </Badge>
                  {req.status === 'DRAFT' && (
                    <Button size="sm" variant="secondary" onClick={() => navigate(ROUTES.enrollmentRequestEdit(req.id))}>
                      Continuar
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
