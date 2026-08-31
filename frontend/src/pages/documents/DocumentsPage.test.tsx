import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import DocumentsPage from './DocumentsPage'

const mockList = {
  data: {
    count: 2,
    next: null,
    previous: null,
    results: [
      {
        id: 'doc-1',
        file_name: 'certidao_nascimento.pdf',
        document_type: 'BIRTH_CERTIFICATE',
        student_name: 'Ana Souza',
        uploaded_by_name: 'Secretaria Central',
        created_at: new Date().toISOString(),
      },
      {
        id: 'doc-2',
        file_name: 'comprovante_residencia.pdf',
        document_type: 'PROOF_OF_RESIDENCE',
        student_name: 'Bruno Lima',
        uploaded_by_name: 'Diretor Pedro',
        created_at: new Date().toISOString(),
      },
    ],
  },
  isLoading: false,
  isError: false,
}

const mockDelete = {
  mutateAsync: vi.fn(),
  isPending: false,
}

vi.mock('@/hooks/useCrud', () => ({
  useCrud: () => ({
    list: mockList,
    delete_: mockDelete,
  }),
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (sel: (s: any) => any) => sel({ user: { role: 'sme_admin' } }),
}))

vi.mock('@/components/ui/ScopeBar', () => ({
  ScopeBar: () => <div data-testid="scope-bar">ScopeBar</div>,
  useScope: () => ({ schoolId: null }),
}))

describe('DocumentsPage', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  it('renderiza lista de documentos com nomes de arquivos e alunos', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DocumentsPage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('certidao_nascimento.pdf')).toBeInTheDocument()
      expect(screen.getByText('comprovante_residencia.pdf')).toBeInTheDocument()
      expect(screen.getByText('Ana Souza')).toBeInTheDocument()
    })
  })

  it('exibe botão de enviar documento para perfil com permissão', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DocumentsPage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    expect(screen.getByRole('button', { name: /enviar documento/i })).toBeInTheDocument()
  })
})
