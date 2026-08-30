import { useNavigate } from 'react-router-dom'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel, FooterLink } from './Panel'
import type { EnrollmentByStage as Data } from '../types'

const SHIFTS = [
  { key: 'MORNING', label: 'Manhã', fill: 'fill-brand-600', chip: 'bg-brand-600' },
  { key: 'AFTERNOON', label: 'Tarde', fill: 'fill-brand-400', chip: 'bg-brand-400' },
  { key: 'FULL_TIME', label: 'Integral', fill: 'fill-brand-200', chip: 'bg-brand-200' },
  { key: 'NIGHT', label: 'Noite', fill: 'fill-ink-400', chip: 'bg-ink-400' },
]
const fmt = (n: number) => n.toLocaleString('pt-BR')
const pct = (r: number) => `${Math.round(r * 100)}%`

const W = 640
const H = 240
const PAD_B = 46
const PAD_T = 26

/**
 * Colunas empilhadas por turno, uma coluna por etapa (§4.5 do plano). Altura da
 * coluna ∝ nº de turmas; o total de alunos é impresso acima de cada coluna.
 */
export function EnrollmentByStage({ data }: { data: Data }) {
  const navigate = useNavigate()
  const rows = data.rows
  const hasStudents = data.students_total > 0
  const maxClasses = Math.max(1, ...rows.map((r) => r.classes))
  const plotH = H - PAD_B - PAD_T
  const colW = 46
  const X0 = 70
  const gap = rows.length > 1 ? (W - X0 - 20 - rows.length * colW) / (rows.length - 1) : 0

  return (
    <Panel
      title="Matrículas por etapa e turno"
      right={
        <div className="flex flex-wrap gap-3 text-help text-ink-400">
          {SHIFTS.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 ${s.chip}`} />
              {s.label}
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
      {rows.length === 0 ? (
        <div className="p-[18px]">
          <EmptyState title="Nenhuma turma" description="Sem turmas no ano letivo ativo." />
        </div>
      ) : !hasStudents ? (
        <div className="p-[18px]">
          <EmptyState
            title="Sem matrículas"
            description={`${rows.reduce((a, r) => a + r.classes, 0)} turmas criadas · nenhuma matrícula ativa no ano letivo.`}
          />
        </div>
      ) : (
        <div className="p-[18px]">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="block h-auto w-full"
            role="img"
            aria-label={rows
              .map((r) => `${r.label}: ${fmt(r.students)} alunos em ${r.classes} turmas`)
              .join('; ')}
          >
            {rows.map((r, i) => {
              const x = X0 + i * (colW + gap)
              const colH = (r.classes / maxClasses) * plotH
              let y = PAD_T + (plotH - colH)
              return (
                <g
                  key={r.stage}
                  className="cursor-pointer"
                  onClick={() => navigate(data.link)}
                >
                  <text
                    x={x + colW / 2}
                    y={y - 8}
                    className="fill-ink-700 font-mono text-[12px] font-semibold"
                    textAnchor="middle"
                  >
                    {fmt(r.students)}
                  </text>
                  {SHIFTS.map((s) => {
                    const classesInShift = r.by_shift[s.key] ?? 0
                    if (!classesInShift) {return null}
                    const segH = (classesInShift / maxClasses) * plotH
                    const rect = (
                      <rect
                        key={s.key}
                        x={x}
                        y={y}
                        width={colW}
                        height={segH}
                        className={s.fill}
                      />
                    )
                    y += segH
                    return rect
                  })}
                  <text
                    x={x + colW / 2}
                    y={H - PAD_B + 18}
                    className="fill-ink-400 text-[12px]"
                    textAnchor="middle"
                  >
                    {r.label}
                  </text>
                  <text
                    x={x + colW / 2}
                    y={H - PAD_B + 33}
                    className="fill-ink-400 font-mono text-[10.5px]"
                    textAnchor="middle"
                  >
                    {r.classes} turmas
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      )}
    </Panel>
  )
}
