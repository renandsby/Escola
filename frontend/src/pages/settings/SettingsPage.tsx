import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Bell, Lock, Palette, LogOut } from 'lucide-react'
import { USER_ROLE_LABELS } from '@/types/api'

export default function SettingsPage() {
  const { user, logout } = useAuthStore()
  const [notifications, setNotifications] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [darkMode, setDarkMode] = useState(false)

  const handleLogout = () => {
    if (confirm('Tem certeza que deseja sair?')) {
      logout()
      window.location.href = '/login'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-600 mt-1">Gerencie suas preferências e configurações de conta</p>
      </div>

      {/* Perfil */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Perfil</h2>
        </div>
        <div className="px-6 py-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
              <div className="px-4 py-2 bg-gray-50 rounded-md text-gray-700 border border-gray-300">
                {user?.first_name} {user?.last_name}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Usuário</label>
              <div className="px-4 py-2 bg-gray-50 rounded-md text-gray-700 border border-gray-300">
                {user?.username}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <div className="px-4 py-2 bg-gray-50 rounded-md text-gray-700 border border-gray-300">
                {user?.email}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Função</label>
              <div className="px-4 py-2 bg-gray-50 rounded-md text-gray-700 border border-gray-300">
                {user?.role ? USER_ROLE_LABELS[user.role] : '—'}
              </div>
            </div>
          </div>
          <Button variant="outline">Editar Perfil</Button>
        </div>
      </div>

      {/* Notificações */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Notificações</h2>
        </div>
        <div className="px-6 py-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Notificações no App</h3>
              <p className="text-xs text-gray-600 mt-1">Receba notificações dentro da aplicação</p>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notifications ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="border-t border-gray-200" />

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Notificações por Email</h3>
              <p className="text-xs text-gray-600 mt-1">Receba atualizações por email</p>
            </div>
            <button
              onClick={() => setEmailNotifications(!emailNotifications)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                emailNotifications ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  emailNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Aparência */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
          <Palette className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">Aparência</h2>
        </div>
        <div className="px-6 py-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Modo Escuro</h3>
              <p className="text-xs text-gray-600 mt-1">Ative o tema escuro para a interface</p>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                darkMode ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  darkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="border-t border-gray-200" />

          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4">Idioma</h3>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="pt">Português (BR)</option>
              <option value="en">English (US)</option>
              <option value="es">Español</option>
            </select>
          </div>
        </div>
      </div>

      {/* Segurança */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
          <Lock className="w-5 h-5 text-red-600" />
          <h2 className="text-lg font-semibold text-gray-900">Segurança</h2>
        </div>
        <div className="px-6 py-6 space-y-4">
          <Button variant="outline" className="w-full">
            Alterar Senha
          </Button>
          <Button variant="outline" className="w-full">
            Ativar Autenticação de Dois Fatores
          </Button>
          <Button variant="outline" className="w-full">
            Revisar Sessões Ativas
          </Button>
        </div>
      </div>

      {/* Zona de Perigo */}
      <div className="bg-white rounded-lg shadow overflow-hidden border-2 border-red-100">
        <div className="px-6 py-4 border-b border-red-100 bg-red-50">
          <h2 className="text-lg font-semibold text-red-900">Zona de Perigo</h2>
        </div>
        <div className="px-6 py-6 space-y-4">
          <div className="p-4 bg-red-50 rounded-md border border-red-200">
            <p className="text-sm text-red-900 font-medium">Sair da Conta</p>
            <p className="text-xs text-red-700 mt-1">Você será desconectado de todas as sessões</p>
          </div>
          <Button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>

      <div className="text-center py-6">
        <p className="text-sm text-gray-600">
          Tem dúvidas? <a href="#" className="text-blue-600 hover:underline">Entre em contato com o suporte</a>
        </p>
      </div>
    </div>
  )
}
