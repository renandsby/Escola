import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/utils/api-helpers'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel } from './Panel'

type Activity = {
  id: string
  user: string
  summary: string
  timestamp: string
}

const rel = (iso: string) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) {return 'agora'}
  if (diff < 3600) {return `há ${Math.floor(diff / 60)} min`}
  if (diff < 86400) {return `há ${Math.floor(diff / 3600)} h`}
  return `há ${Math.floor(diff / 86400)} d`
}

/** "Atividade recente" — trilha de auditoria real dos últimos 7 dias (P1-AUDIT). */
export function RecentActivityPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit', 'recent'],
    queryFn: () => apiGet<Activity[]>('audit/recent_activities/'),
    staleTime: 60_000,
  })

  return (
    <Panel
      title="Atividade recente na rede"
      description="Últimas ações registradas na trilha de auditoria."
    >
      {isLoading ? (
        <div className="p-[18px]">
          <div className="grid gap-2" aria-hidden>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-line" />
            ))}
          </div>
        </div>
      ) : !data || data.length === 0 ? (
        <div className="p-[18px]">
          <EmptyState title="Sem atividade" description="Nenhuma ação registrada nos últimos 7 dias." />
        </div>
      ) : (
        <ul className="grid divide-y divide-line-soft">
          {data.map((a) => (
            <li key={a.id} className="flex items-baseline justify-between gap-4 px-[18px] py-2.5">
              <span className="min-w-0 text-sm text-ink-700">
                <span className="font-semibold text-ink-900">{a.user}</span> · {a.summary}
              </span>
              <span className="shrink-0 font-mono text-help tabular-nums text-ink-400">
                {rel(a.timestamp)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
