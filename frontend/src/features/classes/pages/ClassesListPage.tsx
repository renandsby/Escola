import { useState } from 'react'
import { toast } from 'sonner'
import { Search, Trash2 } from 'lucide-react'
import { useCrud } from '@/hooks/useCrud'
import type { SchoolClass } from '@/types/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { ScopeBar, useScope } from '@/components/ui/ScopeBar'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { getErrorMessage } from '@/utils/api-helpers'
import { SHIFT } from '@/components/ui/statusMaps'

export default function ClassesListPage() {
  const scope = useScope()
  const { list, delete_ } = useCrud<SchoolClass>('classes/', 'classes')
  const [term, setTerm] = useState('')
  const [toDelete, setToDelete] = useState<SchoolClass | null>(null)

  const q = term.toLowerCase()
  const rows = (list.data?.results ?? []).filter(
    (c: SchoolClass) =>
      c.name?.toLowerCase().includes(q) || c.school_name?.toLowerCase().includes(q)
  )

  const confirmDelete = async () => {
    if (!toDelete) {
      return
    }
    try {
      await delete_.mutateAsync(toDelete.id)
      toast.success('Turma excluída.')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setToDelete(null)
    }
  }

  const columns: Column<SchoolClass>[] = [
    { key: 'name', header: 'Turma', render: (c) => c.name },
    { key: 'shift', header: 'Turno', render: (c) => SHIFT[c.shift] || c.shift },
    {
      key: 'school',
      header: 'Escola',
      render: (c) => <span title={c.school_name}>{c.school_name || '—'}</span>,
    },
    { key: 'count', header: 'Alunos', align: 'right', mono: true, render: (c) => c.student_count ?? 0 },
    {
      key: 'status',
      header: 'Situação',
      render: (c) =>
        c.is_active ? <Badge tone="ok">Ativa</Badge> : <Badge tone="neutral" shape="square">Inativa</Badge>,
    },
  ]

  if (list.isError) {
    return (
      <>
        <PageHeader title="Turmas" />
        <EmptyState title="Erro ao carregar" description="Não foi possível carregar as turmas." />
      </>
    )
  }

  return (
    <>
      <PageHeader breadcrumb={[{ label: 'Vida escolar' }, { label: 'Turmas' }]} title="Turmas" />
      <ScopeBar
        level={scope.level}
        title={scope.title}
        detail={list.data ? `${list.data.count} turma(s)` : undefined}
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar por nome ou escola…"
          className="h-control w-full rounded border border-line-strong bg-white pl-9 pr-3 text-base"
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(c) => c.id}
        isLoading={list.isLoading}
        empty={
          <EmptyState
            title="Nenhuma turma encontrada"
            description={
              term
                ? 'Ajuste a busca.'
                : 'As turmas vêm da carga do Censo. Novas turmas são criadas pela Secretaria.'
            }
          />
        }
        rowActions={(c) => (
          <Button size="sm" variant="ghost" onClick={() => setToDelete(c)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Excluir turma"
        description={`Excluir ${toDelete?.name || 'esta turma'}? A turma é desativada, não apagada.`}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
        confirmLabel="Excluir"
        destructive
      />
    </>
  )
}
