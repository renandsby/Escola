import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, ChevronDown } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useScope } from '@/components/ui/ScopeBar'
import { USER_ROLE } from '@/components/ui/statusMaps'
import { ROUTES } from '@/app/routes/paths'
import { NETWORK_DEPARTMENT_LABEL } from '@/config/network'
import { cn } from '@/utils/cn'
import { useHeaderData } from './useHeaderData'

type AppHeaderProps = {
  navExpanded: boolean
  onToggleNav: () => void
}

/**
 * Cabeçalho institucional — altura fixa 76px (§4.1 do DS "Rede").
 * Gradiente vertical `brand-900 → ink-900`, texto branco. É o **único** lugar
 * onde a identidade do usuário aparece; a `Sidebar` é só navegação.
 */
export function AppHeader({ navExpanded, onToggleNav }: AppHeaderProps) {
  const { networkIdentity, periodLabel, unreadCount } = useHeaderData()

  return (
    <header className="sticky top-0 z-30 flex h-[76px] items-center gap-4 bg-gradient-to-b from-brand-900 to-ink-900 px-4 text-white lg:px-6">
      <NavToggle expanded={navExpanded} onToggle={onToggleNav} />
      <NetworkIdentity title={networkIdentity} />

      <div className="ml-auto flex items-center gap-3">
        {periodLabel && <PeriodBadge label={periodLabel} />}
        {unreadCount !== null && <NotificationBell count={unreadCount} />}
        <UserMenuButton />
      </div>
    </header>
  )
}

/* ------------------------------------------------------------------ NavToggle */

function NavToggle({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName
      if (e.key === '[' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault()
        onToggle()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onToggle])

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-label={expanded ? 'Recolher menu (tecla [)' : 'Expandir menu (tecla [)'}
      title={expanded ? 'Recolher menu  [' : 'Expandir menu  ['}
      className="grid h-11 w-11 shrink-0 place-items-center rounded text-white/90 hover:bg-white/10"
    >
      <span className="grid gap-[5px]">
        <span className="block h-0.5 w-5 rounded bg-current" />
        <span className="block h-0.5 w-5 rounded bg-current" />
        <span className="block h-0.5 w-5 rounded bg-current" />
      </span>
    </button>
  )
}

/* ----------------------------------------------------------- NetworkIdentity */

function NetworkIdentity({ title }: { title: string }) {
  return (
    <div className="min-w-0 leading-tight">
      <p className="truncate text-lg font-bold text-white">{title}</p>
      <p className="truncate text-help text-white/60">{NETWORK_DEPARTMENT_LABEL}</p>
    </div>
  )
}

/* --------------------------------------------------------------- PeriodBadge */

function PeriodBadge({ label }: { label: string }) {
  return (
    <span className="hidden font-mono text-micro text-white/60 md:inline">{label}</span>
  )
}

/* ----------------------------------------------------------- NotificationBell */

function NotificationBell({ count }: { count: number }) {
  const navigate = useNavigate()
  const has = count > 0
  return (
    <button
      type="button"
      onClick={() => navigate(ROUTES.messages)}
      aria-label={has ? `${count} notificações não lidas` : 'Sem notificações novas'}
      className="relative grid h-10 w-10 place-items-center rounded-pill bg-white text-ink-700 hover:bg-white/90"
    >
      <Bell className="h-[18px] w-[18px]" />
      <span
        className={cn(
          'absolute -right-1 -top-1 grid min-w-[18px] place-items-center rounded-pill border-2 px-1 font-mono text-[11px] font-bold leading-none',
          'border-ink-900',
          has ? 'bg-danger-base text-white' : 'bg-surface-subtle text-ink-500'
        )}
      >
        {count}
      </span>
    </button>
  )
}

/* ---------------------------------------------------------- UserMenuButton */

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return '?'
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function UserMenuButton() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const scope = useScope()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!user) {
    return null
  }

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username
  const roleLabel = (USER_ROLE[user.role] ?? user.role).toUpperCase()

  const go = (to: string) => {
    setOpen(false)
    navigate(to)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-control items-center gap-2 rounded px-1.5 text-left hover:bg-white/10"
      >
        <span className="hidden min-w-0 leading-tight sm:block">
          <span className="block truncate text-label font-bold tracking-wide text-white">
            {roleLabel}
          </span>
          <span className="block truncate text-help text-white/70">{scope.title}</span>
        </span>
        <ChevronDown className="hidden h-4 w-4 text-white/70 sm:block" />
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-pill bg-warn-200 font-mono text-sm font-bold text-ink-800">
          {initialsOf(fullName)}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-40 w-60 overflow-hidden rounded-lg border border-line bg-white py-1 text-ink-700 shadow-overlay"
        >
          <div className="border-b border-line-soft px-4 py-2.5">
            <p className="truncate text-label text-ink-700">{fullName}</p>
            <p className="truncate text-help text-ink-400">{user.email}</p>
          </div>
          <MenuItem onClick={() => go(ROUTES.settings)}>Meus dados</MenuItem>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              logout()
            }}
            className="block w-full px-4 py-2 text-left text-sm text-danger-fg hover:bg-danger-bg"
          >
            Sair da conta
          </button>
        </div>
      )}
    </div>
  )
}

function MenuItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="block w-full px-4 py-2 text-left text-sm text-ink-700 hover:bg-surface-hover"
    >
      {children}
    </button>
  )
}
