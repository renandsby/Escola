import {
  ArrowLeftRight,
  BookMarked,
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardList,
  Download,
  FileBadge,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LayoutGrid,
  MessagesSquare,
  PencilLine,
  Users,
  UsersRound,
} from 'lucide-react'
import type { UserRole } from '@/types/api'
import { ROUTES } from '@/app/routes/paths'

export type Role = UserRole

export type NavItem = {
  label: string
  to: string
  roles: Role[]
  /** casa por prefixo além do match exato (ex.: /professores/novo ativa "Professores") */
  matchPrefix?: string
  /**
   * Ícone do item — **obrigatório** (§4.2 do DS): todo item aparece no estado
   * recolhido. Sem ícone reconhecível, o fallback é a abreviação de 3 letras.
   */
  icon?: React.ReactNode
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

const ICON = 'h-[18px] w-[18px]'

export const NAV: NavGroup[] = [
  {
    label: null,
    items: [
      {
        label: 'Dashboard gerencial',
        to: ROUTES.home,
        roles: [...SME, ...SCHOOL],
        icon: <LayoutDashboard className={ICON} />,
      },
    ],
  },
  {
    label: 'REDE',
    items: [
      {
        label: 'Escolas e salas',
        to: ROUTES.schools,
        roles: [...SME, ...SCHOOL],
        matchPrefix: '/escolas',
        icon: <Building2 className={ICON} />,
      },
      {
        label: 'Currículo e matrizes',
        to: ROUTES.curriculum,
        roles: SME,
        matchPrefix: '/curriculo',
        icon: <BookMarked className={ICON} />,
      },
      {
        label: 'Ano letivo e bimestres',
        to: ROUTES.academicYear,
        roles: SME,
        icon: <CalendarDays className={ICON} />,
      },
    ],
  },
  {
    label: 'PESSOAS',
    items: [
      {
        label: 'Alunos',
        to: ROUTES.students,
        roles: [...SME, ...SCHOOL],
        matchPrefix: '/alunos',
        icon: <GraduationCap className={ICON} />,
      },
      {
        label: 'Responsáveis',
        to: ROUTES.guardians,
        roles: [...SME, ...SCHOOL],
        icon: <Users className={ICON} />,
      },
      {
        label: 'Professores e alocações',
        to: ROUTES.teachers,
        roles: [...SME, ...SCHOOL],
        matchPrefix: '/professores',
        icon: <UsersRound className={ICON} />,
      },
    ],
  },
  {
    label: 'VIDA ESCOLAR',
    items: [
      {
        label: 'Turmas',
        to: ROUTES.classes,
        roles: [...SME, ...SCHOOL, 'teacher'],
        icon: <LayoutGrid className={ICON} />,
      },
      {
        label: 'Matrículas',
        to: ROUTES.enrollments,
        roles: [...SME, ...SCHOOL],
        matchPrefix: '/matriculas',
        icon: <ClipboardList className={ICON} />,
      },
      {
        label: 'Transferências',
        to: ROUTES.transfers,
        roles: [...SME, ...SCHOOL],
        badgeKey: 'pendingTransfers',
        icon: <ArrowLeftRight className={ICON} />,
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
        icon: <PencilLine className={ICON} />,
      },
      {
        label: 'Pareceres descritivos',
        to: ROUTES.diaryEvaluations,
        roles: [...SME, ...SCHOOL, 'teacher'],
        icon: <FileText className={ICON} />,
      },
      {
        label: 'Conteúdo ministrado',
        to: ROUTES.diaryContent,
        roles: ['teacher', ...SCHOOL],
        icon: <BookOpen className={ICON} />,
      },
    ],
  },
  {
    label: 'DOCUMENTOS',
    items: [
      {
        label: 'Arquivos dos alunos',
        to: ROUTES.documents,
        matchPrefix: '/documentos/arquivos',
        roles: [...SME, ...SCHOOL, 'student_guardian'],
        icon: <FileText className={ICON} />,
      },
      {
        label: 'Boletins e carteirinhas',
        to: ROUTES.boletins,
        roles: [...SME, ...SCHOOL, 'student_guardian'],
        icon: <FileBadge className={ICON} />,
      },
      {
        label: 'Educacenso e exportações',
        to: ROUTES.exports,
        roles: SME,
        icon: <Download className={ICON} />,
      },
    ],
  },
  {
    label: 'COMUNICAÇÃO',
    items: [
      {
        label: 'Mensagens e avisos',
        to: ROUTES.messages,
        roles: [...ALL_STAFF, 'student_guardian'],
        icon: <MessagesSquare className={ICON} />,
      },
    ],
  },
  {
    label: 'ADMINISTRAÇÃO',
    items: [
      {
        label: 'Usuários da Rede',
        to: ROUTES.users,
        matchPrefix: '/usuarios',
        roles: ['sme_admin'],
        icon: <UsersRound className={ICON} />,
      },
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

/** Abreviação de 3 letras — fallback do DS quando o item não tem ícone. */
export function abbrev(label: string): string {
  return label.replace(/[^a-zà-ú]/gi, '').slice(0, 3).toUpperCase()
}
