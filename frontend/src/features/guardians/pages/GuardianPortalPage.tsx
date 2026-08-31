import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { GraduationCap, MailWarning, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { apiGet } from '@/utils/api-helpers'
import { authService } from '@/services/api'
import { ROUTES } from '@/app/routes/paths'
import { StudentCardOverview, type Dependent } from '../components/StudentCardOverview'
import { LinkStudentModal } from '../components/LinkStudentModal'

export default function GuardianPortalPage() {
  const user = useAuthStore((s) => s.user)
  const firstName = user?.first_name
  const emailUnverified = user?.email_verified === false

  const [linking, setLinking] = useState(false)
  const [resending, setResending] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['guardians', 'my-dependents'],
    queryFn: () => apiGet<Dependent[]>('guardians/my-dependents/'),
    enabled: !emailUnverified,
  })

  async function resend() {
    setResending(true)
    try {
      await authService.resendVerification()
      toast.success('Enviamos um novo link de confirmação para o seu e-mail.')
    } catch {
      toast.error('Não foi possível reenviar agora. Tente novamente em instantes.')
    } finally {
      setResending(false)
    }
  }

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Meus filhos' }]}
        title={firstName ? `Olá, ${firstName}` : 'Meus filhos'}
        meta="Acompanhe notas, frequência e documentos de cada estudante."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              iconLeft={<UserPlus className="h-4 w-4" />}
              onClick={() => setLinking(true)}
            >
              Vincular estudante
            </Button>
            <Link to={ROUTES.myAdmissions}>
              <Button variant="secondary" iconLeft={<GraduationCap className="h-4 w-4" />}>
                Matrícula e rematrícula
              </Button>
            </Link>
          </div>
        }
      />

      {emailUnverified && (
        <div className="mb-4 flex flex-wrap items-start gap-3 rounded-lg border border-warn-border bg-warn-bg p-4">
          <MailWarning className="mt-0.5 h-5 w-5 shrink-0 text-warn-fg" />
          <div className="grid gap-1">
            <p className="text-base font-semibold text-ink-900">Confirme o seu e-mail</p>
            <p className="text-help text-ink-600">
              Enviamos um link de confirmação para <strong>{user?.email}</strong>. Confirme para
              liberar o acesso às notas, frequência e documentos dos seus dependentes.
            </p>
            <div>
              <Button variant="secondary" loading={resending} onClick={resend}>
                Reenviar link
              </Button>
            </div>
          </div>
        </div>
      )}

      {emailUnverified ? null : isLoading ? (
        <TableSkeleton rows={3} cols={2} />
      ) : isError || !data ? (
        <EmptyState
          title="Não foi possível carregar"
          description="Tente novamente em instantes."
        />
      ) : data.length === 0 ? (
        <EmptyState
          title="Nenhum estudante vinculado"
          description='Use "Vincular estudante" para informar o código da escola ou solicitar o vínculo.'
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((d) => (
            <StudentCardOverview key={d.student_id} dependent={d} />
          ))}
        </div>
      )}

      {linking && <LinkStudentModal onClose={() => setLinking(false)} />}
    </>
  )
}
