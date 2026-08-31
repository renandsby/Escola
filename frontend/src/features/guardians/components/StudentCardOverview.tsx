import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, FileDown, MessageSquare, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { downloadBoletimPdf } from '@/features/reports/api/officialDocs'
import { ROUTES } from '@/app/routes/paths'
import type { Dependent } from '@/types/api'

export type { Dependent }

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

  // Vínculo ainda não confirmado pela escola — nenhum dado da vida escolar.
  if (dependent.link_status === 'PENDING' || dependent.link_status === 'REJECTED') {
    const rejected = dependent.link_status === 'REJECTED'
    return (
      <section className="grid gap-3 rounded-lg border border-line bg-white p-5">
        <div>
          <h2 className="text-section text-ink-900">{dependent.full_name}</h2>
          <p className="mt-0.5 text-help text-ink-500">
            Matrícula: {dependent.unique_municipal_id || '—'}
          </p>
        </div>
        <div
          className={cn(
            'flex items-start gap-2 rounded-md p-3 text-help',
            rejected ? 'bg-danger-bg text-danger-fg' : 'bg-surface-canvas text-ink-600'
          )}
        >
          {rejected ? (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>
            {rejected
              ? `Solicitação de vínculo recusada pela escola.${
                  dependent.rejection_note ? ` Motivo: ${dependent.rejection_note}` : ''
                }`
              : 'Solicitação de vínculo enviada. Aguardando a confirmação da escola.'}
          </span>
        </div>
      </section>
    )
  }

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
