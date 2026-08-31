import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DashboardFilters } from './DashboardFilters'

const baseProps = {
  stage: '',
  shift: '',
  term: '',
  year: '2025',
  years: [2025, 2024],
  terms: [
    { value: 1, label: '1º Bimestre' },
    { value: 2, label: '2º Bimestre' },
    { value: 3, label: '3º Bimestre' },
    { value: 4, label: '4º Bimestre' },
  ],
  onChange: vi.fn(),
  onClear: vi.fn(),
}

describe('DashboardFilters', () => {
  it('mostra os seletores de ano letivo e período', () => {
    render(<DashboardFilters {...baseProps} />)
    expect(screen.getByText('Ano letivo')).toBeInTheDocument()
    expect(screen.getByText('Período')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Todos os bimestres' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '3º Bimestre' })).toBeInTheDocument()
  })

  it('emite onChange ao trocar o período', () => {
    const onChange = vi.fn()
    render(<DashboardFilters {...baseProps} onChange={onChange} />)
    const periodo = screen.getByDisplayValue('Todos os bimestres')
    fireEvent.change(periodo, { target: { value: '2' } })
    expect(onChange).toHaveBeenCalledWith({ term: '2' })
  })

  it('emite onChange ao trocar o ano letivo', () => {
    const onChange = vi.fn()
    render(<DashboardFilters {...baseProps} onChange={onChange} />)
    const ano = screen.getByDisplayValue('2025')
    fireEvent.change(ano, { target: { value: '2024' } })
    expect(onChange).toHaveBeenCalledWith({ year: '2024' })
  })

  it('esconde o seletor de ano quando não há anos', () => {
    render(<DashboardFilters {...baseProps} years={[]} />)
    expect(screen.queryByText('Ano letivo')).not.toBeInTheDocument()
  })

  it('mostra "Limpar filtros" só quando há filtro ativo', () => {
    const { rerender } = render(<DashboardFilters {...baseProps} />)
    expect(screen.queryByRole('button', { name: /limpar filtros/i })).not.toBeInTheDocument()
    rerender(<DashboardFilters {...baseProps} term="2" />)
    expect(screen.getByRole('button', { name: /limpar filtros/i })).toBeInTheDocument()
  })
})
