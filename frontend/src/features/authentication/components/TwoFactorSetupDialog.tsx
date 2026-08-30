import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, Copy, Download, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { authService } from '@/services/api'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { InlineError } from '@/components/ui/InlineError'
import { getErrorCode } from '@/utils/api-helpers'
import { resolveError } from '@/services/errorMessages'

type Step = 'scan' | 'verify' | 'backup'

export function TwoFactorSetupDialog({
  onClose,
  onActivated,
}: {
  onClose: () => void
  onActivated: () => void
}) {
  const [step, setStep] = useState<Step>('scan')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const enable = useMutation({
    mutationFn: () => authService.enableTOTP(),
    onSuccess: ({ data }) => {
      setQrCode(data.qr_code)
      setSecret(data.secret)
    },
    onError: (err) => setError(resolveError(getErrorCode(err)).message()),
  })

  const confirm = useMutation({
    mutationFn: (c: string) => authService.confirmTOTP(c),
    onSuccess: ({ data }) => {
      setBackupCodes(data.backup_codes)
      setStep('backup')
    },
    onError: (err) => setError(resolveError(getErrorCode(err)).message()),
  })

  // dispara a ativação uma vez, ao abrir
  const enableMutate = enable.mutate
  useEffect(() => {
    enableMutate()
  }, [enableMutate])

  function downloadBackupCodes() {
    const blob = new Blob(
      [`Códigos de backup 2FA — use uma vez cada.\n\n${backupCodes.join('\n')}\n`],
      { type: 'text/plain' }
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'codigos-backup-2fa.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const titles: Record<Step, string> = {
    scan: 'Ativar 2FA — escaneie o QR Code',
    verify: 'Ativar 2FA — confirme o código',
    backup: 'Guarde seus códigos de backup',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={step === 'backup' ? undefined : onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="grid w-full max-w-md gap-4 rounded-lg border border-line bg-white p-6 shadow-overlay"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-brand-600" />
          <h2 className="text-section text-ink-900">{titles[step]}</h2>
        </div>

        {error && <InlineError title="Não foi possível continuar" message={error} />}

        {step === 'scan' && (
          <div className="grid gap-4">
            <ol className="list-decimal pl-5 text-help text-ink-600">
              <li>Abra o app autenticador (Google Authenticator, Authy…).</li>
              <li>Toque em "adicionar conta" → "escanear QR Code".</li>
              <li>Aponte para o código abaixo.</li>
            </ol>

            {enable.isPending ? (
              <p className="py-8 text-center text-help text-ink-400">Gerando QR Code…</p>
            ) : (
              qrCode && (
                <div className="mx-auto rounded-lg border border-line bg-white p-3">
                  <img src={qrCode} alt="QR Code 2FA" className="h-44 w-44" />
                </div>
              )
            )}

            {secret && (
              <details className="text-help text-ink-400">
                <summary className="cursor-pointer hover:text-ink-700">
                  Não consegue escanear? Digitar a chave manualmente
                </summary>
                <div className="mt-2 flex items-center gap-2 rounded border border-line bg-surface-subtle p-2">
                  <code className="flex-1 break-all font-mono text-xs text-ink-700">{secret}</code>
                  <button
                    type="button"
                    aria-label="Copiar chave"
                    onClick={() => {
                      navigator.clipboard?.writeText(secret)
                      toast.success('Chave copiada.')
                    }}
                  >
                    <Copy className="h-4 w-4 text-ink-400" />
                  </button>
                </div>
              </details>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                disabled={!qrCode}
                onClick={() => {
                  setError(null)
                  setStep('verify')
                }}
              >
                Próximo
              </Button>
            </div>
          </div>
        )}

        {step === 'verify' && (
          <div className="grid gap-4">
            <p className="text-help text-ink-600">
              Digite o código de 6 dígitos que o app está mostrando agora:
            </p>
            <Field label="Código do app" name="totp_confirm" required>
              <Input
                autoFocus
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="text-center font-mono text-xl tracking-[0.3em]"
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setStep('scan')}>
                Voltar
              </Button>
              <Button
                variant="primary"
                loading={confirm.isPending}
                disabled={code.length !== 6}
                onClick={() => {
                  setError(null)
                  confirm.mutate(code)
                }}
              >
                Confirmar
              </Button>
            </div>
          </div>
        )}

        {step === 'backup' && (
          <div className="grid gap-4">
            <div className="flex items-center gap-2 rounded-lg border border-ok-border bg-ok-bg p-3 text-ok-fg">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-base">2FA ativado com sucesso.</span>
            </div>

            <p className="text-help text-ink-600">
              Guarde estes <strong>8 códigos</strong> em local seguro. Cada um
              serve <strong>uma única vez</strong> para entrar caso você perca o
              acesso ao app. <strong>Não serão exibidos de novo.</strong>
            </p>

            <div className="grid grid-cols-2 gap-2 rounded-lg border border-line bg-surface-subtle p-3">
              {backupCodes.map((c) => (
                <span key={c} className="rounded border border-line bg-white py-1 text-center font-mono text-sm">
                  {c}
                </span>
              ))}
            </div>

            <Button
              variant="secondary"
              iconLeft={<Download className="h-4 w-4" />}
              onClick={downloadBackupCodes}
            >
              Baixar códigos (.txt)
            </Button>

            <Button
              variant="primary"
              onClick={() => {
                onActivated()
                onClose()
              }}
            >
              Concluir
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
