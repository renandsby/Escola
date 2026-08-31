import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Search, Plus, Eye, Pencil, UserX } from 'lucide-react'
import type { Guardian } from '@/types/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { ScopeBar, useScope } from '@/components/ui/ScopeBar'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { getErrorMessage } from '@/utils/api-helpers'
import { formatCPF, formatPhone } from '@/utils/formatting'
import { ROUTES } from '@/app/routes/paths'
import { deactivateGuardian, fetchGuardians } from '../api/guardiansApi'

export default function GuardiansListPage() {
  const navigate = useNavigate()
  const scope = useScope()
  const queryClient = useQueryClient()
  const [term, setTerm] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [toDeactivate, setToDeactivate] = useState<Guardian | null>(null)

  const list = useQuery({
    queryKey: ['guardians', 'list', { showInactive }],
    queryFn: () => fetchGuardians(showInactive ? {} : { is_active: true }),
  })

  const deactivate = useMutation({
    mutationFn: (id: string) => deactivateGuardian(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardians'] })
      toast.success('Responsável desativado.')
    },
    onError: (error) => toast.error(getErrorMessage(error)),
    onSettled: () => setToDeactivate(null),
  })

  const q = term.trim().toLowerCase()
  const rows = (list.data?.results ?? []).filter((g) => {
    if (!q) {
      return true
    }
    return (
      g.full_name?.toLowerCase().includes(q) ||
      g.cpf?.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
      g.phone?.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
      g.email?.toLowerCase().includes(q)
    )
  })

  const columns: Column<Guardian>[] = [
    { key: 'name', header: 'Nome completo', render: (g) => <span className="font-medium">{g.full_name}</span> },
    { key: 'cpf', header: 'CPF', mono: true, align: 'right', render: (g) => (g.cpf ? formatCPF(g.cpf) : '—') },
    { key: 'phone', header: 'Telefone', render: (g) => (g.phone ? formatPhone(g.phone) : '—') },
    { key: 'email', header: 'Email', render: (g) => g.email || '—' },
    { key: 'links', header: 'Alunos', align: 'right', render: (g) => g.students_count ?? '—' },
    {
      key: 'status',
      header: 'Situação',
      render: (g) =>
        g.is_active ? (
          <Badge tone="ok">Ativo</Badge>
        ) : (
          <Badge tone="neutral" shape="square">
            Inativo
          </Badge>
        ),
    },
  ]

  if (list.isError) {
    return (
      <>
        <PageHeader title="Responsáveis" />
        <EmptyState title="Erro ao carregar" description="Não foi possível carregar os responsáveis." />
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Pessoas' }, { label: 'Responsáveis' }]}
        title="Responsáveis"
        actions={
          <Button
            variant="primary"
            iconLeft={<Plus className="h-4 w-4" />}
            onClick={() => navigate(ROUTES.guardianNew)}
          >
            Novo responsável
          </Button>
        }
      />
      <ScopeBar
        level={scope.level}
        title={scope.title}
        detail={list.data ? `${list.data.count} responsável(is)` : undefined}
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar por nome, CPF, telefone ou email…"
            className="h-control w-full rounded border border-line-strong bg-white pl-9 pr-3 text-base"
          />
        </div>
        <Button variant="secondary" onClick={() => setShowInactive((v) => !v)}>
          {showInactive ? 'Ocultar inativos' : 'Mostrar inativos'}
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(g) => g.id}
        isLoading={list.isLoading}
        onRowClick={(g) => navigate(ROUTES.guardian(g.id))}
        empty={
          <EmptyState
            title="Nenhum responsável encontrado"
            description={term ? 'Ajuste a busca.' : 'Cadastre o primeiro responsável da rede.'}
          />
        }
        rowActions={(g) => (
          <>
            <Button size="sm" variant="ghost" onClick={() => navigate(ROUTES.guardian(g.id))}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => navigate(ROUTES.guardianEdit(g.id))}>
              <Pencil className="h-4 w-4" />
            </Button>
            {g.is_active && (
              <Button size="sm" variant="ghost" onClick={() => setToDeactivate(g)}>
                <UserX className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      />

      <ConfirmDialog
        open={!!toDeactivate}
        title="Desativar responsável"
        description={`Desativar ${toDeactivate?.full_name || 'este responsável'}? O cadastro é mantido, apenas marcado como inativo.`}
        confirmLabel="Desativar"
        destructive
        onConfirm={() => toDeactivate && deactivate.mutate(toDeactivate.id)}
        onCancel={() => setToDeactivate(null)}
      />
    </>
  )
}
