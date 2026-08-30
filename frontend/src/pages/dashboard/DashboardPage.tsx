import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/app/routes/paths'
import OverviewDashboardPage from '@/features/dashboard/pages/OverviewDashboardPage'
import GuardianPortalPage from '@/features/guardians/pages/GuardianPortalPage'

/**
 * Rota "/" — a Visão geral é exclusiva da gestão da rede (SME) e da direção
 * escolar. Professores e responsáveis são redirecionados para o seu ponto de
 * partida natural.
 */
const DASHBOARD_ROLES = new Set([
  'sme_admin',
  'sme_supervisor',
  'school_director',
  'school_secretary',
])

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const role = user?.role

  if (role && DASHBOARD_ROLES.has(role)) {
    return <OverviewDashboardPage />
  }
  if (role === 'teacher') {
    return <Navigate to={ROUTES.classes} replace />
  }
  if (role === 'student_guardian') {
    return <GuardianPortalPage />
  }
  return <Navigate to={ROUTES.settings} replace />
}
