import { useNavigate } from 'react-router-dom'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel, FooterLink } from './Panel'
import type { EnrollmentByStage as Data } from '../types'

const SHIFT_ORDER = ['MORNING', 'AFTERNOON', 'FULL_TIME', 'NIGHT']
const SHIFT_LABEL: Record<string, string> = {
  MORNING: 'Manhã',
  AFTERNOON: 'Tarde',
  FULL_TIME: 'Integral',
  NIGHT: 'Noite',
}
const SHIFT_FILL: Record<string, string> = {
  MORNING: 'bg-brand-600',
  AFTERNOON: 'bg-brand-400',
  FULL_TIME: 'bg-brand-200',
  NIGHT: 'bg-ink-400',
}
const fmt = (n: number) => n.toLocaleString('pt-BR')
const pct = (r: number) => `${Math.round(r * 100)}%`

export function EnrollmentByStage({ data }: { data: Data }) {
  const navigate = useNavigate()
  const hasStudents = data.students_total > 0
  const maxClasses = Math.max(1, ...data.rows.map((r) => r.classes))

  return (
    <Panel
      title="Matrículas por etapa e turno"
      right={
        <div className="flex flex-wrap gap-3 text-help text-ink-400">
          {SHIFT_ORDER.map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 ${SHIFT_FILL[s]}`} />
              {SHIFT_LABEL[s]}
            </span>
          ))}
        </div>
      }
      footer={
        <>
          <span>
            Ocupação média das turmas:{' '}
            <strong className="font-mono tabular-nums">
              {data.occupancy_rate === null ? '—' : pct(data.occupancy_rate)}
            </strong>
            {data.over_capacity_classes > 0 && (
              <> · {data.over_capacity_classes} turmas acima da capacidade</>
            )}
          </span>
          <FooterLink to={data.link}>Ver turmas</FooterLink>
        </>
      }
    >
      {data.rows.length === 0 ? (
        <div className="p-[18px]">
          <EmptyState title="Nenhuma turma" description="Sem turmas no ano letivo ativo." />
        </div>
      ) : !hasStudents ? (
        <div className="p-[18px]">
          <EmptyState
            title="Sem matrículas"
            description={`${data.rows.reduce((a, r) => a + r.classes, 0)} turmas criadas · nenhuma matrícula ativa no ano letivo. As barras aparecem quando os alunos forem matriculados.`}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 items-end gap-4 p-[18px] sm:grid-cols-4 lg:grid-cols-5">
          {data.rows.map((r) => (
            <button
              key={r.stage}
              type="button"
              onClick={() => navigate(data.link)}
              className="grid content-end justify-items-center gap-2 rounded p-1 hover:bg-surface-hover"
            >
              <span className="font-mono text-help font-semibold tabular-nums">{fmt(r.students)}</span>
              <span className="grid w-11" style={{ height: 120 }}>
                {SHIFT_ORDER.map((s) => {
                  const h = (r.by_shift[s] ?? 0) / maxClasses
                  return h > 0 ? (
                    <span key={s} className={SHIFT_FILL[s]} style={{ height: `${h * 100}px` }} />
                  ) : null
                })}
              </span>
              <span className="text-help text-ink-400">{r.label}</span>
            </button>
          ))}
        </div>
      )}
    </Panel>
  )
}
