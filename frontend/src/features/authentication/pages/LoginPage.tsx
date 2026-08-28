import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authService } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { getErrorMessage } from '@/utils/api-helpers'
import { Field, Input } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { InlineError } from '@/components/ui/InlineError'
import { ROUTES } from '@/app/routes/paths'

const loginSchema = z.object({
  username: z.string().min(1, 'Usuário é obrigatório'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const methods = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })
  const { register, handleSubmit } = methods

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await authService.login(data.username, data.password)
      login(response.data.access, response.data.refresh, response.data.user)
      navigate(ROUTES.home)
    } catch (err: unknown) {
      const message = getErrorMessage(err)
      setError(
        message.includes('401') || message.toLowerCase().includes('inválid')
          ? 'Usuário ou senha inválidos.'
          : message
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-canvas px-4">
      <div className="w-full max-w-sm rounded-lg border border-line bg-white p-8 shadow-overlay">
        <div className="mb-6 grid gap-1 text-center">
          <h1 className="text-page text-ink-900">Rede Municipal</h1>
          <p className="text-help text-ink-400">Sistema de Gestão Escolar</p>
        </div>

        {error && (
          <div className="mb-4">
            <InlineError title="Não foi possível entrar" message={error} />
          </div>
        )}

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <Field label="Usuário" name="username" required>
              <Input autoFocus placeholder="Digite seu usuário" {...register('username')} />
            </Field>
            <Field label="Senha" name="password" required>
              <Input type="password" placeholder="Digite sua senha" {...register('password')} />
            </Field>
            <Button type="submit" variant="primary" loading={isLoading} className="w-full">
              Entrar
            </Button>
          </form>
        </FormProvider>
      </div>
    </div>
  )
}
