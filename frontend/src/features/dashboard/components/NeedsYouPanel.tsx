import { useNavigate } from 'react-router-dom'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { Panel } from './Panel'
import type { NeedsYouItem } from '../types'

const BAR: Record<string, string> = {
  danger: 'bg-danger-base',
  warn: 'bg-warn-base',
  qual: 'bg-qual-base',
  brand: 'bg-brand-600',
  ok: 'bg-ok-base',
  neutral: 'bg-ink-400',
}

export function NeedsYouPanel({ items }: { items: NeedsYouItem[] }) {
  const navigate = useNavigate()
  return (
    <Panel
      title="Precisa de você"
      description="Pendências do seu escopo com ação direta na lista já filtrada."
    >
      {items.length === 0 ? (
        <div className="p-[18px]">
          <EmptyState title="Tudo em ordem" description="Nada aguardando ação no momento." />
        </div>
      ) : (
        <div className="grid divide-y divide-line-soft">
          {items.map((it) => (
            <div key={it.key} className="grid grid-cols-[4px_1fr_auto] items-center gap-3.5 px-[18px] py-3.5">
              <span className={cn('h-[34px] w-1 rounded-[2px]', BAR[it.tone] ?? BAR.neutral)} />
              <div className="min-w-0">
                <p className="text-base font-semibold text-ink-900">{it.title}</p>
                <p className="text-help text-ink-500">{it.subtitle}</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => navigate(it.link)}>
                {it.action_label}
              </Button>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}
