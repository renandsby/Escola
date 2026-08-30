import { AlertTriangle, CheckCircle2 } from 'lucide-react'

export type EducacensoValidation = {
  schools: number
  classes: number
  students: number
  blocking_count: number
  by_entity: Record<string, number>
  blocking: { entity: string; id: string; label: string; missing: string[] }[]
  ready: boolean
}

const ENTITY_LABEL: Record<string, string> = {
  escola: 'Escola',
  turma: 'Turma',
  docente: 'Docente',
  aluno: 'Aluno',
}

export function EducacensoValidationReport({ data }: { data: EducacensoValidation }) {
  if (data.ready) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-ok-border bg-ok-bg p-4">
        <CheckCircle2 className="h-5 w-5 text-ok-fg" />
        <p className="text-base text-ok-fg">
          Rede consistente — {data.schools} escolas, {data.classes} turmas e {data.students}{' '}
          matrículas prontas para exportação.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3 rounded-lg border border-warn-border bg-warn-bg p-4">
        <AlertTriangle className="h-5 w-5 text-warn-fg" />
        <p className="text-base text-warn-fg">
          {data.blocking_count} pendência(s) impeditiva(s) — corrija antes de exportar.
        </p>
      </div>

      <ul className="grid gap-2">
        {data.blocking.map((issue) => (
          <li
            key={`${issue.entity}-${issue.id}`}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-white p-3"
          >
            <span className="text-base text-ink-800">
              <span className="mr-2 rounded bg-surface-subtle px-1.5 py-0.5 text-help text-ink-500">
                {ENTITY_LABEL[issue.entity] ?? issue.entity}
              </span>
              {issue.label}
            </span>
            <span className="text-help text-danger-fg">
              faltando: {issue.missing.join(', ')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
