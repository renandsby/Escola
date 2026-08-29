export type ScopeLevel = 'network' | 'school'
export type Tone = 'ok' | 'warn' | 'danger' | 'neutral' | 'brand' | 'qual'

export interface DashboardScope {
  level: ScopeLevel
  title: string
  detail: string
  can_switch_to_school: boolean
  schools: { id: string; name: string }[]
}

export interface DashboardPeriod {
  academic_year: number | null
  term: number | null
  term_label: string | null
  grade_deadline: string | null
  days_to_deadline: number | null
}

export interface Kpi {
  value: number | null
  unit?: 'percent'
  detail?: string
  threshold?: number
  tone?: Tone
  link: string
}

export interface DashboardKpis {
  active_enrollments: Kpi
  average_attendance: Kpi
  below_minimum_attendance: Kpi
  diary_completeness: Kpi
  pending_transfers: Kpi
}

export interface TrendPoint {
  term: number
  label: string
  value: number | null
  partial: boolean
}
export interface AttendanceTrend {
  minimum_legal: number
  series: { label: string; tone: Tone; points: TrendPoint[] }[]
}

export interface NumericStage {
  stage: string
  label: string
  total: number
  sufficient_pct: number
  recovery_pct: number
  at_risk_pct: number
  link: string
}
export interface Performance {
  numeric_stages: NumericStage[]
  qualitative: {
    label: string
    children: number
    reports_delivered_pct: number | null
    pending: number
    link: string
  } | null
}

export interface EnrollmentStageRow {
  stage: string
  label: string
  classes: number
  students: number
  by_shift: Record<string, number>
}
export interface EnrollmentByStage {
  rows: EnrollmentStageRow[]
  students_total: number
  occupancy_rate: number | null
  over_capacity_classes: number
  capacity: number
  link: string
}

export interface Movement {
  by_status: { status: string; count: number }[]
  dropout: number
  sme_analysis_avg_days: number | null
}

export interface CompletenessRow {
  id: string
  name: string
  inep?: string
  regent?: string
  classes?: number
  students?: number
  grades_launched_pct: number | null
  average_attendance?: number | null
  status: string
  link: string
}
export interface DiaryCompleteness {
  group_by: 'school' | 'class'
  deadline: string | null
  rows: CompletenessRow[]
  total: number
}

export interface NeedsYouItem {
  key: string
  tone: Tone
  title: string
  subtitle: string
  link: string
  action_label: string
}

export interface DashboardOverview {
  scope: DashboardScope
  period: DashboardPeriod
  filters: { stage: string | null; shift: string | null }
  kpis: DashboardKpis
  attendance_trend: AttendanceTrend | null
  performance: Performance | null
  enrollment_by_stage: EnrollmentByStage
  movement: Movement | null
  diary_completeness: DiaryCompleteness
  needs_you: NeedsYouItem[]
}

export interface OverviewParams {
  scope?: ScopeLevel
  school_id?: string
  stage?: string
  shift?: string
  term?: string
}
