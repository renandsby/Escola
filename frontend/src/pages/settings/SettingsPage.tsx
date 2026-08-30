import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { apiClient } from '@/services/api'
import { apiGet } from '@/utils/api-helpers'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Field'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
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

export default function SettingsPage() {
  const { user, logout } = useAuthStore()
  const [notifications, setNotifications] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)

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
          <Button variant="secondary">Editar perfil</Button>
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
          <Button variant="secondary">Alterar senha</Button>
          <Button variant="secondary">Ativar autenticação em dois fatores</Button>
          <Button variant="secondary">Revisar sessões ativas</Button>
        </div>
      </Card>

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
