import { useNavigate } from 'react-router-dom'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { labelOf, TRANSFER_STATUS } from '@/components/ui/statusMaps'
import type { BadgeProps } from '@/components/ui/Badge'
import { Panel, FooterLink } from './Panel'
import type { Movement } from '../types'

const BAR_FILL: Record<string, string> = {
  PENDING_SME: 'bg-warn-base',
  APPROVED_BY_SME: 'bg-brand-600',
  ACCEPTED_BY_DESTINATION: 'bg-ok-base',
  REJECTED: 'bg-danger-base',
  CANCELLED: 'bg-ink-400',
}

export function MovementPanel({ data, year }: { data: Movement | null; year: number | null }) {
  const navigate = useNavigate()
  const rows = data
    ? [...data.by_status, { status: 'DROPOUT', count: data.dropout }]
    : []
  const max = Math.max(1, ...rows.map((r) => r.count))

  return (
    <Panel
      title="Movimentação de matrículas"
      description={`Transferências e saídas${year ? ` no ano letivo de ${year}` : ''}.`}
      footer={
        data && (
          <>
            <span>
              Tempo médio de análise da SME:{' '}
              <strong className="font-mono tabular-nums">
                {data.sme_analysis_avg_days === null ? '—' : `${data.sme_analysis_avg_days} dias`}
              </strong>
            </span>
            <FooterLink to="/transferencias?status=PENDING_SME">Analisar pendentes</FooterLink>
          </>
        )
      }
    >
      {!data ? (
        <div className="p-[18px]">
          <EmptyState
            title="Sem movimentação"
            description="Nenhuma transferência ou saída registrada no ano letivo."
          />
        </div>
      ) : (
        <div className="grid gap-3.5 p-[18px]">
          {rows.map((r) => {
            const isDropout = r.status === 'DROPOUT'
            return (
              <button
                key={r.status}
                type="button"
                onClick={() => navigate(isDropout ? '/matriculas' : '/transferencias')}
                className="grid grid-cols-[180px_1fr_44px] items-center gap-3 rounded p-1 text-left hover:bg-surface-hover sm:grid-cols-[210px_1fr_56px]"
              >
                {isDropout ? (
                  <Badge tone="neutral" shape="diamond">
                    Evasão registrada
                  </Badge>
                ) : (
                  <Badge tone={(TRANSFER_STATUS[r.status]?.tone ?? 'neutral') as BadgeProps['tone']}>
                    {labelOf(TRANSFER_STATUS, r.status)}
                  </Badge>
                )}
                <span className="h-3 rounded-[3px] bg-line-soft">
                  <span
                    className={`block h-3 rounded-[3px] ${isDropout ? 'bg-ink-400' : BAR_FILL[r.status]}`}
                    style={{ width: `${(r.count / max) * 100}%` }}
                  />
                </span>
                <span
                  className={`text-right font-mono text-sm font-semibold tabular-nums ${isDropout ? 'text-danger-fg' : 'text-ink-700'}`}
                >
                  {r.count}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </Panel>
  )
}
