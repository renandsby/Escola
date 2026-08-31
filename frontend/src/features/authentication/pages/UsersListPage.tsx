import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Search, Pencil, Power } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatCPF } from '@/utils/formatting'
import { Select } from '@/components/ui/Field'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { USER_ROLE, labelOf } from '@/components/ui/statusMaps'
import { ROUTES } from '@/app/routes/paths'
import { fetchUsers, setUserActive, type NetworkUser } from '../api/usersApi'
import { USER_ROLE_OPTIONS } from '../schemas/userSchema'

export default function UsersListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [term, setTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [toToggle, setToToggle] = useState<NetworkUser | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['users', 'list'],
    queryFn: () => fetchUsers({ page_size: 200 }),
  })

  const rows = useMemo(() => {
    const q = term.toLowerCase()
    return (data?.results ?? []).filter((u) => {
      const matchesText =
        !q ||
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.cpf ?? '').replace(/\D/g, '').includes(q.replace(/\D/g, ''))
      const matchesRole = !roleFilter || u.role === roleFilter
      return matchesText && matchesRole
    })
  }, [data, term, roleFilter])

  const columns: Column<NetworkUser>[] = [
    {
      key: 'name',
      header: 'Nome',
      render: (u) => `${u.first_name} ${u.last_name}`.trim() || u.username,
    },
    { key: 'cpf', header: 'CPF', mono: true, align: 'right', render: (u) => formatCPF(u.cpf ?? '') || '—' },
    { key: 'email', header: 'E-mail', render: (u) => u.email },
    { key: 'role', header: 'Papel', render: (u) => labelOf(USER_ROLE, u.role) },
    { key: 'school', header: 'Escola', render: (u) => u.school_name || '—' },
    {
      key: 'status',
      header: 'Situação',
      render: (u) =>
        u.is_active ? (
          <Badge tone="ok">Ativo</Badge>
        ) : (
          <Badge tone="neutral" shape="square">
            Inativo
          </Badge>
        ),
    },
  ]

  async function confirmToggle() {
    if (!toToggle) {return}
    try {
      await setUserActive(toToggle.id, !toToggle.is_active)
      toast.success(toToggle.is_active ? 'Usuário desativado.' : 'Usuário reativado.')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    } catch {
      toast.error('Não foi possível alterar a situação do usuário.')
    } finally {
      setToToggle(null)
    }
  }

  if (isError) {
    return (
      <>
        <PageHeader title="Usuários da Rede" />
        <EmptyState title="Erro ao carregar" description="Não foi possível carregar os usuários." />
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Administração' }, { label: 'Usuários da Rede' }]}
        title="Usuários da Rede"
        meta="Diretores, secretários, supervisores e técnicos da Secretaria."
        actions={
          <Button
            variant="primary"
            iconLeft={<Plus className="h-4 w-4" />}
            onClick={() => navigate(ROUTES.userNew)}
          >
            Novo usuário
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar por nome, e-mail ou CPF…"
            className="h-control w-full rounded border border-line-strong bg-white pl-9 pr-3 text-base"
          />
        </div>
        <Select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="sm:max-w-[220px]"
        >
          <option value="">Todos os papéis</option>
          {USER_ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(u) => u.id}
        isLoading={isLoading}
        empty={<EmptyState title="Nenhum usuário" description="Cadastre o primeiro usuário da rede." />}
        rowActions={(u) => (
          <>
            <Button size="sm" variant="ghost" onClick={() => navigate(ROUTES.userEdit(u.id))}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setToToggle(u)}>
              <Power className="h-4 w-4" />
            </Button>
          </>
        )}
      />

      <ConfirmDialog
        open={!!toToggle}
        title={toToggle?.is_active ? 'Desativar usuário' : 'Reativar usuário'}
        description={
          toToggle?.is_active
            ? `${toToggle?.first_name} perderá o acesso imediatamente — as sessões abertas são invalidadas.`
            : `${toToggle?.first_name} poderá acessar o sistema novamente.`
        }
        confirmLabel={toToggle?.is_active ? 'Desativar' : 'Reativar'}
        destructive={!!toToggle?.is_active}
        onConfirm={confirmToggle}
        onCancel={() => setToToggle(null)}
      />
    </>
  )
}
