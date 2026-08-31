import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { getErrorMessage } from '@/utils/api-helpers'
import { formatCPF, formatPhone } from '@/utils/formatting'
import { KINSHIP_TYPE_LABELS } from '@/types/api'
import type { StudentGuardianLink } from '@/types/api'
import { ROUTES } from '@/app/routes/paths'
import {
  deleteStudentLink,
  fetchGuardian,
  fetchGuardianLinks,
} from '../api/guardiansApi'
import { StudentLinkModal } from '../components/StudentLinkModal'

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 rounded-lg border border-line bg-white p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-section text-ink-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export default function GuardianDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkToRemove, setLinkToRemove] = useState<StudentGuardianLink | null>(null)

  const guardianQuery = useQuery({
    queryKey: ['guardian', id],
    queryFn: () => fetchGuardian(id as string),
    enabled: !!id,
  })
  const linksQuery = useQuery({
    queryKey: ['guardian-links', id],
    queryFn: () => fetchGuardianLinks(id as string),
    enabled: !!id,
  })

  const removeLink = useMutation({
    mutationFn: (linkId: string) => deleteStudentLink(linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardian-links', id] })
      queryClient.invalidateQueries({ queryKey: ['guardian', id] })
      toast.success('Vínculo removido.')
    },
    onError: (error) => toast.error(getErrorMessage(error)),
    onSettled: () => setLinkToRemove(null),
  })

  if (guardianQuery.isLoading) {
    return (
      <>
        <PageHeader breadcrumb={[{ label: 'Responsáveis', to: ROUTES.guardians }]} title="Responsável" />
        <TableSkeleton rows={6} cols={2} />
      </>
    )
  }

  if (guardianQuery.isError || !guardianQuery.data) {
    return (
      <>
        <PageHeader breadcrumb={[{ label: 'Responsáveis', to: ROUTES.guardians }]} title="Responsável" />
        <EmptyState title="Erro ao carregar" description="Não foi possível carregar o responsável." />
      </>
    )
  }

  const g = guardianQuery.data
  const links = linksQuery.data?.results ?? []

  const linkColumns: Column<StudentGuardianLink>[] = [
    { key: 'student', header: 'Aluno', render: (l) => l.student_name || '—' },
    { key: 'kinship', header: 'Parentesco', render: (l) => KINSHIP_TYPE_LABELS[l.kinship_type] ?? l.kinship_type },
    {
      key: 'emergency',
      header: 'Contato de emergência',
      render: (l) =>
        l.is_emergency_contact ? <Badge tone="ok">Sim</Badge> : <Badge tone="neutral" shape="square">Não</Badge>,
    },
  ]

  const fichaRows: [string, React.ReactNode][] = [
    ['CPF', g.cpf ? <span className="font-mono tabular-nums">{formatCPF(g.cpf)}</span> : '—'],
    ['Telefone', g.phone ? formatPhone(g.phone) : '—'],
    ['Email', g.email || '—'],
    ['Ocupação', g.occupation || '—'],
    ['Endereço', g.address || '—'],
    [
      'Acesso ao portal',
      g.user ? <Badge tone="ok">Habilitado</Badge> : <Badge tone="neutral" shape="square">Sem login</Badge>,
    ],
  ]

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Responsáveis', to: ROUTES.guardians }, { label: g.full_name }]}
        title={g.full_name}
        meta={
          g.is_active ? (
            <Badge tone="ok">Ativo</Badge>
          ) : (
            <Badge tone="neutral" shape="square">
              Inativo
            </Badge>
          )
        }
        actions={
          <Button
            variant="primary"
            iconLeft={<Pencil className="h-4 w-4" />}
            onClick={() => navigate(ROUTES.guardianEdit(g.id))}
          >
            Editar
          </Button>
        }
      />

      <Card title="Dados cadastrais">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {fichaRows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-line-soft pb-2">
              <dt className="text-help text-ink-400">{k}</dt>
              <dd className="text-right text-base text-ink-700">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card
        title="Alunos vinculados"
        action={
          <Button
            size="sm"
            variant="secondary"
            iconLeft={<Plus className="h-4 w-4" />}
            onClick={() => setShowLinkModal(true)}
          >
            Adicionar vínculo
          </Button>
        }
      >
        <DataTable
          columns={linkColumns}
          rows={links}
          rowKey={(l) => l.id}
          isLoading={linksQuery.isLoading}
          onRowClick={(l) => navigate(ROUTES.student(l.student))}
          empty={<EmptyState title="Nenhum aluno vinculado" description="Adicione o primeiro vínculo deste responsável." />}
          rowActions={(l) => (
            <Button size="sm" variant="ghost" onClick={() => setLinkToRemove(l)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        />
      </Card>

      {showLinkModal && (
        <StudentLinkModal
          guardianId={g.id}
          linkedStudentIds={links.map((l) => l.student)}
          onClose={() => setShowLinkModal(false)}
          onSuccess={() => {
            setShowLinkModal(false)
            queryClient.invalidateQueries({ queryKey: ['guardian-links', id] })
            queryClient.invalidateQueries({ queryKey: ['guardian', id] })
          }}
        />
      )}

      <ConfirmDialog
        open={!!linkToRemove}
        title="Remover vínculo"
        description={`Remover o vínculo com ${linkToRemove?.student_name || 'este aluno'}?`}
        confirmLabel="Remover"
        destructive
        onConfirm={() => linkToRemove && removeLink.mutate(linkToRemove.id)}
        onCancel={() => setLinkToRemove(null)}
      />
    </>
  )
}
