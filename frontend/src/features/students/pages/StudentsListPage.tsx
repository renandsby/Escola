import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Search, Plus, Eye, Pencil, Trash2 } from 'lucide-react'
import { useCrud } from '@/hooks/useCrud'
import type { Student } from '@/types/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { ScopeBar, useScope } from '@/components/ui/ScopeBar'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { getErrorMessage } from '@/utils/api-helpers'
import { ROUTES } from '@/app/routes/paths'

export default function StudentsListPage() {
  const navigate = useNavigate()
  const scope = useScope()
  const [params] = useSearchParams()
  const { list, delete_ } = useCrud<Student>('students/', 'students')
  const [term, setTerm] = useState(params.get('q') ?? '')
  const [toDelete, setToDelete] = useState<Student | null>(null)

  const q = term.toLowerCase()
  const rows = (list.data?.results ?? []).filter(
    (s: Student) =>
      s.full_name?.toLowerCase().includes(q) ||
      s.unique_municipal_id?.toLowerCase().includes(q) ||
      s.mother_name?.toLowerCase().includes(q)
  )

  const confirmDelete = async () => {
    if (!toDelete) {
      return
    }
    try {
      await delete_.mutateAsync(toDelete.id)
      toast.success('Aluno excluído.')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setToDelete(null)
    }
  }

  const columns: Column<Student>[] = [
    {
      key: 'id',
      header: 'ID municipal',
      mono: true,
      align: 'right',
      width: '140px',
      render: (s) => s.unique_municipal_id,
    },
    { key: 'name', header: 'Nome', render: (s) => <span title={s.full_name}>{s.full_name}</span> },
    { key: 'mother', header: 'Nome da mãe', render: (s) => s.mother_name },
    {
      key: 'status',
      header: 'Situação',
      render: (s) =>
        s.is_active ? (
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
        <PageHeader title="Alunos" />
        <EmptyState title="Erro ao carregar" description="Não foi possível carregar os alunos." />
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Pessoas' }, { label: 'Alunos' }]}
        title="Alunos"
        actions={
          <Button
            variant="primary"
            iconLeft={<Plus className="h-4 w-4" />}
            onClick={() => navigate(ROUTES.studentNew)}
          >
            Novo aluno
          </Button>
        }
      />
      <ScopeBar
        level={scope.level}
        title={scope.title}
        detail={list.data ? `${list.data.count} aluno(s)` : undefined}
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar por nome, ID municipal ou nome da mãe…"
          className="h-control w-full rounded border border-line-strong bg-white pl-9 pr-3 text-base"
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(s) => s.id}
        isLoading={list.isLoading}
        onRowClick={(s) => navigate(ROUTES.student(s.id))}
        empty={
          <EmptyState
            title="Nenhum aluno encontrado"
            description={term ? 'Ajuste a busca.' : 'Cadastre o primeiro aluno da rede.'}
          />
        }
        rowActions={(s) => (
          <>
            <Button size="sm" variant="ghost" onClick={() => navigate(ROUTES.student(s.id))}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => navigate(ROUTES.studentEdit(s.id))}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setToDelete(s)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Excluir aluno"
        description={`Excluir ${toDelete?.full_name || 'este aluno'}? O cadastro é desativado, não apagado.`}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
        confirmLabel="Excluir"
        destructive
      />
    </>
  )
}
