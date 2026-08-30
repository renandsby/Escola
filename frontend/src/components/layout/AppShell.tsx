import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/utils/api-helpers'
import type { PaginatedResponse } from '@/types/api'
import { ROUTES } from '@/app/routes/paths'
import { cn } from '@/utils/cn'
import { AppHeader } from './AppHeader'
import { Sidebar } from './Sidebar'
import { useCollapsibleNav } from './useCollapsibleNav'

/** Contadores para os badges do menu (transferências pendentes etc.). */
function useNavBadges() {
  const transfers = useQuery({
    queryKey: ['nav', 'pending-transfers'],
    queryFn: () =>
      apiGet<PaginatedResponse<unknown>>('sme/transfers/', { status: 'PENDING_SME' }),
    staleTime: 60_000,
  })
  return { pendingTransfers: transfers.data?.count || undefined }
}

/** Telas de grade densa abrem com o menu recolhido (§4.1 / §7.3 do DS). */
const DENSE_PREFIXES = [ROUTES.diaryGrades, ROUTES.diaryAttendance]

export function AppShell() {
  const badges = useNavBadges()
  const { pathname } = useLocation()
  const dense = DENSE_PREFIXES.some((p) => pathname.startsWith(p))

  const { collapsed, isMobile, mobileOpen, setMobileOpen, expanded, toggle } =
    useCollapsibleNav(dense)

  // fecha o drawer ao trocar de rota
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname, setMobileOpen])

  // Esc fecha o drawer sobreposto (§4.1 / §8)
  useEffect(() => {
    if (!isMobile || !mobileOpen) {
      return
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isMobile, mobileOpen, setMobileOpen])

  return (
    <div className="grid h-screen grid-rows-[76px_1fr]">
      <AppHeader navExpanded={expanded} onToggleNav={toggle} />

      <div
        className={cn(
          'grid overflow-hidden transition-[grid-template-columns] duration-[160ms] ease-out',
          isMobile ? 'grid-cols-1' : collapsed ? 'grid-cols-[68px_1fr]' : 'grid-cols-[268px_1fr]'
        )}
      >
        {/* Sidebar fixa (>= 1024px) */}
        {!isMobile && <Sidebar collapsed={collapsed} onToggle={toggle} badges={badges} />}

        {/* Drawer sobreposto (< 1024px) */}
        {isMobile && mobileOpen && (
          <div className="fixed inset-0 top-[76px] z-40">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-[268px]">
              <Sidebar
                collapsed={false}
                onToggle={toggle}
                badges={badges}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
          </div>
        )}

        <main className="min-w-0 overflow-y-auto bg-surface-canvas">
          <div className="mx-auto grid max-w-content gap-5 px-4 py-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
