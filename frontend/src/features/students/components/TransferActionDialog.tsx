import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/services/api'
import { apiGet } from '@/utils/api-helpers'
import { Button } from '@/components/ui/Button'
import { Field, Select, Textarea } from '@/components/ui/Field'
import { InlineError } from '@/components/ui/InlineError'
import { resolveError } from '@/services/errorMessages'
import { getErrorCode, getErrorDetails } from '@/utils/api-helpers'
import type { PaginatedResponse, SchoolClass, TransferRequest } from '@/types/api'

type Mode = 'authorize' | 'accept' | 'reject'

const SHIFT: Record<string, string> = {
  MORNING: 'Manhã', AFTERNOON: 'Tarde', FULL_TIME: 'Integral', NIGHT: 'Noite',
}

export function TransferActionDialog({
  mode,
  transfer,
  onClose,
  onDone,
}: {
  mode: Mode
  transfer: TransferRequest
  onClose: () => void
  onDone: () => void
}) {
  const [classId, setClassId] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const needsClass = mode === 'accept'

  const classesQuery = useQuery({
    queryKey: ['classes', 'by-school', transfer.destination_school, transfer.academic_year],
    enabled: needsClass && !!transfer.destination_school,
    queryFn: () =>
      apiGet<PaginatedResponse<SchoolClass>>('classes/', {
        school: transfer.destination_school as string,
        academic_year: transfer.academic_year,
        page_size: 200,
      }),
  })
  const classes = useMemo(() => classesQuery.data?.results ?? [], [classesQuery.data])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const title = {
    authorize: 'Autorizar transferência',
    accept: 'Efetivar matrícula e aceitar',
    reject: 'Recusar transferência',
  }[mode]

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      if (mode === 'authorize') {
        await apiClient.patch(`/sme/transfers/${transfer.id}/authorize/`, {})
        toast.success('Transferência autorizada pela SME.')
      } else if (mode === 'accept') {
        await apiClient.patch(`/sme/transfers/${transfer.id}/accept/`, {
          destination_class_id: classId || undefined,
        })
        toast.success('Transferência aceita — nova matrícula criada.')
      } else {
        await apiClient.patch(`/sme/transfers/${transfer.id}/reject/`, { reason })
        toast.success('Transferência recusada.')
      }
      onDone()
      onClose()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  const code = getErrorCode(error)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-overlay"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-section text-ink-900">{title}</h2>
        <p className="mt-1 text-help text-ink-500">
          {transfer.student_name} · {transfer.origin_school_name} →{' '}
          {transfer.destination_school_name ?? 'externa'}
        </p>

        <div className="mt-4 grid gap-4">
          {needsClass && (
            <Field
              label="Turma de destino"
              name="destination_class_id"
              help="Deixe em branco para aceitar sem enturmar agora."
            >
              <Select
                name="destination_class_id"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                disabled={classesQuery.isLoading}
              >
                <option value="">Sem enturmação imediata</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {SHIFT[c.shift] ?? c.shift} ({c.max_capacity} vagas)
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {mode === 'reject' && (
            <Field label="Motivo da recusa" name="reason">
              <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
          )}

          {!!error && (
            <InlineError
              code={code}
              title={resolveError(code).title}
              message={resolveError(code).message(getErrorDetails(error))}
            />
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant={mode === 'reject' ? 'danger' : 'primary'}
            loading={busy}
            onClick={submit}
          >
            {mode === 'authorize' ? 'Autorizar' : mode === 'accept' ? 'Aceitar' : 'Recusar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
