import { z } from 'zod'

export const USER_ROLE_OPTIONS = [
  { value: 'sme_admin', label: 'Administrador da SME' },
  { value: 'sme_supervisor', label: 'Supervisor pedagógico' },
  { value: 'school_director', label: 'Diretor / gestor escolar' },
  { value: 'school_secretary', label: 'Secretário escolar' },
  { value: 'teacher', label: 'Professor' },
] as const

const SCHOOL_ROLES = ['school_director', 'school_secretary']

export const userSchema = z
  .object({
    first_name: z.string().min(1, 'Informe o nome'),
    last_name: z.string().min(1, 'Informe o sobrenome'),
    username: z.string().min(3, 'Usuário deve ter ao menos 3 caracteres'),
    email: z.string().email('E-mail inválido'),
    document: z.string().optional().or(z.literal('')),
    role: z.enum(['sme_admin', 'sme_supervisor', 'school_director', 'school_secretary', 'teacher']),
    school: z.string().optional().or(z.literal('')),
    password: z.string().optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (SCHOOL_ROLES.includes(data.role) && !data.school) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['school'],
        message: 'Diretor e secretário precisam de uma escola vinculada',
      })
    }
  })

export type UserFormData = z.infer<typeof userSchema>
