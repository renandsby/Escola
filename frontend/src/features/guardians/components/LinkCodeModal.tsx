import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Field, Select } from '@/components/ui/Field'
import { InlineError } from '@/components/ui/InlineError'
import { getErrorCode } from '@/utils/api-helpers'
import { resolveError } from '@/services/errorMessages'
import { formatDateTime } from '@/utils/formatting'
import { KINSHIP_TYPE_LABELS, type KinshipType } from '@/types/api'
import { fetchLinkCodes, generateLinkCode } from '../api/guardiansApi'

export function LinkCodeModal({
  studentId,
  studentName,
  onClose,
}: {
  studentId: string
  studentName: string
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [kinshipHint, setKinshipHint] = useState<KinshipType | ''>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generated, setGenerated] = useState<{ code: string; expires_at: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const history = useQuery({
    queryKey: ['students', studentId, 'link-codes'],
    queryFn: () => fetchLinkCodes(studentId),
  })

  async function generate() {
    setError(null)
    setBusy(true)
    try {
      const res = await generateLinkCode(studentId, {
        kinship_hint: kinshipHint || undefined,
      })
      setGenerated(res)
      queryClient.invalidateQueries({ queryKey: ['students', studentId, 'link-codes'] })
    } catch (err) {
      setError(resolveError(getErrorCode(err)).message())
    } finally {
      setBusy(false)
    }
  }

  async function copy() {
    if (!generated) {return}
    try {
      await navigator.clipboard.writeText(generated.code)
      setCopied(true)
      toast.success('Código copiado.')
    } catch {
      /* clipboard indisponível — o responsável pode digitar */
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="grid w-full max-w-md gap-4 rounded-lg border border-line bg-white p-6 shadow-overlay"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-section text-ink-900">Código de vinculação</h2>
            <p className="text-help text-ink-500">{studentName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <X className="h-4 w-4 text-ink-400" />
          </button>
        </div>

        {error && <InlineError title="Não foi possível gerar" message={error} />}

        {generated ? (
          <div className="grid gap-2 rounded-md border border-brand-200 bg-brand-50 p-4">
            <p className="text-help text-ink-600">
              Entregue este código ao responsável. Ele é de uso único e expira em{' '}
              {formatDateTime(generated.expires_at)}.
            </p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl tracking-widest text-ink-900">
                {generated.code}
              </span>
              <Button size="sm" variant="ghost" onClick={copy}>
                {copied ? <Check className="h-4 w-4 text-ok-fg" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-help text-danger-fg">
              Este código não será exibido novamente.
            </p>
          </div>
        ) : (
          <>
            <Field
              label="Sugestão de parentesco (opcional)"
              name="kinship_hint"
              help="Preenche o parentesco automaticamente quando o responsável usar o código."
            >
              <Select
                value={kinshipHint}
                onChange={(e) => setKinshipHint(e.target.value as KinshipType | '')}
              >
                <option value="">Não informar</option>
                {Object.entries(KINSHIP_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Button type="button" variant="primary" loading={busy} onClick={generate}>
              Gerar código
            </Button>
          </>
        )}

        <div className="grid gap-1">
          <h3 className="text-help font-semibold text-ink-500">Códigos anteriores</h3>
          {history.isLoading ? (
            <p className="text-help text-ink-400">Carregando…</p>
          ) : !history.data || history.data.length === 0 ? (
            <p className="text-help text-ink-400">Nenhum código gerado ainda.</p>
          ) : (
            <ul className="grid gap-1 text-help text-ink-600">
              {history.data.slice(0, 6).map((c) => (
                <li key={c.id} className="flex justify-between">
                  <span>{formatDateTime(c.created_at)}</span>
                  <span className={c.used ? 'text-ok-fg' : 'text-ink-400'}>
                    {c.used ? 'usado' : 'não usado'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  )
}
