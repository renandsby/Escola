import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, ShieldOff } from 'lucide-react'
import { toast } from 'sonner'
import { authService } from '@/services/api'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { apiGet } from '@/utils/api-helpers'
import type { TOTPStatus } from '@/types/api'
import { TwoFactorSetupDialog } from './TwoFactorSetupDialog'

export function TwoFactorSection() {
  const queryClient = useQueryClient()
  const [setup, setSetup] = useState(false)
  const [confirmDisable, setConfirmDisable] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['totp', 'status'],
    queryFn: () => apiGet<TOTPStatus>('accounts/totp/status/'),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['totp', 'status'] })

  const disable = useMutation({
    mutationFn: () => authService.disableTOTP(),
    onSuccess: () => {
      toast.success('2FA desativado.')
      invalidate()
    },
    onError: () => toast.error('Não foi possível desativar o 2FA.'),
  })

  const enabled = !!data?.enabled

  return (
    <section className="grid gap-4 rounded-lg border border-line bg-white p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-brand-600" />
        <h2 className="text-section text-ink-900">Autenticação em dois fatores (2FA)</h2>
      </div>

      <p className="text-help text-ink-500">
        Uma camada extra de segurança: além da senha, o login passa a pedir um
        código de 6 dígitos gerado por um aplicativo autenticador
        (Google Authenticator, Microsoft Authenticator, Authy, 2FAS…).
      </p>

      {isLoading ? (
        <p className="text-help text-ink-400">Carregando…</p>
      ) : enabled ? (
        <div className="grid gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-ok-border bg-ok-bg p-3 text-ok-fg">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-base">
              Ativo desde{' '}
              {data?.confirmed_at
                ? new Date(data.confirmed_at).toLocaleDateString('pt-BR')
                : '—'}{' '}
              · {data?.backup_codes_remaining ?? 0} código(s) de backup restante(s)
            </span>
          </div>
          <div>
            <Button
              variant="danger"
              iconLeft={<ShieldOff className="h-4 w-4" />}
              loading={disable.isPending}
              onClick={() => setConfirmDisable(true)}
            >
              Desativar 2FA
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Button
            variant="primary"
            iconLeft={<ShieldCheck className="h-4 w-4" />}
            onClick={() => setSetup(true)}
          >
            Ativar autenticação em dois fatores
          </Button>
        </div>
      )}

      {setup && (
        <TwoFactorSetupDialog onClose={() => setSetup(false)} onActivated={invalidate} />
      )}

      <ConfirmDialog
        open={confirmDisable}
        title="Desativar 2FA"
        description="Sua conta voltará a ser protegida apenas pela senha. Os códigos de backup atuais deixam de valer."
        confirmLabel="Desativar"
        destructive
        onConfirm={() => {
          setConfirmDisable(false)
          disable.mutate()
        }}
        onCancel={() => setConfirmDisable(false)}
      />
    </section>
  )
}
