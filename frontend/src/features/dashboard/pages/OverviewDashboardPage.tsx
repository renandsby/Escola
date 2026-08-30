import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { ScopeBar } from '@/components/ui/ScopeBar'
import { InlineError } from '@/components/ui/InlineError'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { useDashboardOverview } from '../hooks/useDashboardOverview'
import type { OverviewParams } from '../types'
import { KpiStrip } from '../components/KpiStrip'
import { DashboardFilters } from '../components/DashboardFilters'
import { AttendanceTrendChart } from '../components/AttendanceTrendChart'
import { PerformanceByStage } from '../components/PerformanceByStage'
import { EnrollmentByStage } from '../components/EnrollmentByStage'
import { MovementPanel } from '../components/MovementPanel'
import { DiaryCompletenessTable } from '../components/DiaryCompletenessTable'
import { NeedsYouPanel } from '../components/NeedsYouPanel'
import { RecentActivityPanel } from '../components/RecentActivityPanel'
import { ReportsSection } from '@/features/reports'

export default function OverviewDashboardPage() {
  const [sp, setSp] = useSearchParams()
  const [exportPanelSignal, setExportPanelSignal] = useState(0)

  const params: OverviewParams = useMemo(
    () => ({
      scope: (sp.get('scope') as OverviewParams['scope']) ?? undefined,
      school_id: sp.get('school_id') ?? undefined,
      stage: sp.get('stage') ?? undefined,
      shift: sp.get('shift') ?? undefined,
    }),
    [sp]
  )

  const { data, isLoading, isError, refetch } = useDashboardOverview(params)

  const patch = (next: Record<string, string | undefined>) => {
    setSp((prev) => {
      const p = new URLSearchParams(prev)
      Object.entries(next).forEach(([k, v]) => {
        if (v) {p.set(k, v)}
        else {p.delete(k)}
      })
      return p
    })
  }

  const title = 'Dashboard gerencial'
  const breadcrumb = [{ label: 'Painéis' }, { label: title }]

  if (isLoading) {
    return (
      <>
        <PageHeader breadcrumb={breadcrumb} title={title} />
        <DashboardSkeleton />
      </>
    )
  }

  if (isError || !data) {
    return (
      <>
        <PageHeader breadcrumb={breadcrumb} title={title} />
        <InlineError
          title="Não foi possível carregar o painel"
          message="Verifique sua conexão e tente novamente."
          actions={
            <Button variant="primary" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          }
        />
      </>
    )
  }

  const { scope, period, kpis } = data
  const isNetwork = scope.level === 'network'
  const currentSchool = isNetwork ? '' : sp.get('school_id') ?? ''

  const deadlineHint =
    period.days_to_deadline !== null && period.grade_deadline
      ? period.days_to_deadline >= 0
        ? `prazo em ${period.days_to_deadline} dias · ${new Date(period.grade_deadline).toLocaleDateString('pt-BR')}`
        : `prazo encerrado em ${new Date(period.grade_deadline).toLocaleDateString('pt-BR')}`
      : undefined

  return (
    <>
      <PageHeader
        breadcrumb={breadcrumb}
        title={title}
        meta={
          <span>
            {period.academic_year
              ? `Ano letivo ${period.academic_year}${period.term_label ? ` · ${period.term_label}` : ''}`
              : 'Sem ano letivo ativo'}
          </span>
        }
        actions={
          <>
            {isNetwork && (
              <Button
                variant="secondary"
                onClick={() => setExportPanelSignal((n) => n + 1)}
              >
                Exportar painel (PDF)
              </Button>
            )}
            <Button
              variant="primary"
              onClick={() =>
                document.getElementById('relatorios')?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              Gerar relatório
            </Button>
          </>
        }
      />

      <ScopeBar
        level={isNetwork ? 'network' : 'school'}
        title={scope.title}
        detail={scope.detail}
      />

      {scope.can_switch_to_school && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex overflow-hidden rounded border border-line-strong bg-white">
            <button
              type="button"
              onClick={() => patch({ scope: undefined, school_id: undefined })}
              className={cn(
                'h-control-sm px-3.5 text-sm font-semibold',
                isNetwork ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-surface-subtle'
              )}
            >
              Rede municipal
            </button>
            <button
              type="button"
              onClick={() =>
                patch({
                  scope: 'school',
                  school_id: currentSchool || scope.schools[0]?.id,
                })
              }
              className={cn(
                'h-control-sm border-l border-line px-3.5 text-sm font-semibold',
                !isNetwork ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-surface-subtle'
              )}
            >
              Escola
            </button>
          </div>
          {!isNetwork && (
            <select
              value={currentSchool}
              onChange={(e) => patch({ scope: 'school', school_id: e.target.value })}
              className="h-control-sm rounded border border-line-strong bg-white px-2 text-sm"
            >
              {scope.schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <DashboardFilters
        stage={params.stage ?? ''}
        shift={params.shift ?? ''}
        termLabel={period.term_label}
        onChange={patch}
        onClear={() => patch({ stage: undefined, shift: undefined })}
      />

      <KpiStrip kpis={kpis} deadlineHint={deadlineHint} />

      <div className="grid gap-5 lg:grid-cols-[1.45fr_1fr]">
        <AttendanceTrendChart data={data.attendance_trend} />
        <PerformanceByStage data={data.performance} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <EnrollmentByStage data={data.enrollment_by_stage} />
        <MovementPanel data={data.movement} year={period.academic_year} />
      </div>

      <DiaryCompletenessTable data={data.diary_completeness} />

      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <NeedsYouPanel items={data.needs_you} />
        {isNetwork && <RecentActivityPanel />}
      </div>

      <ReportsSection
        level={isNetwork ? 'network' : 'school'}
        scopeTitle={scope.title}
        schoolId={currentSchool || null}
        exportPanelSignal={exportPanelSignal}
      />
    </>
  )
}

/** Esqueleto com a forma final do painel (§7.7 do DS — nada de spinner de página). */
function DashboardSkeleton() {
  return (
    <div className="grid gap-5" aria-hidden>
      <div className="grid overflow-hidden rounded-lg border border-line bg-white sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={cn('grid gap-2 px-[18px] py-4', i < 4 && 'xl:border-r xl:border-line-soft')}
          >
            <div className="h-2.5 w-24 animate-pulse rounded bg-line" />
            <div className="h-7 w-16 animate-pulse rounded bg-line" />
            <div className="h-2 w-28 animate-pulse rounded bg-line" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.45fr_1fr]">
        <div className="h-64 animate-pulse rounded-lg border border-line bg-white" />
        <div className="h-64 animate-pulse rounded-lg border border-line bg-white" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="h-56 animate-pulse rounded-lg border border-line bg-white" />
        <div className="h-56 animate-pulse rounded-lg border border-line bg-white" />
      </div>
    </div>
  )
}
