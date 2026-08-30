import { NavLink, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { abbrev, navForRole, type NavItem } from './navigation'
import { cn } from '@/utils/cn'

/** contadores de pendência para os badges do menu (badgeKey → número) */
export type NavBadges = Partial<Record<'pendingTransfers' | 'gradeDeadlines', number>>

type SidebarProps = {
  /** rail de ícones (68px) vs. expandida (268px) */
  collapsed: boolean
  onToggle?: () => void
  badges?: NavBadges
  /** fecha o drawer no mobile ao navegar */
  onNavigate?: () => void
}

/**
 * Navegação — e **só** navegação (§4.1 do DS "Rede"). A identidade do usuário
 * vive apenas no `AppHeader`. Recolhível: 268px ⇄ 68px, mantendo ordem,
 * separadores de grupo e contador de pendência nos dois estados.
 */
export function Sidebar({ collapsed, badges, onNavigate }: SidebarProps) {
  const user = useAuthStore((s) => s.user)
  const { pathname } = useLocation()
  const groups = navForRole(user?.role)

  const isActive = (to: string, matchPrefix?: string) =>
    pathname === to || (matchPrefix ? pathname.startsWith(matchPrefix) : false)

  return (
    <aside className="flex h-full flex-col overflow-y-auto overflow-x-hidden bg-ink-900 text-white">
      <nav className={cn('flex-1 py-3', collapsed ? 'px-3' : 'px-2')}>
        {groups.map((group, gi) => (
          <div
            key={group.label ?? `g-${gi}`}
            className={cn(
              gi > 0 && 'mt-3 border-t border-white/10 pt-3',
              collapsed && 'flex flex-col items-center'
            )}
          >
            {group.label && !collapsed && (
              <p className="px-3 pb-1.5 pt-1 font-mono text-micro text-white/60">{group.label}</p>
            )}
            {group.items.map((item) => {
              const count = item.badgeKey ? badges?.[item.badgeKey] : undefined
              return (
                <NavRow
                  key={item.to}
                  item={item}
                  collapsed={collapsed}
                  active={isActive(item.to, item.matchPrefix)}
                  count={count}
                  onNavigate={onNavigate}
                />
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}

function NavRow({
  item,
  collapsed,
  active,
  count,
  onNavigate,
}: {
  item: NavItem
  collapsed: boolean
  active: boolean
  count?: number
  onNavigate?: () => void
}) {
  const marker = item.icon ?? (
    <span className="font-mono text-[10px] font-bold leading-none">{abbrev(item.label)}</span>
  )

  return (
    <div className="group relative">
      <NavLink
        to={item.to}
        onClick={onNavigate}
        aria-label={collapsed ? item.label : undefined}
        className={cn(
          'flex items-center rounded text-sm hover:no-underline',
          collapsed ? 'h-11 w-11 justify-center' : 'gap-3 px-3 py-2.5',
          active ? 'bg-brand-600 font-semibold text-white' : 'text-white/90 hover:bg-white/10'
        )}
      >
        <span
          className={cn(
            'grid shrink-0 place-items-center',
            collapsed ? 'h-10 w-10' : 'h-5 w-5'
          )}
        >
          {marker}
        </span>
        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
        {!collapsed && count ? (
          <span className="rounded-pill bg-warn-base px-1.5 text-[11px] font-bold text-ink-900">
            {count}
          </span>
        ) : null}
      </NavLink>

      {/* contador de pendência continua visível no estado recolhido */}
      {collapsed && count ? (
        <span className="pointer-events-none absolute right-0.5 top-0.5 grid min-w-[15px] place-items-center rounded-pill bg-warn-base px-1 text-[10px] font-bold leading-none text-ink-900">
          {count}
        </span>
      ) : null}

      {/* tooltip do estado recolhido — aparece no hover E no foco, delay 400ms */}
      {collapsed && (
        <span
          role="tooltip"
          className={cn(
            'pointer-events-none absolute left-[calc(100%+8px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded bg-ink-800 px-2 py-1 text-help text-white opacity-0 shadow-overlay transition-opacity',
            'group-hover:opacity-100 group-focus-within:opacity-100 group-hover:delay-[400ms] group-focus-within:delay-[400ms]'
          )}
        >
          {item.label}
        </span>
      )}
    </div>
  )
}

export default Sidebar
