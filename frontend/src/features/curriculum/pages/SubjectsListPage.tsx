import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Search, Plus, Pencil, Trash2 } from 'lucide-react'
import { useCrud } from '@/hooks/useCrud'
import type { Subject } from '@/types/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { ScopeBar, useScope } from '@/components/ui/ScopeBar'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { getErrorMessage } from '@/utils/api-helpers'
import { ROUTES } from '@/app/routes/paths'

export default function SubjectsListPage() {
  const navigate = useNavigate()
  const scope = useScope()
  const { list, delete_ } = useCrud<Subject>('subjects/', 'subjects')
  const [term, setTerm] = useState('')
  const [toDelete, setToDelete] = useState<Subject | null>(null)

  const q = term.toLowerCase()
  const rows = (list.data?.results ?? []).filter(
    (s: Subject) =>
      s.name?.toLowerCase().includes(q) ||
      s.bncc_code?.toLowerCase().includes(q) ||
      s.area_of_knowledge?.toLowerCase().includes(q)
  )

  const confirmDelete = async () => {
    if (!toDelete) {
      return
    }
    try {
      await delete_.mutateAsync(toDelete.id)
      toast.success('Disciplina excluída.')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setToDelete(null)
    }
  }

  const columns: Column<Subject>[] = [
    {
      key: 'bncc',
      header: 'BNCC',
      mono: true,
      align: 'right',
      width: '120px',
      render: (s) => s.bncc_code || '—',
    },
    { key: 'name', header: 'Nome', render: (s) => s.name },
    { key: 'area', header: 'Área do conhecimento', render: (s) => s.area_of_knowledge },
    {
      key: 'min',
      header: 'Nota mínima',
      align: 'right',
      mono: true,
      render: (s) => s.minimum_passing_grade ?? '—',
    },
  ]

  if (list.isError) {
    return (
      <>
        <PageHeader title="Currículo e matrizes" />
        <EmptyState
          title="Erro ao carregar"
          description="Não foi possível carregar as disciplinas."
        />
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Rede' }, { label: 'Currículo' }]}
        title="Currículo e matrizes"
        tabs={[
          { label: 'Disciplinas', to: ROUTES.curriculum },
          { label: 'Matrizes curriculares', to: ROUTES.curriculumMatrices },
        ]}
        activeTab={ROUTES.curriculum}
        actions={
          <Button
            variant="primary"
            iconLeft={<Plus className="h-4 w-4" />}
            onClick={() => navigate(ROUTES.subjectNew)}
          >
            Nova disciplina
          </Button>
        }
      />
      <ScopeBar level={scope.level} title={scope.title} />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar por nome, código BNCC ou área…"
          className="h-control w-full rounded border border-line-strong bg-white pl-9 pr-3 text-base"
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(s) => s.id}
        isLoading={list.isLoading}
        onRowClick={(s) => navigate(ROUTES.subjectEdit(s.id))}
        empty={
          <EmptyState
            title="Nenhuma disciplina encontrada"
            description={term ? 'Ajuste a busca.' : 'Cadastre as disciplinas da base municipal.'}
          />
        }
        rowActions={(s) => (
          <>
            <Button size="sm" variant="ghost" onClick={() => navigate(ROUTES.subjectEdit(s.id))}>
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
        title="Excluir disciplina"
        description={`Excluir ${toDelete?.name || 'esta disciplina'}?`}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
        confirmLabel="Excluir"
        destructive
      />
    </>
  )
}
