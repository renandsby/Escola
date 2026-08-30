import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/utils/cn'
import type { Notification } from '@/types/api'
import {
  useNotificationActions,
  useNotificationList,
  useUnreadCount,
} from '../hooks/useNotifications'

export function NotificationPopover() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const unread = useUnreadCount().data?.unread ?? 0
  const list = useNotificationList(open)
  const { markAllRead, markRead } = useNotificationActions()

  useEffect(() => {
    if (!open) {return}
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {setOpen(false)}
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const has = unread > 0

  function openNotification(n: Notification) {
    if (!n.read) {markRead.mutate(n.id)}
    if (n.link) {
      navigate(n.link)
      setOpen(false)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={has ? `${unread} notificações não lidas` : 'Notificações'}
        className="relative grid h-10 w-10 place-items-center rounded-pill bg-white text-ink-700 hover:bg-white/90"
      >
        <Bell className="h-[18px] w-[18px]" />
        <span
          className={cn(
            'absolute -right-1 -top-1 grid min-w-[18px] place-items-center rounded-pill border-2 px-1 font-mono text-[11px] font-bold leading-none border-ink-900',
            has ? 'bg-danger-base text-white' : 'bg-surface-subtle text-ink-500'
          )}
        >
          {unread}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-40 w-[min(92vw,360px)] overflow-hidden rounded-lg border border-line bg-white text-ink-900 shadow-overlay">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-label text-ink-900">Notificações</p>
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={!has || markAllRead.isPending}
              className="flex items-center gap-1 text-help text-brand-700 hover:underline disabled:text-ink-400 disabled:no-underline"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todas como lidas
            </button>
          </div>

          <ul className="max-h-[60vh] divide-y divide-line-soft overflow-y-auto">
            {list.isLoading ? (
              <li className="px-4 py-6 text-center text-help text-ink-400">Carregando…</li>
            ) : (list.data?.results ?? []).length === 0 ? (
              <li className="px-4 py-8 text-center text-help text-ink-400">
                Nada por aqui ainda.
              </li>
            ) : (
              list.data?.results.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openNotification(n)}
                    className={cn(
                      'grid w-full gap-0.5 px-4 py-3 text-left hover:bg-surface-subtle',
                      !n.read && 'bg-brand-50/60'
                    )}
                  >
                    <span className="flex items-center gap-2 text-label text-ink-900">
                      {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />}
                      {n.title}
                    </span>
                    <span className="text-help text-ink-500">{n.message}</span>
                    <span className="text-micro text-ink-400">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
