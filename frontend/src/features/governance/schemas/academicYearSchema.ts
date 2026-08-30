import { z } from 'zod'

export const academicYearSchema = z
  .object({
    education_department: z.string().min(1, 'Secretaria é obrigatória'),
    year: z.coerce
      .number()
      .int('Ano inválido')
      .min(2020, 'Ano deve ser maior ou igual a 2020')
      .max(2100, 'Ano inválido'),
    status: z.enum(['PLANNED', 'ACTIVE', 'CLOSED']),
    start_date: z.string().min(1, 'Data de início é obrigatória'),
    end_date: z.string().min(1, 'Data de término é obrigatória'),
  })
  .refine((d) => new Date(d.start_date) < new Date(d.end_date), {
    message: 'Data de término deve ser posterior à data de início',
    path: ['end_date'],
  })
  .refine((d) => new Date(`${d.start_date}T00:00:00`).getFullYear() === d.year, {
    message: 'Data de início deve estar no ano informado',
    path: ['start_date'],
  })

export type AcademicYearFormData = z.infer<typeof academicYearSchema>
