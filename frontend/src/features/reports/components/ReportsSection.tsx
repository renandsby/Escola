import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Panel } from '@/features/dashboard/components/Panel'
import { useCreateExecution, useExecutionPolling } from '../hooks/useReports'
import { downloadExecution } from '../api/reports'
import { ReportCatalogTable } from './ReportCatalogTable'
import { ReportGeneratorDrawer } from './ReportGeneratorDrawer'
import { ReportHistoryTable } from './ReportHistoryTable'
import type { ReportDef, ReportScope } from '../types'

type Props = {
  level: ReportScope
  scopeTitle: string
  schoolId: string | null
  /** incrementa quando o usuário clica em "Exportar painel (PDF)" no cabeçalho */
  exportPanelSignal: number
}

/** Composição do §4.3.9 do plano: catálogo + histórico + drawer + orquestração. */
export function ReportsSection({ level, scopeTitle, schoolId, exportPanelSignal }: Props) {
  const [openReport, setOpenReport] = useState<ReportDef | null>(null)
  const [watchId, setWatchId] = useState<string | null>(null)
  const notified = useRef<Set<string>>(new Set())
  const lastSignal = useRef(exportPanelSignal)

  const create = useCreateExecution()
  const polled = useExecutionPolling(watchId)

  // "Exportar painel (PDF)" (§5) → school_performance_panel com gráficos
  useEffect(() => {
    if (exportPanelSignal === lastSignal.current) {
      return
    }
    lastSignal.current = exportPanelSignal
    create.mutate(
      {
        report_key: 'school_performance_panel',
        parameters: { output_format: 'PDF', include_charts: true, include_school_comparison: true },
      },
      {
        onSuccess: (e) => {
          toast.success('Exportação do painel na fila — você será avisado ao concluir.')
          setWatchId(e.id)
        },
        onError: () => toast.error('Não foi possível iniciar a exportação do painel.'),
      }
    )
  }, [exportPanelSignal])

  useEffect(() => {
    const e = polled.data
    if (!e || notified.current.has(e.id)) {
      return
    }
    if (e.status === 'DONE') {
      notified.current.add(e.id)
      toast.success('Relatório concluído.', {
        action: { label: 'Baixar', onClick: () => downloadExecution(e) },
      })
      setWatchId(null)
    } else if (e.status === 'ERROR') {
      notified.current.add(e.id)
      toast.error('A geração do relatório falhou. Veja a situação no histórico.')
      setWatchId(null)
    }
  }, [polled.data])

  return (
    <>
      <Panel
        id="relatorios"
        title="Relatórios"
        description="Gerados de forma assíncrona, com o escopo do painel. Cada geração fica no histórico e, quando há dado pessoal, em auditoria."
      >
        <ReportCatalogTable level={level} onGenerate={setOpenReport} />
      </Panel>

      <Panel
        title="Histórico de relatórios"
        description="Últimas gerações do seu escopo. O arquivo vale 30 dias."
      >
        <ReportHistoryTable />
      </Panel>

      <ReportGeneratorDrawer
        report={openReport}
        scope={{ level, title: scopeTitle }}
        schoolId={schoolId}
        onClose={() => setOpenReport(null)}
        onQueued={(id) => setWatchId(id)}
      />
    </>
  )
}
