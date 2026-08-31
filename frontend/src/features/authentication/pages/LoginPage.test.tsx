import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from './LoginPage'

const navigate = vi.fn()
vi.mock('react-router-dom', async (o) => ({
  ...(await o<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}))

const login = vi.fn()
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ login }),
}))

const loginApi = vi.fn()
const verifyTOTP = vi.fn()
vi.mock('@/services/api', () => ({
  authService: {
    login: (...a: unknown[]) => loginApi(...a),
    verifyTOTP: (...a: unknown[]) => verifyTOTP(...a),
  },
}))

function setup() {
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )
}

async function fillAndSubmitLogin() {
  fireEvent.change(screen.getByPlaceholderText('Digite seu CPF ou e-mail'), {
    target: { value: 'diretor@rede.gov.br' },
  })
  fireEvent.change(screen.getByPlaceholderText('Digite sua senha'), {
    target: { value: 'segredo-123' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('LoginPage — 2FA', () => {
  beforeEach(() => {
    navigate.mockClear()
    login.mockClear()
    loginApi.mockReset()
    verifyTOTP.mockReset()
  })

  it('login direto (sem 2FA) autentica e navega', async () => {
    loginApi.mockResolvedValue({
      data: { requires_2fa: false, access: 'a', refresh: 'r', user: { id: '1' } },
    })
    setup()
    await fillAndSubmitLogin()

    await waitFor(() => expect(login).toHaveBeenCalledWith('a', 'r', { id: '1' }))
    expect(screen.queryByText('Verificação em duas etapas')).not.toBeInTheDocument()
  })

  it('quando requires_2fa, abre o desafio e conclui com o código', async () => {
    loginApi.mockResolvedValue({
      data: { requires_2fa: true, challenge_token: 'chal-1' },
    })
    verifyTOTP.mockResolvedValue({
      data: { requires_2fa: false, access: 'a2', refresh: 'r2', user: { id: '9' } },
    })
    setup()
    await fillAndSubmitLogin()

    // não autenticou ainda
    await screen.findByText('Verificação em duas etapas')
    expect(login).not.toHaveBeenCalled()

    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Verificar' }))

    await waitFor(() =>
      expect(verifyTOTP).toHaveBeenCalledWith({ challenge_token: 'chal-1', code: '123456' })
    )
    await waitFor(() => expect(login).toHaveBeenCalledWith('a2', 'r2', { id: '9' }))
  })
})
