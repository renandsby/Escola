import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Search, Plus, Pencil, Trash2, UserCog } from 'lucide-react'
import type { TeacherProfile } from '@/types/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { ScopeBar, useScope } from '@/components/ui/ScopeBar'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { getErrorMessage } from '@/utils/api-helpers'
import { ROUTES } from '@/app/routes/paths'
import { deleteTeacher } from '../api/teachersApi'
import { useTeachersQuery } from '../hooks/useTeachersQuery'

export default function TeachersListPage() {
  const navigate = useNavigate()
  const scope = useScope()
  const queryClient = useQueryClient()
  const teachers = useTeachersQuery()
  const [term, setTerm] = useState('')
  const [toDelete, setToDelete] = useState<TeacherProfile | null>(null)

  const remove = useMutation({
    mutationFn: (id: string) => deleteTeacher(id),
    onSuccess: () => {
      toast.success('Professor removido.')
      queryClient.invalidateQueries({ queryKey: ['classes', 'teachers'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
    onSettled: () => setToDelete(null),
  })

  const q = term.toLowerCase()
  const rows = (teachers.data?.results ?? []).filter(
    (t: TeacherProfile) =>
      t.user_name?.toLowerCase().includes(q) ||
      t.registration_number?.toLowerCase().includes(q) ||
      t.cpf?.includes(term) ||
      t.formation_area?.toLowerCase().includes(q)
  )

  const columns: Column<TeacherProfile>[] = [
    {
      key: 'reg',
      header: 'Matrícula',
      mono: true,
      align: 'right',
      width: '120px',
      render: (t) => t.registration_number,
    },
    { key: 'name', header: 'Nome', render: (t) => t.user_name || '—' },
    { key: 'area', header: 'Área de formação', render: (t) => t.formation_area || '—' },
    {
      key: 'status',
      header: 'Situação',
      render: (t) =>
        t.is_active ? <Badge tone="ok">Ativo</Badge> : <Badge tone="neutral" shape="square">Inativo</Badge>,
    },
  ]

  if (teachers.isError) {
    return (
      <>
        <PageHeader title="Professores e alocações" />
        <EmptyState title="Erro ao carregar" description="Não foi possível carregar o quadro docente." />
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Pessoas' }, { label: 'Professores' }]}
        title="Professores e alocações"
        tabs={[
          { label: 'Professores', to: ROUTES.teachers },
          { label: 'Alocações', to: ROUTES.allocations },
        ]}
        activeTab={ROUTES.teachers}
        actions={
          <>
            <Button
              variant="secondary"
              iconLeft={<UserCog className="h-4 w-4" />}
              onClick={() => navigate(ROUTES.allocations)}
            >
              Alocações
            </Button>
            <Button
              variant="primary"
              iconLeft={<Plus className="h-4 w-4" />}
              onClick={() => navigate(ROUTES.teacherNew)}
            >
              Novo professor
            </Button>
          </>
        }
      />
      <ScopeBar level={scope.level} title={scope.title} />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar por nome, matrícula, CPF ou área de formação…"
          className="h-control w-full rounded border border-line-strong bg-white pl-9 pr-3 text-base"
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(t) => t.id}
        isLoading={teachers.isLoading}
        onRowClick={(t) => navigate(ROUTES.teacherEdit(t.id))}
        empty={
          <EmptyState
            title="Nenhum professor cadastrado"
            description={term ? 'Ajuste a busca.' : 'Cadastre o quadro docente da rede.'}
            actions={
              !term && (
                <Button variant="primary" onClick={() => navigate(ROUTES.teacherNew)}>
                  Novo professor
                </Button>
              )
            }
          />
        }
        rowActions={(t) => (
          <>
            <Button size="sm" variant="ghost" onClick={() => navigate(ROUTES.teacherEdit(t.id))}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setToDelete(t)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Remover professor"
        description={`Remover ${toDelete?.user_name || 'este professor'} do quadro? As alocações associadas também deixam de valer.`}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
        confirmLabel="Remover"
        destructive
      />
    </>
  )
}
