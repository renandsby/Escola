import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReportGeneratorDrawer } from './ReportGeneratorDrawer'
import type { ReportDef } from '../types'

const mutate = vi.fn()
vi.mock('../hooks/useReports', () => ({
  useCreateExecution: () => ({ mutate, reset: vi.fn(), isPending: false, error: null }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const report: ReportDef = {
  key: 'students_below_minimum',
  name: 'Alunos abaixo de 75% de frequência',
  description: 'Lista nominal.',
  scopes: ['network', 'school', 'class'],
  formats: ['XLSX', 'PDF'],
  contains_personal_data: true,
  parameters: ['coverage', 'academic_year', 'term', 'output_format', 'include_student_list'],
  tone: 'danger',
  estimate_seconds: 35,
}

function setup() {
  const qc = new QueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <ReportGeneratorDrawer
        report={report}
        scope={{ level: 'network', title: 'Rede municipal de Igarassu' }}
        onClose={vi.fn()}
        onQueued={vi.fn()}
      />
    </QueryClientProvider>
  )
}

describe('ReportGeneratorDrawer', () => {
  it('mostra o aviso de dado pessoal e o escopo herdado', () => {
    setup()
    expect(screen.getByText(/ESCOPO HERDADO/)).toBeInTheDocument()
    expect(screen.getAllByText(/Rede municipal de Igarassu/).length).toBeGreaterThan(0)
    expect(screen.getByText(/contém dados pessoais/i)).toBeInTheDocument()
  })

  it('ao gerar, dispara a criação da execução com o report_key e o formato', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Gerar relatório' }))
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        report_key: 'students_below_minimum',
        parameters: expect.objectContaining({ output_format: 'XLSX' }),
      }),
      expect.anything()
    )
  })
})
