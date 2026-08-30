import { EmptyState } from '@/components/ui/EmptyState'
import { Panel } from './Panel'
import type { AttendanceTrend } from '../types'

/**
 * Sparkline de frequência por bimestre. SVG próprio (sem lib de charts, §4.5 do
 * plano). Rótulo numérico em cada ponto; linha de mínimo legal 75% tracejada.
 */
export function AttendanceTrendChart({ data }: { data: AttendanceTrend | null }) {
  return (
    <Panel
      title="Frequência média por bimestre"
      right={
        <div className="flex gap-3.5 text-help text-ink-400">
          <span className="flex items-center gap-1.5">
            <span className="h-[3px] w-3.5 bg-brand-600" />
            {data?.series[0]?.label ?? 'atual'}
          </span>
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
        <Chart data={data} />
      )}
    </Panel>
  )
}

function Chart({ data }: { data: AttendanceTrend }) {
  const pts = data.series[0]?.points ?? []
  const W = 640
  const H = 200
  const x = (i: number) => 60 + (i * (W - 90)) / Math.max(1, pts.length - 1)
  const y = (v: number) => 12 + ((100 - v) / 30) * 156 // eixo 70–100

  const valued = pts.map((p, i) => ({ ...p, i })).filter((p) => p.value !== null)
  const line = valued.map((p) => `${x(p.i)},${y(p.value as number)}`).join(' ')

  return (
    <figure
      className="m-0 p-[18px]"
      aria-label={pts
        .map((p) => `${p.label}: ${p.value !== null ? p.value + '%' : 'sem dado'}`)
        .join('; ')}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full">
        {[100, 90, 80, 70].map((g, i) => (
          <g key={g}>
            <line x1={60} y1={12 + i * 52} x2={W - 12} y2={12 + i * 52} stroke="var(--chart-grid)" />
            <text
              x={50}
              y={16 + i * 52}
              fontSize={11}
              fontFamily="IBM Plex Mono, monospace"
              fill="var(--chart-axis)"
              textAnchor="end"
            >
              {g}
            </text>
          </g>
        ))}
        <line
          x1={60}
          y1={y(75)}
          x2={W - 12}
          y2={y(75)}
          stroke="var(--chart-danger)"
          strokeWidth={2}
          strokeDasharray="6 5"
        />
        {valued.length > 1 && (
          <polyline points={line} fill="none" stroke="var(--chart-brand)" strokeWidth={2.5} />
        )}
        {valued.map((p) => (
          <g key={p.i}>
            <circle
              cx={x(p.i)}
              cy={y(p.value as number)}
              r={4.5}
              fill="var(--chart-surface)"
              stroke="var(--chart-brand)"
              strokeWidth={2.5}
            />
            <text
              x={x(p.i)}
              y={y(p.value as number) - 10}
              fontSize={12}
              fontFamily="IBM Plex Mono, monospace"
              fontWeight={600}
              fill="var(--chart-axis)"
              textAnchor="middle"
            >
              {(p.value as number).toLocaleString('pt-BR')}
            </text>
          </g>
        ))}
        {pts.map((p, i) => (
          <text
            key={p.term}
            x={x(i)}
            y={H - 12}
            fontSize={12}
            fill="var(--chart-axis)"
            textAnchor="middle"
          >
            {p.label}
            {p.partial ? ' · parcial' : ''}
          </text>
        ))}
      </svg>
    </figure>
  )
}
