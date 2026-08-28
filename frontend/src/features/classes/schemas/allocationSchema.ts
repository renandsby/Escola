import { z } from 'zod'

export const allocationSchema = z.object({
  teacher_profile: z.string().min(1, 'Professor é obrigatório'),
  school_class: z.string().min(1, 'Turma é obrigatória'),
  subject: z.string().optional(),
  is_regent: z.boolean().optional(),
})

export type AllocationFormData = z.infer<typeof allocationSchema>
