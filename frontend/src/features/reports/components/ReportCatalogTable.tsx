import { DataTable, type Column } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { useReportCatalog } from '../hooks/useReports'
import type { ReportDef, ReportScope } from '../types'

export function ReportCatalogTable({
  level,
  onGenerate,
}: {
  level: ReportScope
  onGenerate: (report: ReportDef) => void
}) {
  const { data, isLoading } = useReportCatalog()
  const rows = (data ?? []).filter((d) => d.scopes.includes(level))

  const columns: Column<ReportDef>[] = [
    {
      key: 'name',
      header: 'Relatório',
      render: (r) => (
        <div>
          <p className="flex items-center gap-2 text-base font-semibold text-ink-900">
            {r.name}
            {r.contains_personal_data && (
              <Badge tone="warn" shape="square">
                Dado pessoal
              </Badge>
            )}
          </p>
          <p className="text-help text-ink-500">{r.description}</p>
        </div>
      ),
    },
    {
      key: 'formats',
      header: 'Formatos',
      width: '150px',
      render: (r) => (
        <div className="flex flex-wrap gap-1.5">
          {r.formats.map((f) => (
            <span
              key={f}
              className="rounded-pill border border-line px-2 py-0.5 font-mono text-[11.5px]"
            >
              {f}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      width: '120px',
      render: (r) => (
        <Button size="sm" variant="secondary" onClick={() => onGenerate(r)}>
          Gerar
        </Button>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.key}
      isLoading={isLoading}
      empty={
        <EmptyState
          title="Nenhum relatório neste escopo"
          description="Ajuste o escopo (rede / escola) para ver os relatórios disponíveis."
        />
      }
    />
  )
}
