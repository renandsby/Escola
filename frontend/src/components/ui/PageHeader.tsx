import { Link } from 'react-router-dom'
import { cn } from '@/utils/cn'

export type PageHeaderProps = {
  /** ex.: Pessoas / Alunos / Maria Eduarda */
  breadcrumb?: { label: string; to?: string }[]
  title: string
  /** identificadores mono, idade, turma, <Badge/> */
  meta?: React.ReactNode
  /** no máximo 1 primary + 2 secondary */
  actions?: React.ReactNode
  tabs?: { label: string; to: string }[]
  /** rota atual (para marcar a aba ativa) */
  activeTab?: string
}

export function PageHeader({ breadcrumb, title, meta, actions, tabs, activeTab }: PageHeaderProps) {
  return (
    <header className="grid gap-3">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="flex flex-wrap items-center gap-1.5 text-help text-ink-400">
          {breadcrumb.map((crumb, i) => (
            <span key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden>/</span>}
              {crumb.to ? (
                <Link to={crumb.to} className="text-ink-400 hover:text-brand-600 hover:no-underline">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-ink-500">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1.5">
          <h1 className="text-page text-ink-900">{title}</h1>
          {meta && <div className="flex flex-wrap items-center gap-3 text-help text-ink-500">{meta}</div>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {tabs && tabs.length > 0 && (
        <nav className="-mb-px flex gap-1 border-b border-line">
          {tabs.map((tab) => {
            const active = activeTab === tab.to
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={cn(
                  'border-b-2 px-3 py-2 text-label hover:no-underline',
                  active
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-ink-500 hover:text-ink-700'
                )}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      )}
    </header>
  )
}
