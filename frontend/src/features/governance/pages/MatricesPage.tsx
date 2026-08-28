import { useState } from 'react'
import { Search } from 'lucide-react'
import type { CurriculumMatrix } from '@/types/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { ScopeBar, useScope } from '@/components/ui/ScopeBar'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { ROUTES } from '@/app/routes/paths'
import { useCurriculumMatricesQuery } from '../hooks/useCurriculumMatricesQuery'

export default function MatricesPage() {
  const scope = useScope()
  const matrices = useCurriculumMatricesQuery()
  const [term, setTerm] = useState('')

  const q = term.toLowerCase()
  const rows = (matrices.data?.results ?? []).filter(
    (m) => m.name?.toLowerCase().includes(q) || m.education_stage_name?.toLowerCase().includes(q)
  )

  const columns: Column<CurriculumMatrix>[] = [
    { key: 'name', header: 'Nome', render: (m) => m.name },
    { key: 'stage', header: 'Etapa', render: (m) => m.education_stage_name || '—' },
    {
      key: 'status',
      header: 'Situação',
      render: (m) =>
        m.is_active ? (
          <Badge tone="ok">Ativa</Badge>
        ) : (
          <Badge tone="neutral" shape="square">
            Inativa
          </Badge>
        ),
    },
  ]

  if (matrices.isError) {
    return (
      <>
        <PageHeader title="Currículo" />
        <EmptyState title="Erro ao carregar" description="Não foi possível carregar as matrizes." />
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Rede' }, { label: 'Currículo' }]}
        title="Currículo"
        tabs={[
          { label: 'Disciplinas', to: ROUTES.curriculum },
          { label: 'Matrizes curriculares', to: ROUTES.curriculumMatrices },
        ]}
        activeTab={ROUTES.curriculumMatrices}
      />
      <ScopeBar level={scope.level} title={scope.title} />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar por nome ou etapa…"
          className="h-control w-full rounded border border-line-strong bg-white pl-9 pr-3 text-base"
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(m) => m.id}
        isLoading={matrices.isLoading}
        empty={
          <EmptyState
            title="Nenhuma matriz"
            description={term ? 'Ajuste a busca.' : 'A base curricular municipal ainda não foi definida.'}
          />
        }
      />
    </>
  )
}
