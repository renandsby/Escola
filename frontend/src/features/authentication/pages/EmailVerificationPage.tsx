import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { authService } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { InlineError } from '@/components/ui/InlineError'
import { getErrorCode } from '@/utils/api-helpers'
import { resolveError } from '@/services/errorMessages'
import { ROUTES } from '@/app/routes/paths'

type Status = 'idle' | 'verifying' | 'success' | 'error'

export default function EmailVerificationPage() {
  const { token } = useParams<{ token?: string }>()
  const navigate = useNavigate()
  const { user, setUser, isAuthenticated } = useAuthStore()

  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'idle')
  const [error, setError] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const ran = useRef(false)

  useEffect(() => {
    if (!token || ran.current) {return}
    ran.current = true
    ;(async () => {
      try {
        await authService.verifyEmail(token)
        if (user) {setUser({ ...user, email_verified: true })}
        setStatus('success')
      } catch (err) {
        setError(resolveError(getErrorCode(err)).message())
        setStatus('error')
      }
    })()
  }, [token, user, setUser])

  async function resend() {
    setResending(true)
    try {
      await authService.resendVerification()
      toast.success('Enviamos um novo link de confirmação para o seu e-mail.')
    } catch (err) {
      toast.error(resolveError(getErrorCode(err)).message())
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-canvas px-4">
      <div className="w-full max-w-sm rounded-lg border border-line bg-white p-8 shadow-overlay">
        <div className="mb-6 grid gap-1 text-center">
          <h1 className="text-page text-ink-900">Confirmação de e-mail</h1>
        </div>

        {status === 'verifying' && (
          <p className="text-center text-base text-ink-500">Confirmando o seu e-mail…</p>
        )}

        {status === 'success' && (
          <div className="grid gap-4 text-center">
            <p className="text-base text-ink-700">
              E-mail confirmado! Agora você tem acesso completo à vida escolar dos seus
              dependentes.
            </p>
            <Button
              variant="primary"
              className="w-full"
              onClick={() => navigate(isAuthenticated ? ROUTES.home : ROUTES.login)}
            >
              {isAuthenticated ? 'Ir para o portal' : 'Entrar'}
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="grid gap-4">
            <InlineError title="Não foi possível confirmar" message={error ?? ''} />
            {isAuthenticated && (
              <Button variant="primary" className="w-full" loading={resending} onClick={resend}>
                Reenviar link de confirmação
              </Button>
            )}
            <Link to={ROUTES.login} className="text-center text-help text-ink-400 hover:text-ink-700">
              Voltar para o login
            </Link>
          </div>
        )}

        {status === 'idle' && (
          <div className="grid gap-4 text-center">
            <p className="text-base text-ink-700">
              Enviamos um link de confirmação para o seu e-mail
              {user?.email ? ` (${user.email})` : ''}. Clique no link para liberar o acesso às
              notas, frequência e documentos.
            </p>
            {isAuthenticated ? (
              <Button variant="primary" className="w-full" loading={resending} onClick={resend}>
                Não recebi — reenviar
              </Button>
            ) : (
              <Link to={ROUTES.login} className="text-brand-700 hover:underline">
                Voltar para o login
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
