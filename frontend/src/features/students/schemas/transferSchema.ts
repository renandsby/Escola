import { z } from 'zod'

export const transferSchema = z.object({
  student: z.string().min(1, 'Aluno é obrigatório'),
  origin_school: z.string().min(1, 'Escola de origem é obrigatória'),
  destination_school: z.string().optional(),
  academic_year: z.string().min(1, 'Ano letivo é obrigatório'),
  reason: z.string().min(1, 'Motivo é obrigatório'),
})

export type TransferFormData = z.infer<typeof transferSchema>
