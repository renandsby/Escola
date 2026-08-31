import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
import { getErrorCode } from '@/utils/api-helpers'
import { resolveError } from '@/services/errorMessages'
import { TwoFactorChallengeDialog } from '../components/TwoFactorChallengeDialog'
import type { LoginResponse } from '@/types/api'

const loginSchema = z.object({
  identifier: z.string().min(1, 'Informe o CPF ou e-mail'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [challengeToken, setChallengeToken] = useState<string | null>(null)

  const methods = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })
  const { register, handleSubmit } = methods

  const completeLogin = (data: LoginResponse) => {
    login(data.access!, data.refresh!, data.user!)
    navigate(ROUTES.home)
  }

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError(null)
    try {
      const { data: res } = await authService.login(data.identifier.trim(), data.password)
      if (res.requires_2fa) {
        setChallengeToken(res.challenge_token!)
      } else {
        completeLogin(res)
      }
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

  const verifyTwoFactor = async (code: string) => {
    try {
      const { data } = await authService.verifyTOTP({
        challenge_token: challengeToken!,
        code,
      })
      completeLogin(data)
    } catch (err) {
      throw new Error(resolveError(getErrorCode(err)).message())
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
            <Field label="CPF ou e-mail" name="identifier" required>
              <Input
                autoFocus
                placeholder="Digite seu CPF ou e-mail"
                autoComplete="username"
                {...register('identifier')}
              />
            </Field>
            <Field label="Senha" name="password" required>
              <Input type="password" placeholder="Digite sua senha" {...register('password')} />
            </Field>
            <Button type="submit" variant="primary" loading={isLoading} className="w-full">
              Entrar
            </Button>
            <Link
              to={ROUTES.forgotPassword}
              className="text-center text-help text-ink-400 hover:text-ink-700"
            >
              Esqueci minha senha
            </Link>
          </form>
        </FormProvider>
      </div>

      {challengeToken && (
        <TwoFactorChallengeDialog
          onVerify={verifyTwoFactor}
          onCancel={() => setChallengeToken(null)}
        />
      )}
    </div>
  )
}
