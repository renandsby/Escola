import { NavLink, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { USER_ROLE } from '@/components/ui/statusMaps'
import { navForRole } from './navigation'
import { cn } from '@/utils/cn'

/** contadores de pendência para os badges do menu (badgeKey → número) */
export type NavBadges = Partial<Record<'pendingTransfers' | 'gradeDeadlines', number>>

export function Sidebar({ badges, onNavigate }: { badges?: NavBadges; onNavigate?: () => void }) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { pathname } = useLocation()
  const groups = navForRole(user?.role)

  const isActive = (to: string, matchPrefix?: string) =>
    pathname === to || (matchPrefix ? pathname.startsWith(matchPrefix) : false)

  return (
    <aside className="flex h-full flex-col overflow-y-auto bg-ink-900 text-white">
      <div className="px-4 py-4 text-lg font-semibold">Escola SME</div>

      <nav className="flex-1 px-2 pb-4">
        {groups.map((group, gi) => (
          <div key={group.label ?? `g-${gi}`}>
            {group.label && (
              <p className="px-3 pb-1.5 pt-4 font-mono text-micro text-white/60">{group.label}</p>
            )}
            {group.items.map((item) => {
              const active = isActive(item.to, item.matchPrefix)
              const count = item.badgeKey ? badges?.[item.badgeKey] : undefined
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center justify-between rounded px-3 py-2.5 text-sm hover:no-underline',
                    active ? 'bg-brand-600 font-semibold text-white' : 'text-white/90 hover:bg-white/10'
                  )}
                >
                  <span>{item.label}</span>
                  {count ? (
                    <span className="rounded-pill bg-warn-base px-1.5 text-[11px] font-bold text-ink-900">
                      {count}
                    </span>
                  ) : null}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-ink-800 px-3 py-3">
        <p className="truncate text-sm font-medium text-white">
          {user?.first_name || user?.username}
        </p>
        <p className="truncate text-help text-white/60">
          {user ? USER_ROLE[user.role] : ''}
        </p>
        <button
          onClick={logout}
          className="mt-2 rounded px-2 py-1 text-help text-white/70 hover:bg-white/10"
        >
          Sair da conta
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
