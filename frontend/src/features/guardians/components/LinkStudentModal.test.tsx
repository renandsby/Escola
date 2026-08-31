import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const redeemLinkCode = vi.fn()
const requestStudentLink = vi.fn()

vi.mock('../api/guardiansApi', () => ({
  redeemLinkCode: (p: unknown) => redeemLinkCode(p),
  requestStudentLink: (p: unknown) => requestStudentLink(p),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { LinkStudentModal } from './LinkStudentModal'

const VALID_CPF = '529.982.247-25'

function renderModal() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <LinkStudentModal onClose={vi.fn()} />
    </QueryClientProvider>
  )
}

describe('LinkStudentModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('começa na aba "Tenho um código" e alterna para "Solicitar à escola"', () => {
    renderModal()
    expect(screen.getByText('Código de vinculação')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /solicitar à escola/i }))
    expect(screen.getByText(/nome completo da mãe/i)).toBeInTheDocument()
  })

  it('valida CPF do estudante antes de enviar', async () => {
    renderModal()
    fireEvent.change(screen.getByPlaceholderText('000.000.000-00'), {
      target: { value: '111' },
    })
    fireEvent.change(screen.getByPlaceholderText('XXXX-XXXX'), {
      target: { value: 'ABCD1234' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Vincular' }))
    await screen.findByText(/informe um cpf válido do estudante/i)
    expect(redeemLinkCode).not.toHaveBeenCalled()
  })

  it('resgata o código com CPF válido', async () => {
    redeemLinkCode.mockResolvedValueOnce({ id: 'l1', status: 'CONFIRMED' })
    renderModal()
    fireEvent.change(screen.getByPlaceholderText('000.000.000-00'), {
      target: { value: VALID_CPF },
    })
    fireEvent.change(screen.getByPlaceholderText('XXXX-XXXX'), {
      target: { value: 'abcd-1234' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Vincular' }))
    await waitFor(() =>
      expect(redeemLinkCode).toHaveBeenCalledWith(
        expect.objectContaining({ student_cpf: '52998224725', code: 'ABCD-1234' })
      )
    )
  })

  it('envia a solicitação com os 3 dados de parentesco', async () => {
    requestStudentLink.mockResolvedValueOnce({ id: 'l2', status: 'PENDING' })
    const { container } = renderModal()
    fireEvent.click(screen.getByRole('button', { name: /solicitar à escola/i }))
    fireEvent.change(screen.getByPlaceholderText('000.000.000-00'), {
      target: { value: VALID_CPF },
    })
    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement
    fireEvent.change(dateInput, { target: { value: '2016-04-10' } })
    fireEvent.change(screen.getByPlaceholderText(/como consta no cadastro/i), {
      target: { value: 'Ana Maria Souza' },
    })
    fireEvent.click(screen.getByRole('button', { name: /enviar solicitação/i }))
    await waitFor(() =>
      expect(requestStudentLink).toHaveBeenCalledWith(
        expect.objectContaining({
          student_cpf: '52998224725',
          birth_date: '2016-04-10',
          mother_name: 'Ana Maria Souza',
        })
      )
    )
  })
})
