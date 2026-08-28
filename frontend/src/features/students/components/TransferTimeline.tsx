import { Check, X } from 'lucide-react'
import { cn } from '@/utils/cn'

/* -------------------------------------------------------------------------- */
/*  TransferTimeline — stepper de 4 passos da transferência (§7.5 do DS)      */
/* -------------------------------------------------------------------------- */

const STEPS = ['Solicitada', 'Aguardando SME', 'Aceite do destino', 'Nova matrícula'] as const

/** status do backend → nº de passos já concluídos */
const STATUS_DONE: Record<string, number> = {
  PENDING_SME: 1,
  APPROVED_BY_SME: 2,
  ACCEPTED_BY_DESTINATION: 4,
}

const TERMINATED: Record<string, string> = {
  REJECTED: 'Recusada',
  CANCELLED: 'Cancelada',
}

export function TransferTimeline({ status }: { status: string }) {
  const failedLabel = TERMINATED[status]
  const done = STATUS_DONE[status] ?? 1

  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {STEPS.map((label, i) => {
        const isDone = !failedLabel && i < done
        const isActive = !failedLabel && i === done

        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-help font-semibold tabular-nums',
                isDone && 'border-transparent bg-ok-base text-white',
                isActive && 'border-brand-600 bg-brand-50 text-brand-700',
                !isDone && !isActive && 'border-line-strong bg-white text-ink-400'
              )}
            >
              {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                'text-help',
                isActive ? 'font-semibold text-ink-700' : isDone ? 'text-ink-500' : 'text-ink-400'
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && <span aria-hidden className="mx-1 h-px w-5 bg-line-strong" />}
          </li>
        )
      })}
      {failedLabel && (
        <li className="ml-1 inline-flex items-center gap-1 text-help font-semibold text-danger-fg">
          <X className="h-3.5 w-3.5" />
          {failedLabel}
        </li>
      )}
    </ol>
  )
}
