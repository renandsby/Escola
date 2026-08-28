import { z } from 'zod'
import type { SchoolType } from '@/types/api'

export const schoolSchema = z.object({
  education_department: z.string().min(1, 'Secretaria é obrigatória'),
  name: z.string().min(1, 'Nome é obrigatório'),
  school_type: z.enum([
    'CRECHE',
    'PRE_ESCOLA',
    'FUNDAMENTAL_1',
    'FUNDAMENTAL_2',
    'EJA',
    'MISTA',
  ] as [SchoolType, ...SchoolType[]]),
  inep_code: z.string().optional(),
  cnpj: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address_street: z.string().optional(),
  address_number: z.string().optional(),
  address_neighborhood: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().max(2).optional(),
  address_zip_code: z.string().optional(),
  max_students_per_class: z.coerce.number().optional(),
  director_user: z.string().optional(),
})

export type SchoolFormData = z.infer<typeof schoolSchema>
