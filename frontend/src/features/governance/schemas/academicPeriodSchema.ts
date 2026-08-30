import { z } from 'zod'

export const academicPeriodSchema = z
  .object({
    academic_year: z.string().min(1, 'Ano letivo é obrigatório'),
    name: z
      .string()
      .min(1, 'Nome é obrigatório')
      .max(50, 'Nome muito longo (máximo 50 caracteres)'),
    period_number: z.coerce
      .number()
      .int('Número inválido')
      .min(1, 'Número do período deve ser maior que 0')
      .max(12, 'Número do período deve ser no máximo 12'),
    start_date: z.string().min(1, 'Data de início é obrigatória'),
    end_date: z.string().min(1, 'Data de término é obrigatória'),
    grade_deadline: z.string().min(1, 'Prazo de lançamento é obrigatório'),
  })
  .refine((d) => new Date(d.start_date) < new Date(d.end_date), {
    message: 'Data de término deve ser posterior à data de início',
    path: ['end_date'],
  })
  .refine((d) => new Date(d.grade_deadline) >= new Date(d.end_date), {
    message: 'Prazo de lançamento deve ser igual ou posterior ao término',
    path: ['grade_deadline'],
  })

export type AcademicPeriodFormData = z.infer<typeof academicPeriodSchema>
