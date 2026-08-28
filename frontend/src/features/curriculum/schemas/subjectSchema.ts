import { z } from 'zod'

export const subjectSchema = z.object({
  education_department: z.string().min(1, 'Secretaria é obrigatória'),
  name: z.string().min(1, 'Nome é obrigatório'),
  area_of_knowledge: z.string().min(1, 'Área do conhecimento é obrigatória'),
  bncc_code: z.string().optional(),
  description: z.string().optional(),
  minimum_passing_grade: z.coerce.number().min(0).max(10).optional(),
})

export type SubjectFormData = z.infer<typeof subjectSchema>
