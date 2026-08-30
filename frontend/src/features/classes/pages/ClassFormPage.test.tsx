import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import ClassFormPage from './ClassFormPage'

const navigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigate, useParams: () => ({}) }
})

const createClass = vi.fn().mockResolvedValue({ id: 'new-1' })
vi.mock('../api/classesApi', () => ({
  createClass: (...args: unknown[]) => createClass(...args),
  updateClass: vi.fn(),
  fetchClass: vi.fn(),
  fetchClassrooms: vi.fn().mockResolvedValue({ results: [] }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) =>
    sel({ user: { role: 'sme_admin', school: null } }),
}))
vi.mock('@/features/students/hooks/useSchoolsQuery', () => ({
  useSchoolsQuery: () => ({ data: { results: [{ id: 'sch-1', name: 'Escola A' }] } }),
}))
vi.mock('@/features/students/hooks/useAcademicYearsQuery', () => ({
  useAcademicYearsQuery: () => ({ data: { results: [{ id: 'ay-1', year: 2025 }] } }),
}))
vi.mock('@/features/governance/hooks/useCurriculumMatricesQuery', () => ({
  useCurriculumMatricesQuery: () => ({ data: { results: [{ id: 'cm-1', name: 'Matriz Fund I' }] } }),
}))

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(qc, 'invalidateQueries')
  const view = render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ClassFormPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
  const field = (name: string) =>
    view.container.querySelector(`[name="${name}"]`) as HTMLElement
  const fill = (values: Record<string, string>) => {
    for (const [name, value] of Object.entries(values)) {
      fireEvent.change(field(name), { target: { value } })
    }
  }
  return { invalidate, fill }
}

const VALID = {
  name: '1º Ano A',
  school: 'sch-1',
  academic_year: 'ay-1',
  curriculum_matrix: 'cm-1',
  max_capacity: '30',
}

describe('ClassFormPage', () => {
  beforeEach(() => {
    navigate.mockClear()
    createClass.mockClear()
  })

  it('bloqueia submissão de turma com capacidade zero', async () => {
    const { fill } = setup()
    fill({ ...VALID, max_capacity: '0' })
    fireEvent.click(screen.getByRole('button', { name: 'Criar turma' }))

    // capacidade inválida barra a chamada de API (schema Zod .positive())
    await new Promise((r) => setTimeout(r, 50))
    expect(createClass).not.toHaveBeenCalled()

    // corrige e agora submete
    fill({ max_capacity: '28' })
    fireEvent.click(screen.getByRole('button', { name: 'Criar turma' }))
    await waitFor(() => expect(createClass).toHaveBeenCalledTimes(1))
  })

  it('cria a turma e invalida o cache de classes', async () => {
    const { invalidate, fill } = setup()
    fill(VALID)
    fireEvent.click(screen.getByRole('button', { name: 'Criar turma' }))

    await waitFor(() => expect(createClass).toHaveBeenCalledTimes(1))
    expect(createClass).toHaveBeenCalledWith(
      expect.objectContaining({ name: '1º Ano A', school: 'sch-1', max_capacity: 30 })
    )
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['classes'] }))
    )
  })
})
