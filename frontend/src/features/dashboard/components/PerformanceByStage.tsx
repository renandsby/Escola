import { useNavigate } from 'react-router-dom'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Panel } from './Panel'
import type { Performance } from '../types'

const fmt = (n: number) => n.toLocaleString('pt-BR')

export function PerformanceByStage({ data }: { data: Performance | null }) {
  const navigate = useNavigate()
  return (
    <Panel
      title="Rendimento por etapa"
      description="Projeção com base nas notas lançadas no período."
    >
      {!data ? (
        <div className="p-[18px]">
          <EmptyState
            title="Sem notas lançadas"
            description="O rendimento por etapa aparece quando o diário de notas do período for preenchido."
          />
        </div>
      ) : (
        <div className="grid gap-4 p-[18px]">
          {data.numeric_stages.map((s) => (
            <button
              key={s.stage}
              type="button"
              onClick={() => navigate(s.link)}
              className="grid gap-1.5 rounded p-1 text-left transition-colors hover:bg-surface-hover"
            >
              <div className="flex justify-between text-label text-ink-700">
                <span>{s.label}</span>
                <span className="font-mono tabular-nums text-ink-500">{fmt(s.total)}</span>
              </div>
              <div className="flex h-3.5 overflow-hidden rounded-[3px]">
                <span className="bg-ok-base" style={{ width: `${s.sufficient_pct}%` }} />
                <span className="bg-warn-base" style={{ width: `${s.recovery_pct}%` }} />
                <span className="bg-danger-base" style={{ width: `${s.at_risk_pct}%` }} />
              </div>
              <span className="font-mono text-help tabular-nums text-ink-400">
                {s.sufficient_pct}% suficiente · {s.recovery_pct}% recuperação · {s.at_risk_pct}% risco
              </span>
            </button>
          ))}

          {data.qualitative && (
            <button
              type="button"
              onClick={() => data.qualitative && navigate(data.qualitative.link)}
              className="grid gap-1.5 border-t border-line-soft pt-3.5 text-left"
            >
              <div className="flex items-center justify-between text-label text-ink-700">
                <span>{data.qualitative.label}</span>
                <Badge tone="qual" shape="diamond">
                  Parecer descritivo
                </Badge>
              </div>
              <div className="flex h-3.5 overflow-hidden rounded-[3px] bg-line-soft">
                <span
                  className="bg-qual-base"
                  style={{ width: `${data.qualitative.reports_delivered_pct ?? 0}%` }}
                />
              </div>
              <span className="font-mono text-help tabular-nums text-ink-400">
                {data.qualitative.reports_delivered_pct ?? '—'}% dos pareceres entregues ·{' '}
                {fmt(data.qualitative.children)} crianças
              </span>
            </button>
          )}
        </div>
      )}
    </Panel>
  )
}
