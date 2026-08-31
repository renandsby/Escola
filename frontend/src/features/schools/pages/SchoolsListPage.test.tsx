import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import SchoolsListPage from './SchoolsListPage'

const mockList = {
  data: {
    count: 2,
    next: null,
    previous: null,
    results: [
      {
        id: 'sch-1',
        name: 'Escola Municipal Monteiro Lobato',
        inep_code: '12345678',
        school_type: 'URBAN',
        address_city: 'São Paulo',
      },
      {
        id: 'sch-2',
        name: 'Escola Municipal Castro Alves',
        inep_code: '87654321',
        school_type: 'RURAL',
        address_city: 'Campinas',
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
  useScope: () => ({ schoolId: null }),
}))

describe('SchoolsListPage', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  it('renderiza título e lista de escolas com INEP e cidade', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SchoolsListPage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Escolas e salas')).toBeInTheDocument()
      expect(screen.getByText('Escola Municipal Monteiro Lobato')).toBeInTheDocument()
      expect(screen.getByText('Escola Municipal Castro Alves')).toBeInTheDocument()
      expect(screen.getByText('12345678')).toBeInTheDocument()
    })
  })

  it('exibe o botão de criar nova escola', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SchoolsListPage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    expect(screen.getByRole('button', { name: /nova escola/i })).toBeInTheDocument()
  })
})
