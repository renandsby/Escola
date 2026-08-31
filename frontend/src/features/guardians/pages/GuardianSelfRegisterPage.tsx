import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/PageHeader'
import { Field, Input } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { FormSection, StickyActions } from '@/components/ui/FormSection'
import { FormError } from '@/components/feedback/FormError'
import { isValidCPF, normalizeCPF } from '@/utils/validation'
import { apiPost } from '@/utils/api-helpers'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/app/routes/paths'
import type { LoginResponse } from '@/types/api'

const CAPTCHA_SITE_KEY = import.meta.env.VITE_CAPTCHA_SITE_KEY as string | undefined

const schema = z
  .object({
    full_name: z.string().min(3, 'Informe o nome completo'),
    cpf: z.string().min(1, 'CPF é obrigatório').refine(isValidCPF, 'CPF inválido'),
    email: z.string().email('E-mail inválido'),
    phone: z.string().min(10, 'Telefone inválido'),
    password: z.string().min(8, 'Mínimo de 8 caracteres'),
    password_confirm: z.string().min(8, 'Confirme a senha'),
    address: z.string().optional(),
    occupation: z.string().optional(),
  })
  .refine((d) => d.password === d.password_confirm, {
    message: 'As senhas não coincidem',
    path: ['password_confirm'],
  })

type FormData = z.infer<typeof schema>

export default function GuardianSelfRegisterPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<unknown>(null)
  const [captchaToken, setCaptchaToken] = useState('')

  const methods = useForm<FormData>({ resolver: zodResolver(schema) })
  const { register, handleSubmit } = methods

  // Cloudflare Turnstile: carrega o script e expõe o callback global só quando
  // há site key configurada (CAPTCHA é opcional / desligado por padrão).
  useEffect(() => {
    if (!CAPTCHA_SITE_KEY) {
      return
    }
    const w = window as unknown as { onTurnstileToken?: (t: string) => void }
    w.onTurnstileToken = setCaptchaToken
    if (!document.querySelector<HTMLScriptElement>('script[data-turnstile]')) {
      const s = document.createElement('script')
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
      s.async = true
      s.defer = true
      s.dataset.turnstile = 'true'
      document.head.appendChild(s)
    }
  }, [])

  const onSubmit = async (data: FormData) => {
    setSubmitError(null)
    setSubmitting(true)
    try {
      const res = await apiPost<LoginResponse & { guardian: unknown }>(
        'guardians/self-register/',
        {
          full_name: data.full_name,
          cpf: normalizeCPF(data.cpf),
          email: data.email.trim().toLowerCase(),
          phone: data.phone,
          password: data.password,
          password_confirm: data.password_confirm,
          address: data.address ?? '',
          occupation: data.occupation ?? '',
          captcha_token: captchaToken,
        },
      )
      if (res?.access && res.refresh && res.user) {
        login(res.access, res.refresh, res.user)
      }
      toast.success('Conta criada! Confirme o seu e-mail para acessar a vida escolar.')
      navigate(ROUTES.verifyEmailPending)
    } catch (error) {
      setSubmitError(error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-1 px-4 py-8">
      <PageHeader
        title="Criar conta de responsável"
        meta="Cadastre-se para acompanhar a vida escolar dos seus dependentes."
      />

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-1">
          {!!submitError && <FormError error={submitError} />}

          <fieldset disabled={submitting} className="grid gap-1">
            <FormSection title="Seus dados" description="Como o responsável legal." first>
              <Field label="Nome completo" name="full_name" required className="sm:col-span-2">
                <Input {...register('full_name')} placeholder="João da Silva" />
              </Field>
              <Field label="CPF" name="cpf" required mono>
                <Input {...register('cpf')} placeholder="000.000.000-00" />
              </Field>
              <Field label="Telefone" name="phone" required>
                <Input {...register('phone')} placeholder="(00) 00000-0000" />
              </Field>
              <Field label="Endereço" name="address" className="sm:col-span-2">
                <Input {...register('address')} placeholder="Rua, número, bairro" />
              </Field>
              <Field label="Ocupação" name="occupation">
                <Input {...register('occupation')} />
              </Field>
            </FormSection>

            <FormSection title="Acesso" description="E-mail e senha para entrar no portal.">
              <Field label="E-mail" name="email" required className="sm:col-span-2">
                <Input type="email" {...register('email')} placeholder="voce@exemplo.com" />
              </Field>
              <Field label="Senha" name="password" required>
                <Input type="password" {...register('password')} />
              </Field>
              <Field label="Confirmar senha" name="password_confirm" required>
                <Input type="password" {...register('password_confirm')} />
              </Field>
            </FormSection>

            {CAPTCHA_SITE_KEY && (
              <FormSection title="Confirmação anti-robô">
                <div
                  className="cf-turnstile"
                  data-sitekey={CAPTCHA_SITE_KEY}
                  data-callback="onTurnstileToken"
                />
              </FormSection>
            )}
          </fieldset>

          <StickyActions>
            <Link to={ROUTES.login}>
              <Button type="button" variant="secondary">
                Já tenho conta
              </Button>
            </Link>
            <Button type="submit" variant="primary" loading={submitting}>
              Criar conta
            </Button>
          </StickyActions>
        </form>
      </FormProvider>
    </div>
  )
}
