import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/utils/api-helpers'
import type { PaginatedResponse } from '@/types/api'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/ui/PageHeader'
import { ScopeBar, useScope } from '@/components/ui/ScopeBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/app/routes/paths'
import { cn } from '@/utils/cn'

interface DashboardSummary {
  students: number
  enrollments: number
  school_classes: number
  subjects: number
  schools: number
  teachers: number
}

const num = (n: number | undefined, loading: boolean) =>
  loading ? '…' : n === undefined ? '—' : n.toLocaleString('pt-BR')

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const scope = useScope()

  const summary = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => apiGet<DashboardSummary>('dashboard/summary/'),
  })
  const pendingTransfers = useQuery({
    queryKey: ['dashboard', 'pending-transfers'],
    queryFn: () => apiGet<PaginatedResponse<unknown>>('sme/transfers/', { status: 'PENDING_SME' }),
  })

  const s = summary.data ?? undefined
  const loading = summary.isLoading
  const transfersCount = pendingTransfers.data?.count ?? 0
  const noStudents = !loading && s?.students === 0

  const rede: { label: string; value: number | undefined; to: string; critical?: boolean }[] = [
    { label: 'Escolas', value: s?.schools, to: ROUTES.schools },
    { label: 'Turmas', value: s?.school_classes, to: ROUTES.classes },
    { label: 'Alunos', value: s?.students, to: ROUTES.students, critical: noStudents },
    { label: 'Matrículas ativas', value: s?.enrollments, to: ROUTES.enrollments },
    { label: 'Professores', value: s?.teachers, to: ROUTES.teachers },
    { label: 'Disciplinas', value: s?.subjects, to: ROUTES.curriculum },
  ]

  return (
    <>
      <PageHeader
        title={`Bom dia, ${user?.first_name || user?.username || ''}`}
        meta={<span>Painel do dia</span>}
      />
      <ScopeBar level={scope.level} title={scope.title} />

      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        {/* Precisa de você */}
        <section className="rounded-lg border border-line bg-white">
          <h2 className="border-b border-line px-4 py-3 text-section text-ink-900">Precisa de você</h2>
          <div className="divide-y divide-line-soft">
            {transfersCount > 0 ? (
              <PendingRow
                severity="warn"
                title={`${transfersCount} ${transfersCount === 1 ? 'transferência aguardando' : 'transferências aguardando'} autorização`}
                subtitle="Solicitações pendentes de análise pela Secretaria."
                to={ROUTES.transfers}
                action="Analisar"
              />
            ) : null}

            {transfersCount === 0 && !loading && (
              <div className="px-4 py-6">
                <EmptyState
                  title="Nada pendente"
                  description="Não há ações aguardando você no momento."
                />
              </div>
            )}
          </div>
        </section>

        {/* A rede hoje */}
        <section className="rounded-lg border border-line bg-white">
          <h2 className="border-b border-line px-4 py-3 text-section text-ink-900">
            {scope.level === 'network' ? 'A rede hoje' : 'Sua unidade hoje'}
          </h2>
          <dl className="divide-y divide-line-soft">
            {rede.map((row) => (
              <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                <dt>
                  <Link to={row.to} className="text-base text-ink-700 hover:text-brand-600">
                    {row.label}
                  </Link>
                </dt>
                <dd
                  className={cn(
                    'font-mono tabular-nums text-base',
                    row.critical ? 'text-danger-fg' : 'text-ink-900'
                  )}
                >
                  {num(row.value, loading)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      {noStudents && (
        <EmptyState
          title="Nenhum aluno cadastrado ainda"
          description="A carga do Censo Escolar traz escolas e turmas, mas não os microdados individuais dos alunos. Cadastre os alunos ou importe uma planilha da rede."
          actions={
            <>
              <Link to={ROUTES.studentNew}>
                <Button variant="primary">Cadastrar aluno</Button>
              </Link>
              <Link to={ROUTES.students}>
                <Button variant="secondary">Ver alunos</Button>
              </Link>
            </>
          }
        />
      )}
    </>
  )
}

function PendingRow({
  severity,
  title,
  subtitle,
  to,
  action,
}: {
  severity: 'warn' | 'danger'
  title: string
  subtitle: string
  to: string
  action: string
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <span
        aria-hidden
        className={cn(
          'mt-1.5 h-2 w-2 shrink-0 rounded-pill',
          severity === 'danger' ? 'bg-danger-base' : 'bg-warn-base'
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-label text-ink-700">{title}</p>
        <p className="text-help text-ink-500">{subtitle}</p>
      </div>
      <Link to={to}>
        <Button size="sm" variant="secondary">
          {action}
        </Button>
      </Link>
    </div>
  )
}
