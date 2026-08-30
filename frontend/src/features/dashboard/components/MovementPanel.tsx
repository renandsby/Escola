import { useNavigate } from 'react-router-dom'
import { EmptyState } from '@/components/ui/EmptyState'
import { labelOf, TRANSFER_STATUS } from '@/components/ui/statusMaps'
import { Panel, FooterLink } from './Panel'
import type { Movement } from '../types'

const FILL: Record<string, string> = {
  PENDING_SME: 'fill-warn-base',
  APPROVED_BY_SME: 'fill-brand-600',
  ACCEPTED_BY_DESTINATION: 'fill-ok-base',
  REJECTED: 'fill-danger-base',
  CANCELLED: 'fill-ink-400',
  DROPOUT: 'fill-danger-base',
}

const W = 640
const ROW_H = 34
const LABEL_W = 210
const BAR_X = LABEL_W
const NUM_W = 40

/**
 * Barras horizontais — transferências por status + evasão (§4.5 do plano).
 * SVG próprio; o valor absoluto é impresso à direita de cada barra.
 */
export function MovementPanel({ data, year }: { data: Movement | null; year: number | null }) {
  const navigate = useNavigate()

  if (!data) {
    return (
      <Panel
        title="Movimentação de matrículas"
        description={`Transferências e saídas${year ? ` no ano letivo de ${year}` : ''}.`}
      >
        <div className="p-[18px]">
          <EmptyState
            title="Sem movimentação"
            description="Nenhuma transferência ou saída registrada no ano letivo."
          />
        </div>
      </Panel>
    )
  }

  const rows = [
    ...data.by_status.map((s) => ({
      key: s.status,
      label: labelOf(TRANSFER_STATUS, s.status),
      count: s.count,
      to: '/transferencias',
    })),
    { key: 'DROPOUT', label: 'Evasão registrada', count: data.dropout, to: '/matriculas' },
  ]
  const max = Math.max(1, ...rows.map((r) => r.count))
  const barW = W - LABEL_W - NUM_W - 12
  const height = rows.length * ROW_H + 10

  return (
    <Panel
      title="Movimentação de matrículas"
      description={`Transferências e saídas${year ? ` no ano letivo de ${year}` : ''}.`}
      footer={
        <>
          <span>
            Tempo médio de análise da SME:{' '}
            <strong className="font-mono tabular-nums">
              {data.sme_analysis_avg_days === null ? '—' : `${data.sme_analysis_avg_days} dias`}
            </strong>
          </span>
          <FooterLink to="/transferencias?status=PENDING_SME">Analisar pendentes</FooterLink>
        </>
      }
    >
      <div className="p-[18px]">
        <svg
          viewBox={`0 0 ${W} ${height}`}
          className="block h-auto w-full"
          role="img"
          aria-label={rows.map((r) => `${r.label}: ${r.count}`).join('; ')}
        >
          {rows.map((r, i) => {
            const y = i * ROW_H + 5
            const w = (r.count / max) * barW
            return (
              <g
                key={r.key}
                className="cursor-pointer"
                onClick={() => navigate(r.to)}
              >
                <text x={0} y={y + 15} className="fill-ink-700 text-[12.5px]">
                  {r.label}
                </text>
                <rect x={BAR_X} y={y + 3} width={barW} height={14} className="fill-line-soft" rx={2} />
                <rect x={BAR_X} y={y + 3} width={Math.max(2, w)} height={14} className={FILL[r.key] ?? 'fill-ink-400'} rx={2} />
                <text
                  x={W - 8}
                  y={y + 15}
                  className={`font-mono text-[12.5px] font-semibold ${r.key === 'DROPOUT' && r.count > 0 ? 'fill-danger-fg' : 'fill-ink-700'}`}
                  textAnchor="end"
                >
                  {r.count}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </Panel>
  )
}
