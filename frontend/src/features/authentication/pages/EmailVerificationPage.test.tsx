import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const verifyEmail = vi.fn()
const resendVerification = vi.fn()
const setUser = vi.fn()

vi.mock('@/services/api', () => ({
  authService: {
    verifyEmail: (t: string) => verifyEmail(t),
    resendVerification: () => resendVerification(),
  },
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: { email: 'maria@example.com', email_verified: false },
    setUser,
    isAuthenticated: true,
  }),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import EmailVerificationPage from './EmailVerificationPage'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/verificar-email/pendente" element={<EmailVerificationPage />} />
        <Route path="/verificar-email/:token" element={<EmailVerificationPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('EmailVerificationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('confirma o e-mail quando há token na URL e atualiza o usuário', async () => {
    verifyEmail.mockResolvedValueOnce({})
    renderAt('/verificar-email/tok-123')

    await waitFor(() => expect(verifyEmail).toHaveBeenCalledWith('tok-123'))
    await screen.findByText(/e-mail confirmado/i)
    expect(setUser).toHaveBeenCalledWith(
      expect.objectContaining({ email_verified: true })
    )
  })

  it('mostra erro quando o token é inválido', async () => {
    verifyEmail.mockRejectedValueOnce({
      response: { data: { error: { code: 'INVALID_VERIFICATION_TOKEN' } } },
    })
    renderAt('/verificar-email/ruim')
    await screen.findByText(/não foi possível confirmar/i)
  })

  it('estado "pendente" permite reenviar o link', async () => {
    resendVerification.mockResolvedValueOnce({})
    renderAt('/verificar-email/pendente')

    expect(verifyEmail).not.toHaveBeenCalled()
    const botao = await screen.findByRole('button', { name: /reenviar/i })
    fireEvent.click(botao)
    await waitFor(() => expect(resendVerification).toHaveBeenCalled())
  })
})
