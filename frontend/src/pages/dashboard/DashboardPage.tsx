import { useAuthStore } from '@/stores/authStore'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/utils/api-helpers'
import { Users, School, BookOpen, Users2, Activity, Building2 } from 'lucide-react'
import { USER_ROLE_LABELS } from '@/types/api'

interface ActivityItem {
  id: string
  user: string
  action: string
  model: string
  timestamp: string
  time_ago: string
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const isSme = user?.role === 'sme_admin' || user?.role === 'sme_supervisor'

  const activities = useQuery({
    queryKey: ['recent_activities'],
    queryFn: () => apiGet<ActivityItem[]>('audit/recent_activities/'),
  })

  const stats = [
    {
      title: 'Alunos',
      value: '—',
      icon: Users,
      color: 'bg-blue-500',
      href: '/students',
    },
    {
      title: 'Turmas',
      value: '—',
      icon: Users2,
      color: 'bg-green-500',
      href: '/classes',
    },
    {
      title: 'Disciplinas',
      value: '—',
      icon: BookOpen,
      color: 'bg-purple-500',
      href: '/subjects',
    },
    {
      title: isSme ? 'Secretaria' : 'Escolas',
      value: '—',
      icon: isSme ? Building2 : School,
      color: 'bg-orange-500',
      href: isSme ? '/sme' : '/schools',
    },
  ]

  const quickMenu = isSme
    ? [
        { label: 'Secretaria', href: '/sme' },
        { label: 'Matrizes', href: '/sme/matrices' },
        { label: 'Transferências', href: '/sme/transfers' },
        { label: 'Alunos', href: '/students' },
      ]
    : [
        { label: 'Alunos', href: '/students' },
        { label: 'Turmas', href: '/classes' },
        { label: 'Boletins', href: '/boletins' },
        { label: 'Frequência', href: '/attendance' },
      ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Bem-vindo, {user?.first_name || user?.username}!
        </h1>
        <p className="text-gray-600 mt-1">
          {user?.role ? USER_ROLE_LABELS[user.role] : ''}
          {isSme
            ? ' — visão da rede municipal'
            : ' — resumo da sua unidade escolar'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Link
              key={stat.title}
              to={stat.href}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg hover:scale-105 transition-all text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.color} rounded-lg p-3`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Atividade Recente</h2>
          </div>
          <div className="space-y-4">
            {activities.isLoading ? (
              <p className="text-gray-600 text-center py-8">Carregando atividades...</p>
            ) : activities.data && activities.data.length > 0 ? (
              activities.data.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      <span className="text-blue-600">{activity.user}</span> {activity.action}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">{activity.model}</p>
                  </div>
                  <p className="text-xs text-gray-500 whitespace-nowrap">{activity.time_ago}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-600 text-center py-8">Nenhuma atividade recente</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Menu Rápido</h2>
          <nav className="space-y-2">
            {quickMenu.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="block px-4 py-2 rounded-md hover:bg-blue-50 text-gray-700 hover:text-blue-600 font-medium transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  )
}
