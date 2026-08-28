import type { UserRole } from '@/types/api'
import { ROUTES } from '@/app/routes/paths'

export type Role = UserRole

export type NavItem = {
  label: string
  to: string
  roles: Role[]
  /** casa por prefixo além do match exato (ex.: /professores/novo ativa "Professores") */
  matchPrefix?: string
  badgeKey?: 'pendingTransfers' | 'gradeDeadlines'
}
export type NavGroup = { label: string | null; items: NavItem[] }

const ALL_STAFF: Role[] = [
  'sme_admin',
  'sme_supervisor',
  'school_director',
  'school_secretary',
  'teacher',
]
const SME: Role[] = ['sme_admin', 'sme_supervisor']
const SCHOOL: Role[] = ['school_director', 'school_secretary']

export const NAV: NavGroup[] = [
  {
    label: null,
    items: [{ label: 'Painel do dia', to: ROUTES.home, roles: [...ALL_STAFF, 'student_guardian'] }],
  },
  {
    label: 'REDE',
    items: [
      { label: 'Escolas e salas', to: ROUTES.schools, roles: [...SME, ...SCHOOL], matchPrefix: '/escolas' },
      { label: 'Currículo e matrizes', to: ROUTES.curriculum, roles: SME, matchPrefix: '/curriculo' },
      { label: 'Ano letivo e bimestres', to: ROUTES.academicYear, roles: SME },
    ],
  },
  {
    label: 'PESSOAS',
    items: [
      { label: 'Alunos', to: ROUTES.students, roles: [...SME, ...SCHOOL], matchPrefix: '/alunos' },
      { label: 'Responsáveis', to: ROUTES.guardians, roles: [...SME, ...SCHOOL] },
      {
        label: 'Professores e alocações',
        to: ROUTES.teachers,
        roles: [...SME, ...SCHOOL],
        matchPrefix: '/professores',
      },
    ],
  },
  {
    label: 'VIDA ESCOLAR',
    items: [
      { label: 'Turmas', to: ROUTES.classes, roles: [...SME, ...SCHOOL, 'teacher'] },
      { label: 'Matrículas', to: ROUTES.enrollments, roles: [...SME, ...SCHOOL], matchPrefix: '/matriculas' },
      {
        label: 'Transferências',
        to: ROUTES.transfers,
        roles: [...SME, ...SCHOOL],
        badgeKey: 'pendingTransfers',
      },
    ],
  },
  {
    label: 'DIÁRIO DE CLASSE',
    items: [
      {
        label: 'Notas e frequência',
        to: ROUTES.diaryGrades,
        roles: [...SME, ...SCHOOL, 'teacher'],
        matchPrefix: '/diario/lancamentos',
        badgeKey: 'gradeDeadlines',
      },
      { label: 'Pareceres descritivos', to: ROUTES.diaryEvaluations, roles: [...SME, ...SCHOOL, 'teacher'] },
      { label: 'Conteúdo ministrado', to: ROUTES.diaryContent, roles: ['teacher', ...SCHOOL] },
    ],
  },
  {
    label: 'DOCUMENTOS',
    items: [
      {
        label: 'Boletins e carteirinhas',
        to: ROUTES.boletins,
        roles: [...SME, ...SCHOOL, 'student_guardian'],
      },
      { label: 'Educacenso e exportações', to: ROUTES.exports, roles: SME },
    ],
  },
  {
    label: 'COMUNICAÇÃO',
    items: [
      { label: 'Mensagens e avisos', to: ROUTES.messages, roles: [...ALL_STAFF, 'student_guardian'] },
    ],
  },
]

/** Grupos com pelo menos um item visível para o papel — nunca mostra item que daria 403. */
export function navForRole(role: Role | undefined): NavGroup[] {
  if (!role) {
    return []
  }
  return NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(role)),
  })).filter((group) => group.items.length > 0)
}
