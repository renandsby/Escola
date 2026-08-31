import { SegmentedControl } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'

const STAGES = [
  { value: '', label: 'Todas as etapas' },
  { value: 'INFANTIL', label: 'Educação Infantil' },
  { value: 'FUNDAMENTAL_I', label: 'Fundamental I' },
  { value: 'FUNDAMENTAL_II', label: 'Fundamental II' },
  { value: 'EJA', label: 'EJA' },
]

const SHIFTS = [
  { value: '', label: 'Todos' },
  { value: 'MORNING', label: 'Manhã' },
  { value: 'AFTERNOON', label: 'Tarde' },
  { value: 'FULL_TIME', label: 'Integral' },
  { value: 'NIGHT', label: 'Noite' },
]

export function DashboardFilters({
  stage,
  shift,
  term,
  year,
  years,
  terms,
  onChange,
  onClear,
}: {
  stage: string
  shift: string
  term: string
  year: string
  years: number[]
  terms: { value: number; label: string }[]
  onChange: (patch: {
    stage?: string
    shift?: string
    term?: string
    year?: string
  }) => void
  onClear: () => void
}) {
  const dirty = !!stage || !!shift || !!term
  const selectClass =
    'h-control min-w-[150px] rounded border border-line-strong bg-white px-3 text-base'
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border border-line bg-white px-[18px] py-4">
      {years.length > 0 && (
        <label className="grid gap-1.5">
          <span className="text-label text-ink-700">Ano letivo</span>
          <select
            value={year || String(years[0] ?? '')}
            onChange={(e) => onChange({ year: e.target.value })}
            className={selectClass}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="grid gap-1.5">
        <span className="text-label text-ink-700">Período</span>
        <select
          value={term}
          onChange={(e) => onChange({ term: e.target.value })}
          className={selectClass}
        >
          <option value="">Todos os bimestres</option>
          {terms.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1.5">
        <span className="text-label text-ink-700">Etapa de ensino</span>
        <select
          value={stage}
          onChange={(e) => onChange({ stage: e.target.value })}
          className="h-control min-w-[190px] rounded border border-line-strong bg-white px-3 text-base"
        >
          {STAGES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-1.5">
        <span className="text-label text-ink-700">Turno</span>
        <SegmentedControl
          value={shift}
          onChange={(v) => onChange({ shift: v })}
          options={SHIFTS}
        />
      </div>

      {dirty && (
        <Button variant="ghost" size="sm" className="ml-auto" onClick={onClear}>
          Limpar filtros
        </Button>
      )}
    </div>
  )
}
