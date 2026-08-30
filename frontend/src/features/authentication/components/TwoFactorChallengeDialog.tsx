import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { InlineError } from '@/components/ui/InlineError'

type Props = {
  /** Recebe o código (TOTP ou backup) e resolve/rejeita conforme o backend. */
  onVerify: (code: string) => Promise<void>
  onCancel: () => void
}

export function TwoFactorChallengeDialog({ onVerify, onCancel }: Props) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await onVerify(code.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código inválido ou expirado.')
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Verificação em duas etapas"
      onClick={onCancel}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="grid w-full max-w-sm gap-4 rounded-lg border border-line bg-white p-6 shadow-overlay"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-brand-600" />
          <h2 className="text-section text-ink-900">Verificação em duas etapas</h2>
        </div>

        <p className="text-help text-ink-500">
          Digite o código de 6 dígitos do seu aplicativo autenticador.
        </p>

        {error && <InlineError title="Não foi possível verificar" message={error} />}

        <Field label="Código" name="totp_code" required>
          <Input
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={9}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^\d-]/g, ''))}
            className="text-center font-mono text-xl tracking-[0.3em]"
          />
        </Field>

        <p className="text-center text-help text-ink-400">
          Sem o celular? Use um <strong>código de backup</strong> (1234-5678).
        </p>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={busy} disabled={code.length < 6}>
            Verificar
          </Button>
        </div>
      </form>
    </div>
  )
}
