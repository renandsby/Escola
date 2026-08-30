import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { authService } from '@/services/api'
import { Field, Input } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { InlineError } from '@/components/ui/InlineError'
import { getErrorCode } from '@/utils/api-helpers'
import { resolveError } from '@/services/errorMessages'
import { ROUTES } from '@/app/routes/paths'

export default function ResetPasswordPage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const [pwd, setPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pwd !== confirm) {
      setError('As senhas não correspondem.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await authService.confirmPasswordReset({
        token,
        new_password: pwd,
        new_password_confirm: confirm,
      })
      toast.success('Senha redefinida. Faça login com a nova senha.')
      navigate(ROUTES.login)
    } catch (err) {
      const code = getErrorCode(err)
      setError(
        code ? resolveError(code).message() : 'Não foi possível redefinir a senha.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-canvas px-4">
      <div className="w-full max-w-sm rounded-lg border border-line bg-white p-8 shadow-overlay">
        <div className="mb-6 grid gap-1 text-center">
          <h1 className="text-page text-ink-900">Nova senha</h1>
          <p className="text-help text-ink-400">Escolha uma senha de ao menos 8 caracteres.</p>
        </div>
        <form onSubmit={onSubmit} className="grid gap-4">
          {error && <InlineError title="Não foi possível redefinir" message={error} />}
          <Field label="Nova senha" name="new_password" required>
            <Input
              type="password"
              autoFocus
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              minLength={8}
            />
          </Field>
          <Field label="Confirmar nova senha" name="new_password_confirm" required>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={8}
            />
          </Field>
          <Button type="submit" variant="primary" loading={loading} className="w-full">
            Redefinir senha
          </Button>
          <Link
            to={ROUTES.login}
            className="text-center text-help text-ink-400 hover:text-ink-700"
          >
            Voltar para o login
          </Link>
        </form>
      </div>
    </div>
  )
}
