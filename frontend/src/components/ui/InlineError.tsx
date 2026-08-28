import { AlertTriangle } from 'lucide-react'
import { cn } from '@/utils/cn'

export type InlineErrorProps = {
  /** error.code do envelope — fica visível em mono para o suporte */
  code?: string
  title: string
  message: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

/**
 * Erro com correção possível na própria tela — renderize DENTRO do formulário,
 * nunca só toast. Toast (`sonner`) é para confirmação e erro de rede.
 */
export function InlineError({ code, title, message, actions, className }: InlineErrorProps) {
  return (
    <div
      role="alert"
      className={cn('rounded border border-danger-border bg-danger-bg p-4', className)}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger-fg" />
        <div className="grid gap-1">
          <p className="text-label text-danger-fg">{title}</p>
          <div className="text-help text-danger-fg/90">{message}</div>
        </div>
      </div>
      {(actions || code) && (
        <div className="mt-3 flex items-center justify-between gap-3 pl-6">
          <div className="flex items-center gap-2">{actions}</div>
          {code && <span className="font-mono text-[10.5px] text-danger-fg/70">{code}</span>}
        </div>
      )}
    </div>
  )
}
