import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { DashboardOverview } from '../types'

const overview: DashboardOverview = {
  scope: {
    level: 'network',
    title: 'Rede municipal de Igarassu',
    detail: '49 escolas · 535 turmas · 0 matrículas ativas',
    can_switch_to_school: true,
    schools: [{ id: 's1', name: 'EM Teste' }],
  },
  period: {
    academic_year: 2025,
    term: 3,
    is_all_terms: false,
    term_label: '3º bimestre',
    grade_deadline: '2025-09-12',
    days_to_deadline: 6,
    available_years: [2025, 2024],
    available_terms: [
      { value: 1, label: '1º Bimestre' },
      { value: 2, label: '2º Bimestre' },
      { value: 3, label: '3º Bimestre' },
      { value: 4, label: '4º Bimestre' },
    ],
  },
  filters: { stage: null, shift: null },
  kpis: {
    active_enrollments: { value: 0, detail: '49 escolas · 535 turmas', link: '/matriculas' },
    average_attendance: { value: null, unit: 'percent', tone: 'neutral', link: '/diario/frequencia' },
    below_minimum_attendance: { value: null, threshold: 75, tone: 'neutral', link: '/alunos' },
    diary_completeness: { value: null, unit: 'percent', tone: 'neutral', link: '#completude' },
    pending_transfers: { value: 4, link: '/transferencias?status=PENDING_SME' },
  },
  attendance_trend: null,
  performance: null,
  enrollment_by_stage: {
    rows: [{ stage: 'FUNDAMENTAL_I', label: 'Fund. I', classes: 10, students: 0, by_shift: {} }],
    students_total: 0,
    occupancy_rate: null,
    over_capacity_classes: 0,
    capacity: 300,
    link: '/turmas',
  },
  movement: null,
  diary_completeness: {
    group_by: 'school',
    deadline: '2025-09-12',
    rows: [
      {
        id: 's1',
        name: 'EM Teste',
        inep: '26105482',
        classes: 10,
        grades_launched_pct: null,
        average_attendance: null,
        status: 'NO_TEACHER',
        link: '/escolas/s1/editar',
      },
    ],
    total: 1,
  },
  needs_you: [
    {
      key: 'transfers',
      tone: 'warn',
      title: '4 transferências aguardando autorização da SME',
      subtitle: 'Pendências na central de vagas.',
      link: '/transferencias?status=PENDING_SME',
      action_label: 'Analisar',
    },
  ],
}

vi.mock('../hooks/useDashboardOverview', () => ({
  useDashboardOverview: () => ({ data: overview, isLoading: false, isError: false, refetch: vi.fn() }),
}))
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (sel: (s: { user: { role: string } }) => unknown) => sel({ user: { role: 'sme_admin' } }),
}))
vi.mock('@/features/reports', () => ({
  ReportsSection: () => null,
}))

import OverviewDashboardPage from './OverviewDashboardPage'

describe('OverviewDashboardPage', () => {
  it('renderiza as seções do painel com dados reais e EmptyState onde falta base', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <OverviewDashboardPage />
        </MemoryRouter>
      </QueryClientProvider>
    )
    expect(screen.getByRole('heading', { name: 'Dashboard gerencial' })).toBeInTheDocument()
    // KPI sem base → "—"; KPI com valor real
    expect(screen.getByText('Frequência média')).toBeInTheDocument()
    expect(screen.getByText('Sem lançamento de frequência')).toBeInTheDocument()
    expect(screen.getByText('Completude do diário por escola')).toBeInTheDocument()
    expect(screen.getByText('4 transferências aguardando autorização da SME')).toBeInTheDocument()
    // seletor Rede/Escola presente para SME
    expect(screen.getByRole('button', { name: 'Rede municipal' })).toBeInTheDocument()
  })
})
