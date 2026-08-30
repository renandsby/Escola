import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileDown, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { downloadBoletimPdf } from '@/features/reports/api/officialDocs'
import { ROUTES } from '@/app/routes/paths'

export type Dependent = {
  student_id: string
  full_name: string
  unique_municipal_id: string
  school: string | null
  school_class: string | null
  shift: string | null
  academic_year: number | null
  grade_average: number | null
  attendance_pct: number | null
  has_active_enrollment: boolean
}

const SHIFT: Record<string, string> = {
  MORNING: 'Manhã',
  AFTERNOON: 'Tarde',
  EVENING: 'Noite',
  FULL_TIME: 'Integral',
}

function Stat({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="grid gap-0.5">
      <span className="text-help text-ink-400">{label}</span>
      <span
        className={cn(
          'text-lg font-semibold tabular-nums',
          alert ? 'text-danger-fg' : 'text-ink-900'
        )}
      >
        {value}
      </span>
    </div>
  )
}

export function StudentCardOverview({ dependent }: { dependent: Dependent }) {
  const navigate = useNavigate()
  const [downloading, setDownloading] = useState(false)

  async function baixar() {
    setDownloading(true)
    try {
      await downloadBoletimPdf(dependent.student_id)
    } catch {
      toast.error('Não foi possível baixar o boletim.')
    } finally {
      setDownloading(false)
    }
  }

  const avg = dependent.grade_average
  const att = dependent.attendance_pct

  return (
    <section className="grid gap-4 rounded-lg border border-line bg-white p-5">
      <div>
        <h2 className="text-section text-ink-900">{dependent.full_name}</h2>
        <p className="mt-0.5 text-help text-ink-500">
          {dependent.school_class
            ? `${dependent.school_class}${dependent.shift ? ` · ${SHIFT[dependent.shift] ?? dependent.shift}` : ''}`
            : 'Sem turma ativa'}
          {dependent.school ? ` — ${dependent.school}` : ''}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Stat
          label="Média geral"
          value={avg !== null ? avg.toFixed(1) : '—'}
          alert={avg !== null && avg < 6}
        />
        <Stat
          label="Frequência"
          value={att !== null ? `${att}%` : '—'}
          alert={att !== null && att < 75}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          iconLeft={<FileDown className="h-4 w-4" />}
          loading={downloading}
          onClick={baixar}
        >
          Baixar boletim
        </Button>
        <Button
          variant="ghost"
          iconLeft={<MessageSquare className="h-4 w-4" />}
          onClick={() => navigate(ROUTES.messageNew)}
        >
          Falar com a coordenação
        </Button>
      </div>
    </section>
  )
}
