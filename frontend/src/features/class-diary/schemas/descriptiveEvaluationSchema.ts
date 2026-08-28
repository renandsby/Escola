import { z } from 'zod'

export const descriptiveEvaluationSchema = z.object({
  enrollment: z.string().min(1, 'Matrícula é obrigatória'),
  academic_period: z.string().min(1, 'Período é obrigatório'),
  development_report: z.string().min(1, 'Relatório de desenvolvimento é obrigatório'),
})

export type DescriptiveEvaluationFormData = z.infer<typeof descriptiveEvaluationSchema>
