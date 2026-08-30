import { describe, it, expect } from 'vitest'
import { academicYearSchema } from './academicYearSchema'
import { academicPeriodSchema } from './academicPeriodSchema'

describe('academicYearSchema', () => {
  const base = {
    education_department: 'dep-1',
    year: 2030,
    status: 'PLANNED' as const,
    start_date: '2030-02-01',
    end_date: '2030-12-15',
  }

  it('aceita um ano letivo coerente', () => {
    expect(academicYearSchema.safeParse(base).success).toBe(true)
  })

  it('rejeita término anterior ao início', () => {
    const r = academicYearSchema.safeParse({ ...base, start_date: '2030-12-01', end_date: '2030-02-01' })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0]?.path).toEqual(['end_date'])
    }
  })

  it('rejeita início fora do ano informado', () => {
    const r = academicYearSchema.safeParse({ ...base, year: 2030, start_date: '2029-02-01' })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0]?.path).toEqual(['start_date'])
    }
  })
})

describe('academicPeriodSchema', () => {
  const base = {
    academic_year: 'year-1',
    name: '1º Bimestre',
    period_number: 1,
    start_date: '2030-02-01',
    end_date: '2030-04-10',
    grade_deadline: '2030-04-17',
  }

  it('aceita um bimestre coerente', () => {
    expect(academicPeriodSchema.safeParse(base).success).toBe(true)
  })

  it('rejeita prazo de notas anterior ao término', () => {
    const r = academicPeriodSchema.safeParse({ ...base, grade_deadline: '2030-04-05' })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0]?.path).toEqual(['grade_deadline'])
    }
  })

  it('coage period_number de string para número', () => {
    const r = academicPeriodSchema.safeParse({ ...base, period_number: '2' as unknown as number })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.period_number).toBe(2)
    }
  })
})
