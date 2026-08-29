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
  termLabel,
  onChange,
  onClear,
}: {
  stage: string
  shift: string
  termLabel: string | null
  onChange: (patch: { stage?: string; shift?: string }) => void
  onClear: () => void
}) {
  const dirty = !!stage || !!shift
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border border-line bg-white px-[18px] py-4">
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
        <span className="text-label text-ink-700">Período</span>
        <span className="flex h-control items-center rounded border border-line-strong bg-surface-subtle px-3 text-base text-ink-500">
          {termLabel ?? 'Sem período ativo'}
        </span>
      </div>

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
