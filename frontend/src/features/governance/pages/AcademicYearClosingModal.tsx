import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { apiClient } from '@/services/api'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { InlineError } from '@/components/ui/InlineError'
import { getErrorCode, getErrorDetails } from '@/utils/api-helpers'
import { resolveError } from '@/services/errorMessages'

type Props = {
  academicYearId: string
  year: number
  onClose: () => void
}

export function AcademicYearClosingModal({ academicYearId, year, onClose }: Props) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<1 | 2>(1)
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      const { data } = await apiClient.post(
        `/sme/academic-years/${academicYearId}/close/`
      )
      toast.success(
        `Ano ${year} encerrado: ${data.approved} aprovados, ` +
          `${data.failed_academic + data.failed_attendance} reprovados.`,
        { duration: 10000 }
      )
      queryClient.invalidateQueries({ queryKey: ['academic-years'] })
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
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="grid w-full max-w-lg gap-4 rounded-lg border border-line bg-white p-6 shadow-overlay"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-danger-base" />
          <h2 className="text-section text-ink-900">Encerrar ano letivo {year}</h2>
        </div>

        {!!error && (
          <InlineError
            code={code}
            title={resolveError(code).title}
            message={resolveError(code).message(getErrorDetails(error))}
          />
        )}

        {step === 1 ? (
          <>
            <div className="grid gap-2 text-base text-ink-700">
              <p>Esta ação, para cada matrícula ativa do ano:</p>
              <ul className="list-disc pl-5 text-help text-ink-500">
                <li>calcula a média final e a frequência global;</li>
                <li>
                  define o resultado como <strong>Aprovado</strong>,{' '}
                  <strong>Reprovado por nota</strong> ou{' '}
                  <strong>Reprovado por frequência</strong>;
                </li>
                <li>consolida o histórico escolar do estudante;</li>
                <li>
                  bloqueia novos lançamentos no diário das turmas deste ano —{' '}
                  <strong>é irreversível</strong>.
                </li>
              </ul>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={() => setStep(2)}>
                Entendi, continuar
              </Button>
            </div>
          </>
        ) : (
          <>
            <Field
              label={`Digite "${year}" para confirmar`}
              name="confirm"
              required
            >
              <Input
                autoFocus
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button
                variant="danger"
                loading={busy}
                disabled={confirmText.trim() !== String(year)}
                onClick={submit}
              >
                Encerrar ano {year}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
