import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import StudentsListPage from './StudentsListPage'

const mockList = {
  data: {
    count: 2,
    next: null,
    previous: null,
    results: [
      {
        id: '1',
        unique_municipal_id: 'ALU-001',
        full_name: 'Ana Souza',
        mother_name: 'Maria Souza',
        is_active: true,
      },
      {
        id: '2',
        unique_municipal_id: 'ALU-002',
        full_name: 'Bruno Lima',
        mother_name: 'Carla Lima',
        is_active: false,
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

vi.mock('@/components/ui/ScopeBar', () => ({
  ScopeBar: () => <div data-testid="scope-bar">ScopeBar</div>,
  useScope: () => ({ schoolId: null, yearId: null }),
}))

describe('StudentsListPage', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  it('renderiza a lista de alunos com nomes e IDs', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <StudentsListPage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Ana Souza')).toBeInTheDocument()
      expect(screen.getByText('Bruno Lima')).toBeInTheDocument()
      expect(screen.getByText('ALU-001')).toBeInTheDocument()
    })
  })

  it('exibe botão de novo aluno e título da página', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <StudentsListPage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Alunos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /novo aluno/i })).toBeInTheDocument()
  })
})
