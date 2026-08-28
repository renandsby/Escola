import { z } from 'zod'

const profileFields = {
  registration_number: z.string().min(1, 'Matrícula funcional é obrigatória'),
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos numéricos'),
  formation_area: z.string().optional(),
  birth_date: z.string().optional(),
  hiring_date: z.string().optional(),
}

export const teacherCreateSchema = z
  .object({
    first_name: z.string().min(1, 'Nome é obrigatório'),
    last_name: z.string().min(1, 'Sobrenome é obrigatório'),
    email: z.string().email('E-mail inválido'),
    username: z.string().min(3, 'Usuário deve ter ao menos 3 caracteres'),
    password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
    password_confirm: z.string().min(8, 'Confirme a senha'),
    education_department: z.string().min(1, 'Secretaria é obrigatória'),
    ...profileFields,
  })
  .refine((data) => data.password === data.password_confirm, {
    message: 'As senhas não conferem',
    path: ['password_confirm'],
  })

export type TeacherCreateFormData = z.infer<typeof teacherCreateSchema>

/** Na edição só o perfil docente é alterado (nome/e-mail do usuário não). */
export const teacherEditSchema = z.object(profileFields)

export type TeacherEditFormData = z.infer<typeof teacherEditSchema>
