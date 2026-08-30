import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { apiClient, authService } from '@/services/api'
import { apiGet, getErrorCode } from '@/utils/api-helpers'
import { resolveError } from '@/services/errorMessages'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Field'
import { InlineError } from '@/components/ui/InlineError'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { TwoFactorSection } from '@/features/authentication/components/TwoFactorSection'
import { USER_ROLE } from '@/components/ui/statusMaps'
import { cn } from '@/utils/cn'
import type { PaginatedResponse, Student } from '@/types/api'

function Card({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="grid gap-4 rounded-lg border border-line bg-white p-6">
      <div>
        <h2 className="text-section text-ink-900">{title}</h2>
        {description && <p className="mt-1 text-help text-ink-400">{description}</p>}
      </div>
      {children}
    </section>
  )
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line-soft pb-4 last:border-0 last:pb-0">
      <div>
        <p className="text-label text-ink-700">{label}</p>
        <p className="mt-0.5 text-help text-ink-400">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-pill transition-colors',
          checked ? 'bg-brand-600' : 'bg-line-strong'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid gap-1">
      <p className="text-help text-ink-400">{label}</p>
      <p className="text-base text-ink-700">{value || '—'}</p>
    </div>
  )
}

function PrivacyCard() {
  const [busyId, setBusyId] = useState<string | null>(null)
  const { data } = useQuery({
    queryKey: ['privacy', 'my-students'],
    queryFn: () => apiGet<PaginatedResponse<Student>>('students/', { page_size: 20 }),
  })
  const students = data?.results ?? []
  if (students.length === 0) {
    return null
  }

  async function download(student: Student) {
    setBusyId(student.id)
    try {
      const res = await apiClient.get('/privacy/my-data/', {
        params: { student_id: student.id },
      })
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dados-lgpd-${student.full_name.replace(/\s+/g, '-').toLowerCase()}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Não foi possível baixar os dados agora.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Card
      title="Privacidade e dados (LGPD)"
      description="Baixe uma cópia dos dados cadastrais que a rede mantém."
    >
      <ul className="grid gap-2">
        {students.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between gap-4 border-b border-line-soft pb-3 last:border-0 last:pb-0"
          >
            <span className="text-base text-ink-700">{s.full_name}</span>
            <Button
              size="sm"
              variant="secondary"
              iconLeft={<Download className="h-4 w-4" />}
              loading={busyId === s.id}
              onClick={() => download(s)}
            >
              Baixar dados cadastrais
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    current_password: '',
    new_password: '',
    new_password_confirm: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { logout } = useAuthStore()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (form.new_password !== form.new_password_confirm) {
      setError('As senhas não correspondem.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await authService.changePassword(form)
      toast.success('Senha alterada. Faça login novamente.')
      logout()
      window.location.href = '/login'
    } catch (err) {
      const code = getErrorCode(err)
      setError(code ? resolveError(code).message() : 'Não foi possível alterar a senha. Verifique a senha atual.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="grid w-full max-w-sm gap-4 rounded-lg border border-line bg-white p-6 shadow-overlay"
      >
        <h2 className="text-section text-ink-900">Alterar senha</h2>
        {error && <InlineError title="Erro" message={error} />}
        <Field label="Senha atual" name="current_password" required>
          <Input
            type="password"
            value={form.current_password}
            onChange={(e) => setForm({ ...form, current_password: e.target.value })}
          />
        </Field>
        <Field label="Nova senha" name="new_password" required>
          <Input
            type="password"
            minLength={8}
            value={form.new_password}
            onChange={(e) => setForm({ ...form, new_password: e.target.value })}
          />
        </Field>
        <Field label="Confirmar nova senha" name="new_password_confirm" required>
          <Input
            type="password"
            minLength={8}
            value={form.new_password_confirm}
            onChange={(e) => setForm({ ...form, new_password_confirm: e.target.value })}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={busy}>
            Alterar senha
          </Button>
        </div>
      </form>
    </div>
  )
}

function EditProfileDialog({ onClose }: { onClose: () => void }) {
  const { user, setUser } = useAuthStore()
  const [form, setForm] = useState({ email: user?.email ?? '', phone: user?.phone ?? '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await apiClient.patch('/accounts/users/update_profile/', form)
      setUser({ ...(user as NonNullable<typeof user>), ...res.data })
      toast.success('Perfil atualizado.')
      onClose()
    } catch {
      setError('Não foi possível salvar. Verifique os campos.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="grid w-full max-w-sm gap-4 rounded-lg border border-line bg-white p-6 shadow-overlay"
      >
        <h2 className="text-section text-ink-900">Editar perfil</h2>
        {error && <InlineError title="Erro" message={error} />}
        <Field label="E-mail" name="email" required>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>
        <Field label="Telefone" name="phone">
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={busy}>
            Salvar
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function SettingsPage() {
  const { user, logout } = useAuthStore()
  const [notifications, setNotifications] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Configurações' }]}
        title="Configurações"
        meta="Preferências da conta e da interface."
      />

      <Card title="Perfil">
        <div className="grid gap-4 sm:grid-cols-2">
          <Row label="Nome" value={`${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim()} />
          <Row label="Usuário" value={user?.username} />
          <Row label="E-mail" value={user?.email} />
          <Row label="Função" value={user?.role ? USER_ROLE[user.role] : '—'} />
        </div>
        <div>
          <Button variant="secondary" onClick={() => setShowProfile(true)}>
            Editar perfil
          </Button>
        </div>
      </Card>

      <Card title="Notificações" description="Como você quer ser avisado.">
        <Toggle
          label="Notificações no app"
          description="Receba avisos dentro da aplicação."
          checked={notifications}
          onChange={setNotifications}
        />
        <Toggle
          label="Notificações por e-mail"
          description="Receba atualizações no e-mail cadastrado."
          checked={emailNotifications}
          onChange={setEmailNotifications}
        />
      </Card>

      <Card title="Aparência">
        <Toggle
          label="Modo escuro"
          description="Ative o tema escuro para a interface."
          checked={darkMode}
          onChange={setDarkMode}
        />
        <div className="grid gap-1.5">
          <label htmlFor="lang" className="text-label text-ink-700">
            Idioma
          </label>
          <Select id="lang" name="lang" defaultValue="pt" className="sm:max-w-xs">
            <option value="pt">Português (BR)</option>
            <option value="en">English (US)</option>
            <option value="es">Español</option>
          </Select>
        </div>
      </Card>

      <PrivacyCard />

      <Card title="Segurança">
        <div className="grid gap-3 sm:max-w-sm">
          <Button variant="secondary" onClick={() => setShowPwd(true)}>
            Alterar senha
          </Button>
        </div>
      </Card>

      <TwoFactorSection />

      <section className="grid gap-4 rounded-lg border border-danger-border bg-danger-bg p-6">
        <div>
          <h2 className="text-section text-danger-fg">Zona de perigo</h2>
          <p className="mt-1 text-help text-danger-fg/80">
            Você será desconectado de todas as sessões.
          </p>
        </div>
        <div>
          <Button
            variant="danger"
            iconLeft={<LogOut className="h-4 w-4" />}
            onClick={() => setConfirmLogout(true)}
          >
            Sair da conta
          </Button>
        </div>
      </section>

      {showPwd && <ChangePasswordDialog onClose={() => setShowPwd(false)} />}
      {showProfile && <EditProfileDialog onClose={() => setShowProfile(false)} />}

      <ConfirmDialog
        open={confirmLogout}
        title="Sair da conta"
        description="Você será desconectado e precisará entrar novamente."
        onConfirm={() => {
          logout()
          window.location.href = '/login'
        }}
        onCancel={() => setConfirmLogout(false)}
        confirmLabel="Sair"
        destructive
      />
    </>
  )
}
