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
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'

interface SidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function Sidebar({ open, onOpenChange }: SidebarProps) {
  const user = useAuthStore((state) => state.user)

  const menuItems = [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      href: '/dashboard',
      roles: ['admin', 'director', 'coordinator', 'secretary', 'teacher', 'guardian', 'student'],
    },
    {
      title: 'Escolas',
      icon: FileText,
      href: '/schools',
      roles: ['admin', 'director'],
    },
    {
      title: 'Alunos',
      icon: GraduationCap,
      href: '/students',
      roles: ['admin', 'director', 'coordinator', 'secretary'],
    },
    {
      title: 'Turmas',
      icon: Users,
      href: '/classes',
      roles: ['admin', 'director', 'coordinator', 'secretary', 'teacher'],
    },
    {
      title: 'Disciplinas',
      icon: BookOpen,
      href: '/subjects',
      roles: ['admin', 'director', 'coordinator', 'secretary'],
    },
    {
      title: 'Boletins',
      icon: BarChart3,
      href: '/grades',
      roles: ['admin', 'director', 'coordinator', 'teacher', 'guardian', 'student'],
    },
    {
      title: 'Frequência',
      icon: BarChart3,
      href: '/attendance',
      roles: ['admin', 'director', 'coordinator', 'teacher'],
    },
    {
      title: 'Boletins Consolidados',
      icon: FileText,
      href: '/boletins',
      roles: ['admin', 'director', 'coordinator', 'teacher'],
    },
    {
      title: 'Mensagens',
      icon: MessageSquare,
      href: '/messages',
      roles: ['admin', 'director', 'coordinator', 'secretary', 'teacher', 'guardian', 'student'],
    },
    {
      title: 'Documentos',
      icon: FileText,
      href: '/documents',
      roles: ['admin', 'director', 'coordinator', 'secretary', 'teacher', 'guardian', 'student'],
    },
  ]

  const availableItems = menuItems.filter((item) =>
    user && item.roles.includes(user.role)
  )

  return (
    <aside
      className={`${
        open ? 'w-64' : 'w-20'
      } bg-gray-900 text-white transition-all duration-300 flex flex-col`}
    >
      <div className="p-4 flex items-center justify-between">
        <div className={`font-bold text-lg ${!open && 'hidden'}`}>Escola</div>
        <button
          onClick={() => onOpenChange(!open)}
          className="p-1 hover:bg-gray-800 rounded-md"
        >
          <ChevronLeft className={`w-5 h-5 transition-transform ${!open && 'rotate-180'}`} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
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
        <p className={`text-xs text-gray-500 ${!open && 'hidden'}`}>{user?.role}</p>
      </div>
    </aside>
  )
}
