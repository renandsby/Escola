import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/utils/api-helpers'
import type { PaginatedResponse } from '@/types/api'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { cn } from '@/utils/cn'

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

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const badges = useNavBadges()

  return (
    <div className="grid h-screen grid-cols-1 lg:grid-cols-[280px_1fr]">
      {/* Sidebar fixa (desktop) */}
      <div className="hidden lg:block">
        <Sidebar badges={badges} />
      </div>

      {/* Drawer (mobile) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72">
            <Sidebar badges={badges} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <main className={cn('flex min-h-0 flex-col overflow-hidden bg-surface-canvas')}>
        <TopBar onOpenMenu={() => setMobileOpen(true)} />
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto grid max-w-content gap-5 px-4 py-6 lg:px-8">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
