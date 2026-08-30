import { useNavigate } from 'react-router-dom'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel } from './Panel'
import type { AttendanceTrend, TrendPoint } from '../types'

/**
 * Frequência média por bimestre — ano corrente + ano anterior (§2.4 / §4.5 do
 * plano). SVG próprio, sem lib. Rótulo numérico em cada ponto; linha de mínimo
 * legal 75% tracejada; bimestre em curso marcado como "parcial".
 */
export function AttendanceTrendChart({ data }: { data: AttendanceTrend | null }) {
  const navigate = useNavigate()
  return (
    <Panel
      title="Frequência média por bimestre"
      right={
        <div className="flex flex-wrap gap-3 text-help text-ink-400">
          {data?.series.map((s, i) => (
            <span key={s.label} className="flex items-center gap-1.5">
              <span
                className={i === 0 ? 'h-[3px] w-3.5 bg-brand-600' : 'h-0 w-3.5 border-t-2 border-dotted border-ink-400'}
              />
              {s.label}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="h-0 w-3.5 border-t-2 border-dashed border-danger-base" />
            mínimo legal 75%
          </span>
        </div>
      }
    >
      {!data ? (
        <div className="p-[18px]">
          <EmptyState
            title="Sem lançamento de frequência"
            description="Os gráficos de frequência aparecem quando o diário de classe começa a ser lançado."
          />
        </div>
      ) : (
        <div className="grid gap-3 p-[18px]">
          {data.alert && (
            <button
              type="button"
              onClick={() => navigate(data.alert!.link)}
              className="flex items-center gap-2 rounded border border-warn-border bg-warn-bg px-3 py-2 text-left text-help text-warn-fg"
            >
              <span className="h-1.5 w-1.5 rotate-45 bg-warn-base" />
              {data.alert.message}
            </button>
          )}
          <Chart data={data} />
        </div>
      )}
    </Panel>
  )
}

function Chart({ data }: { data: AttendanceTrend }) {
  const base = data.series[0]?.points ?? []
  const W = 640
  const H = 210
  const x = (i: number) => 60 + (i * (W - 110)) / Math.max(1, base.length - 1)
  const y = (v: number) => 12 + ((100 - v) / 30) * 160 // eixo 70–100

  const polyline = (points: TrendPoint[]) =>
    points
      .map((p, i) => ({ ...p, i }))
      .filter((p) => p.value !== null)
      .map((p) => `${x(p.i)},${y(p.value as number)}`)
      .join(' ')

  return (
    <figure
      className="m-0"
      aria-label={data.series
        .map(
          (s) =>
            `${s.label} — ${s.points
              .map((p) => `${p.label}: ${p.value !== null ? p.value + '%' : 'sem dado'}`)
              .join(', ')}`
        )
        .join('; ')}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full">
        {[100, 90, 80, 70].map((g, i) => (
          <g key={g}>
            <line x1={60} y1={12 + i * 53} x2={W - 12} y2={12 + i * 53} className="stroke-line-soft" />
            <text x={50} y={16 + i * 53} className="fill-ink-400 font-mono text-[11px]" textAnchor="end">
              {g}
            </text>
          </g>
        ))}

        <line
          x1={60}
          y1={y(75)}
          x2={W - 12}
          y2={y(75)}
          className="stroke-danger-base"
          strokeWidth={2}
          strokeDasharray="6 5"
        />

        {/* ano anterior (tracejado fino) */}
        {data.series[1] && (
          <polyline
            points={polyline(data.series[1].points)}
            fill="none"
            className="stroke-ink-400"
            strokeWidth={2}
            strokeDasharray="2 4"
          />
        )}

        {/* ano corrente */}
        <polyline points={polyline(base)} fill="none" className="stroke-brand-600" strokeWidth={2.5} />
        {base
          .map((p, i) => ({ ...p, i }))
          .filter((p) => p.value !== null)
          .map((p) => (
            <g key={p.i}>
              <circle
                cx={x(p.i)}
                cy={y(p.value as number)}
                r={4.5}
                className="fill-white stroke-brand-600"
                strokeWidth={2.5}
              />
              <text
                x={x(p.i)}
                y={y(p.value as number) - 10}
                className="fill-ink-700 font-mono text-[12px] font-semibold"
                textAnchor="middle"
              >
                {(p.value as number).toLocaleString('pt-BR')}
              </text>
            </g>
          ))}

        {base.map((p, i) => {
          const last = i === base.length - 1
          return (
            <text
              key={p.term}
              x={last ? W - 8 : x(i)}
              y={H - 10}
              className="fill-ink-400 text-[12px]"
              textAnchor={last ? 'end' : i === 0 ? 'start' : 'middle'}
            >
              {p.label}
              {p.partial ? ' · parcial' : ''}
            </text>
          )
        })}
      </svg>
    </figure>
  )
}
