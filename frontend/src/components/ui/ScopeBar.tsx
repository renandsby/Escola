import { cn } from '@/utils/cn'
import { Button } from './Button'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/types/api'

export type ScopeLevel = 'network' | 'school' | 'class'

export type ScopeBarProps = {
  level: ScopeLevel
  /** 'Rede municipal de Igarassu' | nome da escola | '5º Ano A · Matemática' */
  title: string
  /** '49 escolas · ano letivo 2025 | 3º bimestre' */
  detail?: string
  onChangePeriod?: () => void
  className?: string
}

// level → classes
const LEVEL: Record<ScopeLevel, { box: string; eyebrow: string }> = {
  network: { box: 'bg-brand-50 border-brand-200', eyebrow: 'font-mono text-micro text-brand-700' },
  school: { box: 'bg-surface-subtle border-line', eyebrow: 'font-mono text-micro text-ink-400' },
  class: { box: 'bg-surface-subtle border-line', eyebrow: 'font-mono text-micro text-ink-400' },
}

export function ScopeBar({ level, title, detail, onChangePeriod, className }: ScopeBarProps) {
  const s = LEVEL[level]
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3',
        s.box,
        className
      )}
    >
      <div className="grid gap-0.5">
        <span className={s.eyebrow}>ESCOPO</span>
        <span className="text-label text-ink-700">{title}</span>
        {detail && <span className="text-help text-ink-500">{detail}</span>}
      </div>
      {onChangePeriod && (
        <Button size="sm" variant="ghost" onClick={onChangePeriod}>
          Trocar período
        </Button>
      )}
    </div>
  )
}

const ROLE_LEVEL: Partial<Record<UserRole, ScopeLevel>> = {
  sme_admin: 'network',
  sme_supervisor: 'network',
  school_director: 'school',
  school_secretary: 'school',
  teacher: 'class',
}

/** Deriva `level` e um `title` genérico a partir do papel do usuário logado. */
export function useScope(): { level: ScopeLevel; title: string } {
  const user = useAuthStore((state) => state.user)
  const level = (user && ROLE_LEVEL[user.role]) || 'network'
  const title =
    level === 'network'
      ? 'Rede municipal'
      : level === 'school'
        ? 'Sua unidade escolar'
        : 'Suas turmas'
  return { level, title }
}
