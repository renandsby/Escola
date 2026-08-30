import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authService } from '@/services/api'
import { Field, Input } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { InlineError } from '@/components/ui/InlineError'
import { ROUTES } from '@/app/routes/paths'

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await authService.requestPasswordReset(identifier.trim())
      setSent(true)
    } catch {
      setError('Não foi possível processar a solicitação. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-canvas px-4">
      <div className="w-full max-w-sm rounded-lg border border-line bg-white p-8 shadow-overlay">
        <div className="mb-6 grid gap-1 text-center">
          <h1 className="text-page text-ink-900">Recuperar senha</h1>
          <p className="text-help text-ink-400">
            Enviaremos um link de redefinição para o e-mail cadastrado.
          </p>
        </div>

        {sent ? (
          <div className="grid gap-4">
            <p className="text-base text-ink-700">
              Se houver uma conta com esse identificador, você receberá um e-mail com
              instruções em instantes. O link vale por 2 horas.
            </p>
            <Link to={ROUTES.login} className="text-brand-700 hover:underline">
              Voltar para o login
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-4">
            {error && <InlineError title="Erro" message={error} />}
            <Field label="E-mail ou usuário" name="identifier" required>
              <Input
                autoFocus
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="seu.email@rede.gov.br"
              />
            </Field>
            <Button type="submit" variant="primary" loading={loading} className="w-full">
              Enviar link de redefinição
            </Button>
            <Link
              to={ROUTES.login}
              className="text-center text-help text-ink-400 hover:text-ink-700"
            >
              Voltar para o login
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
