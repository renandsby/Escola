import { Navigate, Outlet } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { UserRole } from '@/types/api'
import { useAuthStore } from '@/stores/authStore'

interface ProtectedRouteProps {
  /** Se informado, só estes papéis podem renderizar a rota. */
  allowedRoles?: UserRole[]
  /** Uso como wrapper de elemento único (em vez de <Outlet />). */
  children?: ReactNode
  /** Rota de fallback quando o papel não é permitido. */
  fallbackPath?: string
}

/**
 * Guarda de rota baseada em papel (RBAC). Aguarda a reidratação da store de
 * autenticação antes de decidir, evitando redirect prematuro no refresh da página.
 */
export function ProtectedRoute({
  allowedRoles,
  children,
  fallbackPath = '/dashboard',
}: ProtectedRouteProps) {
  const { isAuthenticated, user, isHydrated } = useAuthStore()

  if (!isHydrated) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        Carregando…
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={fallbackPath} replace />
  }

  return children ? <>{children}</> : <Outlet />
}
