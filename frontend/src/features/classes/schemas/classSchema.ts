import { z } from 'zod'

export const SHIFT_OPTIONS = [
  { value: 'MORNING', label: 'Manhã' },
  { value: 'AFTERNOON', label: 'Tarde' },
  { value: 'EVENING', label: 'Noite' },
  { value: 'FULL_TIME', label: 'Integral' },
] as const

export const classSchema = z.object({
  name: z.string().min(1, 'Informe o nome da turma'),
  school: z.string().min(1, 'Selecione a escola'),
  academic_year: z.string().min(1, 'Selecione o ano letivo'),
  curriculum_matrix: z.string().min(1, 'Selecione a matriz curricular'),
  shift: z.enum(['MORNING', 'AFTERNOON', 'EVENING', 'FULL_TIME']),
  max_capacity: z.coerce.number().int().positive('A capacidade deve ser maior que zero'),
  classroom: z.string().optional().or(z.literal('')),
  room_number: z.string().optional().or(z.literal('')),
})

export type ClassFormData = z.infer<typeof classSchema>

export const classroomSchema = z.object({
  school: z.string().min(1, 'Selecione a escola'),
  number: z.string().min(1, 'Informe o número/identificação'),
  capacity: z.coerce.number().int().positive('A capacidade deve ser maior que zero'),
  floor: z.coerce.number().int(),
  building: z.string().optional().or(z.literal('')),
})

export type ClassroomFormData = z.infer<typeof classroomSchema>
