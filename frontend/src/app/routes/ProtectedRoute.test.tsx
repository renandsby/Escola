import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'

let state: {
  isAuthenticated: boolean
  user: { role: string } | null
  isHydrated: boolean
}

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => state,
}))

function renderAt(ui: React.ReactNode, path = '/privado') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>tela de login</div>} />
        <Route path="/" element={<div>home</div>} />
        <Route path="/privado" element={ui} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    state = { isAuthenticated: true, user: { role: 'sme_admin' }, isHydrated: true }
  })

  it('mostra "Carregando…" enquanto a store não reidratou', () => {
    state.isHydrated = false
    renderAt(<ProtectedRoute>conteúdo</ProtectedRoute>)
    expect(screen.getByText(/carregando/i)).toBeInTheDocument()
  })

  it('redireciona para /login quando não autenticado', () => {
    state = { isAuthenticated: false, user: null, isHydrated: true }
    renderAt(<ProtectedRoute>segredo</ProtectedRoute>)
    expect(screen.getByText('tela de login')).toBeInTheDocument()
  })

  it('renderiza o conteúdo quando o papel é permitido', () => {
    renderAt(<ProtectedRoute allowedRoles={['sme_admin']}>painel</ProtectedRoute>)
    expect(screen.getByText('painel')).toBeInTheDocument()
  })

  it('redireciona para o fallback quando o papel não é permitido', () => {
    state.user = { role: 'teacher' }
    renderAt(<ProtectedRoute allowedRoles={['sme_admin']}>painel</ProtectedRoute>)
    expect(screen.getByText('home')).toBeInTheDocument()
  })

  it('sem allowedRoles, qualquer papel autenticado passa', () => {
    state.user = { role: 'student_guardian' }
    renderAt(<ProtectedRoute>livre</ProtectedRoute>)
    expect(screen.getByText('livre')).toBeInTheDocument()
  })
})
