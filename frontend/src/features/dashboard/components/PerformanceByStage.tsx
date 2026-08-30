import { useNavigate } from 'react-router-dom'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel } from './Panel'
import type { Performance } from '../types'

const fmt = (n: number) => n.toLocaleString('pt-BR')

const SEGMENTS = [
  { key: 'sufficient_pct' as const, label: 'suficiente', fill: 'fill-ok-base' },
  { key: 'recovery_pct' as const, label: 'recuperação', fill: 'fill-warn-base' },
  { key: 'at_risk_pct' as const, label: 'risco', fill: 'fill-danger-base' },
]

const W = 640
const ROW_H = 46
const LABEL_W = 150
const BAR_X = LABEL_W
const BAR_W = W - LABEL_W - 12

/**
 * Barras horizontais empilhadas — % de alunos suficiente / recuperação / risco
 * por etapa numérica (§4.5 do plano). SVG próprio, sem lib. Rótulo numérico em
 * cada faixa; a linha de aprovação legal aparece como marca vertical rotulada.
 */
export function PerformanceByStage({ data }: { data: Performance | null }) {
  const navigate = useNavigate()

  if (!data) {
    return (
      <Panel title="Rendimento por etapa" description="Projeção com base nas notas lançadas no período.">
        <div className="p-[18px]">
          <EmptyState
            title="Sem notas lançadas"
            description="O rendimento por etapa aparece quando o diário de notas do período for preenchido."
          />
        </div>
      </Panel>
    )
  }

  const rows = data.numeric_stages
  const qual = data.qualitative
  const height = rows.length * ROW_H + (qual ? ROW_H + 30 : 0) + 12

  return (
    <Panel
      title="Rendimento por etapa"
      description="Projeção com base nas notas lançadas no período."
      right={
        <div className="flex flex-wrap gap-3 text-help text-ink-400">
          {SEGMENTS.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <svg width="10" height="10" aria-hidden><rect width="10" height="10" className={s.fill} /></svg>
              {s.label}
            </span>
          ))}
        </div>
      }
    >
      <div className="p-[18px]">
        <svg
          viewBox={`0 0 ${W} ${height}`}
          className="block h-auto w-full"
          role="img"
          aria-label={rows
            .map(
              (r) =>
                `${r.label}: ${r.sufficient_pct}% suficiente, ${r.recovery_pct}% recuperação, ${r.at_risk_pct}% risco (${fmt(r.total)} alunos)`
            )
            .join('; ')}
        >
          {rows.map((r, i) => {
            const y = i * ROW_H + 6
            let x = BAR_X
            return (
              <g
                key={r.stage}
                className="cursor-pointer"
                onClick={() => navigate(r.link)}
              >
                <text x={0} y={y + 14} className="fill-ink-700 text-[13px] font-semibold">
                  {r.label}
                </text>
                <text x={0} y={y + 30} className="fill-ink-400 font-mono text-[11px]">
                  {fmt(r.total)} alunos
                </text>
                {SEGMENTS.map((seg) => {
                  const pct = r[seg.key]
                  const w = (pct / 100) * BAR_W
                  const rect = (
                    <g key={seg.key}>
                      <rect x={x} y={y} width={Math.max(0, w)} height={22} className={seg.fill} />
                      {pct >= 8 && (
                        <text
                          x={x + w / 2}
                          y={y + 15}
                          className="fill-white font-mono text-[11px] font-semibold"
                          textAnchor="middle"
                        >
                          {pct}%
                        </text>
                      )}
                    </g>
                  )
                  x += w
                  return rect
                })}
              </g>
            )
          })}

          {qual && (
            <g
              className="cursor-pointer"
              onClick={() => navigate(qual.link)}
              transform={`translate(0, ${rows.length * ROW_H + 14})`}
            >
              <line x1={0} y1={0} x2={W} y2={0} className="stroke-line-soft" />
              <text x={0} y={20} className="fill-ink-700 text-[13px] font-semibold">
                {qual.label}
              </text>
              <text x={0} y={36} className="fill-ink-400 font-mono text-[11px]">
                {fmt(qual.children)} crianças · pareceres
              </text>
              <rect x={BAR_X} y={8} width={BAR_W} height={22} className="fill-line-soft" />
              <rect
                x={BAR_X}
                y={8}
                width={((qual.reports_delivered_pct ?? 0) / 100) * BAR_W}
                height={22}
                className="fill-qual-base"
              />
              {(qual.reports_delivered_pct ?? 0) >= 8 && (
                <text
                  x={BAR_X + ((qual.reports_delivered_pct ?? 0) / 100) * BAR_W / 2}
                  y={23}
                  className="fill-white font-mono text-[11px] font-semibold"
                  textAnchor="middle"
                >
                  {qual.reports_delivered_pct}%
                </text>
              )}
              <text
                x={BAR_X + BAR_W}
                y={44}
                className="fill-ink-400 font-mono text-[10.5px]"
                textAnchor="end"
              >
                {qual.pending} pendentes
              </text>
            </g>
          )}
        </svg>
      </div>
    </Panel>
  )
}
