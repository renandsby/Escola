import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Search, Plus, Pencil, Trash2 } from 'lucide-react'
import { useCrud } from '@/hooks/useCrud'
import type { School } from '@/types/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { ScopeBar, useScope } from '@/components/ui/ScopeBar'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { getErrorMessage } from '@/utils/api-helpers'
import { SCHOOL_TYPE } from '@/components/ui/statusMaps'
import { ROUTES } from '@/app/routes/paths'

export default function SchoolsListPage() {
  const navigate = useNavigate()
  const scope = useScope()
  const { list, delete_ } = useCrud<School>('schools/', 'schools')
  const [term, setTerm] = useState('')
  const [toDelete, setToDelete] = useState<School | null>(null)

  const q = term.toLowerCase()
  const rows = (list.data?.results ?? []).filter(
    (s: School) => s.name?.toLowerCase().includes(q) || s.inep_code?.toLowerCase().includes(q)
  )

  const confirmDelete = async () => {
    if (!toDelete) {
      return
    }
    try {
      await delete_.mutateAsync(toDelete.id)
      toast.success('Escola excluída.')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setToDelete(null)
    }
  }

  const columns: Column<School>[] = [
    { key: 'name', header: 'Nome', render: (s) => <span title={s.name}>{s.name}</span> },
    { key: 'inep', header: 'INEP', mono: true, align: 'right', render: (s) => s.inep_code || '—' },
    { key: 'type', header: 'Tipo', render: (s) => SCHOOL_TYPE[s.school_type] || s.school_type },
    { key: 'city', header: 'Cidade', render: (s) => s.address_city || '—' },
  ]

  if (list.isError) {
    return (
      <>
        <PageHeader title="Escolas e salas" />
        <EmptyState title="Erro ao carregar" description="Não foi possível carregar as escolas." />
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Rede' }, { label: 'Escolas' }]}
        title="Escolas e salas"
        actions={
          <Button
            variant="primary"
            iconLeft={<Plus className="h-4 w-4" />}
            onClick={() => navigate(ROUTES.schoolNew)}
          >
            Nova escola
          </Button>
        }
      />
      <ScopeBar
        level={scope.level}
        title={scope.title}
        detail={list.data ? `${list.data.results.length} escola(s)` : undefined}
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar por nome ou código INEP…"
          className="h-control w-full rounded border border-line-strong bg-white pl-9 pr-3 text-base"
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(s) => s.id}
        isLoading={list.isLoading}
        onRowClick={(s) => navigate(ROUTES.schoolEdit(s.id))}
        empty={
          <EmptyState
            title="Nenhuma escola encontrada"
            description={term ? 'Ajuste a busca.' : 'Cadastre a primeira unidade escolar da rede.'}
            actions={
              !term && (
                <Button variant="primary" onClick={() => navigate(ROUTES.schoolNew)}>
                  Nova escola
                </Button>
              )
            }
          />
        }
        rowActions={(s) => (
          <>
            <Button size="sm" variant="ghost" onClick={() => navigate(ROUTES.schoolEdit(s.id))}>
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
        title="Excluir escola"
        description={`Excluir ${toDelete?.name || 'esta escola'}? A unidade é desativada, não apagada.`}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
        confirmLabel="Excluir"
        destructive
      />
    </>
  )
}
