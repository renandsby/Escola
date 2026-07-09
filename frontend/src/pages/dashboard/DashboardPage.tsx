import { useAuthStore } from '@/store/auth'
import { Users, School, BookOpen, Users2, BarChart3 } from 'lucide-react'

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user)

  const stats = [
    {
      title: 'Alunos',
      value: '1,234',
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Turmas',
      value: '45',
      icon: Users2,
      color: 'bg-green-500',
    },
    {
      title: 'Disciplinas',
      value: '18',
      icon: BookOpen,
      color: 'bg-purple-500',
    },
    {
      title: 'Escolas',
      value: '3',
      icon: School,
      color: 'bg-orange-500',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Bem-vindo, {user?.first_name || user?.username}!
        </h1>
        <p className="text-gray-600 mt-1">Aqui está um resumo de sua escola</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.title} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.color} rounded-lg p-3`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Atividade Recente</h2>
          <div className="space-y-4">
            <p className="text-gray-600 text-center py-8">
              Nenhuma atividade recente
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Menu Rápido</h2>
          <nav className="space-y-2">
            <a href="#" className="block px-4 py-2 rounded-md hover:bg-gray-50 text-gray-700">
              Alunos
            </a>
            <a href="#" className="block px-4 py-2 rounded-md hover:bg-gray-50 text-gray-700">
              Turmas
            </a>
            <a href="#" className="block px-4 py-2 rounded-md hover:bg-gray-50 text-gray-700">
              Boletins
            </a>
            <a href="#" className="block px-4 py-2 rounded-md hover:bg-gray-50 text-gray-700">
              Relatórios
            </a>
          </nav>
        </div>
      </div>
    </div>
  )
}
