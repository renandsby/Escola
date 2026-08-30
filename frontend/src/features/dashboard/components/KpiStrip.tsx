import { useNavigate } from 'react-router-dom'
import { cn } from '@/utils/cn'
import type { DashboardKpis, Kpi } from '../types'

const TONE_TEXT: Record<string, string> = {
  ok: 'text-ok-fg',
  warn: 'text-warn-fg',
  danger: 'text-danger-fg',
  brand: 'text-brand-700',
  qual: 'text-qual-fg',
  neutral: 'text-ink-500',
}

function formatValue(k: Kpi): string {
  if (k.value === null) {return '—'}
  if (k.unit === 'percent') {return `${k.value.toLocaleString('pt-BR')}%`}
  return k.value.toLocaleString('pt-BR')
}

function Cell({
  label,
  kpi,
  hint,
  last,
}: {
  label: string
  kpi: Kpi
  hint?: string
  last?: boolean
}) {
  const navigate = useNavigate()
  const valueTone = kpi.value === null ? 'text-ink-400' : TONE_TEXT[kpi.tone ?? 'neutral'] ?? 'text-ink-900'
  const go = () => {
    if (kpi.link.startsWith('#')) {
      document.getElementById(kpi.link.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    navigate(kpi.link)
  }
  return (
    <button
      type="button"
      onClick={go}
      className={cn(
        'grid gap-1 px-[18px] py-4 text-left transition-colors hover:bg-surface-hover',
        !last && 'border-b border-line-soft xl:border-b-0 xl:border-r'
      )}
    >
      <span className="font-mono text-micro uppercase tracking-[0.12em] text-ink-500">{label}</span>
      <span className={cn('font-mono text-[27px] font-semibold leading-[1.1] tabular-nums', valueTone)}>
        {formatValue(kpi)}
      </span>
      <span className="text-help text-ink-400">{hint ?? kpi.detail ?? ''}</span>
    </button>
  )
}

export function KpiStrip({ kpis, deadlineHint }: { kpis: DashboardKpis; deadlineHint?: string }) {
  return (
    <section className="grid overflow-hidden rounded-lg border border-line bg-white sm:grid-cols-2 xl:grid-cols-5">
      <Cell label="Matrículas ativas" kpi={kpis.active_enrollments} />
      <Cell
        label="Frequência média"
        kpi={kpis.average_attendance}
        hint={kpis.average_attendance.value === null ? 'sem lançamento de frequência' : undefined}
      />
      <Cell
        label={`Abaixo de ${kpis.below_minimum_attendance.threshold ?? 75}%`}
        kpi={kpis.below_minimum_attendance}
        hint={
          kpis.below_minimum_attendance.value === null
            ? 'sem base de cálculo'
            : 'alunos em risco de reprovação'
        }
      />
      <Cell
        label="Diário lançado"
        kpi={kpis.diary_completeness}
        hint={kpis.diary_completeness.value === null ? 'nenhuma nota lançada' : deadlineHint}
      />
      <Cell label="Transferências" kpi={kpis.pending_transfers} hint="aguardando análise" last />
    </section>
  )
}
