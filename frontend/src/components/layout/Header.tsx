import { Menu, LogOut, User, Bell } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useState } from 'react'

interface HeaderProps {
  onLogout: () => void
  onToggleSidebar: () => void
}

export default function Header({ onLogout, onToggleSidebar }: HeaderProps) {
  const user = useAuthStore((state) => state.user)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <button
        onClick={onToggleSidebar}
        className="p-2 hover:bg-gray-100 rounded-md lg:hidden"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-gray-100 rounded-md relative">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-md"
          >
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-gray-700">
                {user?.first_name?.[0]}
              </span>
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-medium text-gray-900">{user?.first_name}</p>
              <p className="text-xs text-gray-600">{user?.role}</p>
            </div>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-2 z-10">
              <a
                href="#"
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100"
              >
                <User className="w-4 h-4" />
                Perfil
              </a>
              <button
                onClick={() => {
                  setMenuOpen(false)
                  onLogout()
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
