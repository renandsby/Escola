import { useNavigate } from 'react-router-dom'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { labelOf, DIARY_COMPLETENESS_STATUS } from '@/components/ui/statusMaps'
import type { BadgeProps } from '@/components/ui/Badge'
import { Panel } from './Panel'
import type { CompletenessRow, DiaryCompleteness } from '../types'

function StatusBadge({ status }: { status: string }) {
  const def = DIARY_COMPLETENESS_STATUS[status]
  return (
    <Badge tone={(def?.tone ?? 'neutral') as BadgeProps['tone']} shape={def?.shape}>
      {labelOf(DIARY_COMPLETENESS_STATUS, status)}
    </Badge>
  )
}

function Progress({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="font-mono text-help tabular-nums text-ink-400">—</span>
  }
  const tone = value < 40 ? 'bg-danger-base' : value < 90 ? 'bg-warn-base' : 'bg-brand-600'
  return (
    <div className="flex items-center gap-2">
      <span className="h-2 flex-1 rounded-[3px] bg-line-soft">
        <span className={`block h-2 rounded-[3px] ${tone}`} style={{ width: `${value}%` }} />
      </span>
      <span className="w-9 text-right font-mono text-sm tabular-nums">{value}%</span>
    </div>
  )
}

export function DiaryCompletenessTable({ data }: { data: DiaryCompleteness }) {
  const navigate = useNavigate()
  const bySchool = data.group_by === 'school'

  const schoolCols: Column<CompletenessRow>[] = [
    { key: 'name', header: 'Escola', render: (r) => r.name },
    {
      key: 'inep',
      header: 'INEP',
      align: 'right',
      mono: true,
      width: '104px',
      render: (r) => r.inep || '—',
    },
    { key: 'classes', header: 'Turmas', align: 'right', mono: true, width: '80px', render: (r) => r.classes ?? '—' },
    { key: 'grades', header: 'Notas lançadas', width: '230px', render: (r) => <Progress value={r.grades_launched_pct} /> },
    {
      key: 'att',
      header: 'Freq. média',
      align: 'right',
      mono: true,
      width: '104px',
      render: (r) => (r.average_attendance === null ? '—' : `${r.average_attendance}%`),
    },
    { key: 'status', header: 'Situação', width: '150px', render: (r) => <StatusBadge status={r.status} /> },
  ]

  const classCols: Column<CompletenessRow>[] = [
    { key: 'name', header: 'Turma', render: (r) => r.name },
    { key: 'regent', header: 'Regente', render: (r) => r.regent || '—' },
    { key: 'students', header: 'Alunos', align: 'right', mono: true, width: '84px', render: (r) => r.students ?? '—' },
    { key: 'grades', header: 'Notas lançadas', width: '210px', render: (r) => <Progress value={r.grades_launched_pct} /> },
    { key: 'status', header: 'Situação', width: '150px', render: (r) => <StatusBadge status={r.status} /> },
  ]

  const deadlineTxt = data.deadline
    ? `Prazo: ${new Date(data.deadline).toLocaleDateString('pt-BR')}.`
    : ''

  return (
    <Panel
      id="completude"
      title={
        bySchool
          ? 'Completude do diário por escola'
          : 'Completude do diário por turma'
      }
      description={`${bySchool ? 'Escolas mais atrasadas primeiro. ' : ''}${deadlineTxt}`}
      right={
        <button
          type="button"
          className="text-sm font-semibold text-brand-600 hover:text-brand-700"
          onClick={() => navigate(bySchool ? '/escolas' : '/turmas')}
        >
          {bySchool ? `Ver todas as ${data.total} escolas` : `Ver as ${data.total} turmas`}
        </button>
      }
    >
      {data.rows.length === 0 ? (
        <div className="p-[18px]">
          <EmptyState title="Nada a mostrar" description="Sem turmas no ano letivo ativo." />
        </div>
      ) : (
        <DataTable
          columns={bySchool ? schoolCols : classCols}
          rows={data.rows}
          rowKey={(r) => r.id}
          onRowClick={(r) => navigate(r.link)}
        />
      )}
    </Panel>
  )
}
