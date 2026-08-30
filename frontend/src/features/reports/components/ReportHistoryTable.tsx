import { toast } from 'sonner'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { labelOf, REPORT_STATUS } from '@/components/ui/statusMaps'
import type { BadgeProps } from '@/components/ui/Badge'
import { resolveError } from '@/services/errorMessages'
import { useReportCatalog, useExecutions } from '../hooks/useReports'
import { downloadExecution } from '../api/reports'
import type { ReportExecution } from '../types'

const dt = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export function ReportHistoryTable() {
  const { data, isLoading } = useExecutions()
  const { data: catalog } = useReportCatalog()
  const nameOf = (key: string) => catalog?.find((d) => d.key === key)?.name ?? key

  const download = async (e: ReportExecution) => {
    try {
      await downloadExecution(e)
    } catch {
      toast.error('Não foi possível baixar. O link pode ter expirado — gere novamente.')
    }
  }

  const columns: Column<ReportExecution>[] = [
    {
      key: 'report',
      header: 'Relatório',
      render: (e) => (
        <div>
          <p className="text-base text-ink-900">{nameOf(e.report_key)}</p>
          <p className="font-mono text-help text-ink-400">
            {e.scope_title} · {e.output_format}
          </p>
        </div>
      ),
    },
    { key: 'by', header: 'Solicitado por', render: (e) => e.requested_by_name || '—' },
    {
      key: 'when',
      header: 'Quando',
      mono: true,
      width: '120px',
      render: (e) => dt(e.created_at),
    },
    {
      key: 'size',
      header: 'Linhas',
      align: 'right',
      mono: true,
      width: '90px',
      render: (e) => (e.row_count ?? '—'),
    },
    {
      key: 'status',
      header: 'Situação',
      width: '150px',
      render: (e) => {
        const def = REPORT_STATUS[e.status]
        return (
          <div className="flex flex-col gap-0.5">
            <Badge tone={(def?.tone ?? 'neutral') as BadgeProps['tone']} shape={def?.shape}>
              {labelOf(REPORT_STATUS, e.status)}
            </Badge>
            {e.status === 'ERROR' && e.error_code && (
              <span className="font-mono text-[10.5px] text-danger-fg/80">
                {resolveError(e.error_code).title}
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      width: '120px',
      render: (e) =>
        e.status === 'DONE' && !e.is_expired ? (
          <Button size="sm" variant="secondary" onClick={() => download(e)}>
            Baixar
          </Button>
        ) : e.status === 'DONE' && e.is_expired ? (
          <span className="text-help text-ink-400">expirado</span>
        ) : null,
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={data?.results ?? []}
      rowKey={(e) => e.id}
      isLoading={isLoading}
      empty={
        <EmptyState
          title="Nenhum relatório gerado ainda"
          description="Use o catálogo acima para gerar o primeiro relatório do seu escopo."
        />
      }
      pagination={
        data
          ? {
              page: 1,
              pageSize: 20,
              total: data.count,
              onPageChange: () => {},
            }
          : undefined
      }
    />
  )
}
