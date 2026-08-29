import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { UserRole } from '@/types/api'

const mockUser = vi.fn<[], { role: UserRole } | null>()

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (s: { user: { role: UserRole } | null }) => unknown) =>
    selector({ user: mockUser() }),
}))

vi.mock('@/features/dashboard/pages/OverviewDashboardPage', () => ({
  default: () => <div>VISÃO GERAL</div>,
}))

import DashboardPage from './DashboardPage'

function renderAt() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/turmas" element={<div>TURMAS</div>} />
        <Route path="/documentos/boletins" element={<div>BOLETINS</div>} />
        <Route path="/configuracoes" element={<div>CONFIG</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('DashboardPage — acesso por papel', () => {
  beforeEach(() => mockUser.mockReset())

  it.each(['sme_admin', 'sme_supervisor', 'school_director', 'school_secretary'] as UserRole[])(
    'mostra a Visão geral para %s',
    (role) => {
      mockUser.mockReturnValue({ role })
      renderAt()
      expect(screen.getByText('VISÃO GERAL')).toBeInTheDocument()
    }
  )

  it('redireciona professor para Turmas', () => {
    mockUser.mockReturnValue({ role: 'teacher' })
    renderAt()
    expect(screen.getByText('TURMAS')).toBeInTheDocument()
    expect(screen.queryByText('VISÃO GERAL')).not.toBeInTheDocument()
  })

  it('redireciona responsável para Boletins', () => {
    mockUser.mockReturnValue({ role: 'student_guardian' })
    renderAt()
    expect(screen.getByText('BOLETINS')).toBeInTheDocument()
  })
})
