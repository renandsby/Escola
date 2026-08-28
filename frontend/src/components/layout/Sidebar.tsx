import { Link } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  BarChart3,
  MessageSquare,
  FileText,
  ChevronLeft,
  Building2,
  Network,
  ArrowLeftRight,
  UserCog,
  ClipboardList,
  FileSignature,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/types/api'
import { USER_ROLE_LABELS } from '@/types/api'

interface SidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SME_ROLES: UserRole[] = ['sme_admin', 'sme_supervisor']
const SCHOOL_MGMT: UserRole[] = ['school_director', 'school_secretary']
const ALL_ROLES: UserRole[] = [
  'sme_admin',
  'sme_supervisor',
  'school_director',
  'school_secretary',
  'teacher',
  'student_guardian',
]

export default function Sidebar({ open, onOpenChange }: SidebarProps) {
  const user = useAuthStore((state) => state.user)

  const menuItems: {
    title: string
    icon: typeof LayoutDashboard
    href: string
    roles: UserRole[]
  }[] = [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      href: '/dashboard',
      roles: ALL_ROLES,
    },
    {
      title: 'Secretaria',
      icon: Building2,
      href: '/sme',
      roles: SME_ROLES,
    },
    {
      title: 'Matrizes',
      icon: Network,
      href: '/sme/matrices',
      roles: SME_ROLES,
    },
    {
      title: 'Transferências',
      icon: ArrowLeftRight,
      href: '/sme/transfers',
      roles: SME_ROLES,
    },
    {
      title: 'Alocações',
      icon: UserCog,
      href: '/teachers/allocations',
      roles: ['sme_admin', 'school_director'],
    },
    {
      title: 'Escolas',
      icon: FileText,
      href: '/schools',
      roles: [...SME_ROLES, 'school_director'],
    },
    {
      title: 'Alunos',
      icon: GraduationCap,
      href: '/students',
      roles: [...SME_ROLES, ...SCHOOL_MGMT],
    },
    {
      title: 'Matrículas',
      icon: FileSignature,
      href: '/enrollments',
      roles: [...SME_ROLES, ...SCHOOL_MGMT],
    },
    {
      title: 'Turmas',
      icon: Users,
      href: '/classes',
      roles: [...SME_ROLES, ...SCHOOL_MGMT, 'teacher'],
    },
    {
      title: 'Disciplinas',
      icon: BookOpen,
      href: '/subjects',
      roles: [...SME_ROLES, 'school_director'],
    },
    {
      title: 'Notas',
      icon: BarChart3,
      href: '/grades',
      roles: [...SME_ROLES, 'school_director', 'teacher', 'student_guardian'],
    },
    {
      title: 'Pareceres',
      icon: ClipboardList,
      href: '/evaluations',
      roles: [...SME_ROLES, 'school_director', 'teacher'],
    },
    {
      title: 'Frequência',
      icon: BarChart3,
      href: '/attendance',
      roles: [...SME_ROLES, 'school_director', 'teacher'],
    },
    {
      title: 'Boletins Consolidados',
      icon: FileText,
      href: '/boletins',
      roles: [...SME_ROLES, 'school_director', 'teacher'],
    },
    {
      title: 'Mensagens',
      icon: MessageSquare,
      href: '/messages',
      roles: ALL_ROLES,
    },
    {
      title: 'Documentos',
      icon: FileText,
      href: '/documents',
      roles: ALL_ROLES,
    },
  ]

  const availableItems = menuItems.filter(
    (item) => user && item.roles.includes(user.role)
  )

  return (
    <aside
      className={`${
        open ? 'w-64' : 'w-20'
      } bg-gray-900 text-white transition-all duration-300 flex flex-col`}
    >
      <div className="p-4 flex items-center justify-between">
        <div className={`font-bold text-lg ${!open && 'hidden'}`}>Escola SME</div>
        <button
          onClick={() => onOpenChange(!open)}
          className="p-1 hover:bg-gray-800 rounded-md"
        >
          <ChevronLeft className={`w-5 h-5 transition-transform ${!open && 'rotate-180'}`} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
        {availableItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              to={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-800 transition-colors"
              title={!open ? item.title : ''}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {open && <span className="text-sm">{item.title}</span>}
            </Link>
          )
        })}
      </nav>

      <div className={`p-4 border-t border-gray-800 ${!open && 'text-center'}`}>
        <p className={`text-xs text-gray-400 ${!open && 'hidden'}`}>
          {user?.first_name} {user?.last_name}
        </p>
        <p className={`text-xs text-gray-500 ${!open && 'hidden'}`}>
          {user?.role ? USER_ROLE_LABELS[user.role] : ''}
        </p>
      </div>
    </aside>
  )
}
