import { useState } from 'react'
import { toast } from 'sonner'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/types/api'
import { downloadReport } from '../api/reportsApi'
import { Panel } from './Panel'
import type { ScopeLevel } from '../types'

type CatalogRow = {
  key: string
  name: string
  description: string
  scopes: ScopeLevel[] | 'all'
  formats: string[]
  roles: UserRole[]
  /** relatório síncrono já disponível → função de download; senão fica desabilitado */
  run?: (schoolId: string | null) => Promise<void>
}

const SME: UserRole[] = ['sme_admin', 'sme_supervisor']
const SCHOOL: UserRole[] = ['school_director', 'school_secretary']

const CATALOG: CatalogRow[] = [
  {
    key: 'class_report_card',
    name: 'Boletim consolidado por turma',
    description: 'Notas, faltas e situação por aluno, com assinatura da direção.',
    scopes: 'all',
    formats: ['PDF'],
    roles: [...SME, ...SCHOOL, 'teacher'],
  },
  {
    key: 'final_results_record',
    name: 'Ata de resultados finais',
    description: 'Documento oficial de aprovação e reprovação ao fim do ano letivo.',
    scopes: 'all',
    formats: ['PDF'],
    roles: [...SME, ...SCHOOL],
  },
  {
    key: 'attendance_bolsa_familia',
    name: 'Frequência mensal — Programa Bolsa Família',
    description: 'Layout exigido pelo MEC/MDS para o acompanhamento de condicionalidades.',
    scopes: ['network', 'school'],
    formats: ['PDF', 'CSV'],
    roles: [...SME, ...SCHOOL],
  },
  {
    key: 'students_below_minimum',
    name: 'Alunos abaixo de 75% de frequência',
    description: 'Lista nominal com escola, turma, percentual e último contato registrado.',
    scopes: 'all',
    formats: ['XLSX', 'PDF'],
    roles: [...SME, ...SCHOOL],
  },
  {
    key: 'educacenso_export',
    name: 'Exportação Educacenso',
    description: 'Arquivo no layout do INEP com validação prévia de campos obrigatórios.',
    scopes: ['network'],
    formats: ['CSV'],
    roles: SME,
    run: () => downloadReport('/reports/educacenso-export/', 'educacenso_export.csv'),
  },
  {
    key: 'school_performance_panel',
    name: 'Painel de rendimento por escola',
    description: 'Este painel em PDF, com os gráficos e o comparativo entre escolas.',
    scopes: ['network'],
    formats: ['PDF', 'XLSX'],
    roles: SME,
  },
  {
    key: 'enrollment_movement',
    name: 'Movimentação de matrículas e transferências',
    description: 'Entradas, saídas, evasão e tempo de tramitação por escola.',
    scopes: ['network', 'school'],
    formats: ['XLSX'],
    roles: [...SME, ...SCHOOL],
  },
  {
    key: 'grades_consolidated',
    name: 'Rendimento consolidado (notas)',
    description: 'Planilha de notas por aluno e disciplina da escola selecionada.',
    scopes: ['school'],
    formats: ['XLSX', 'CSV'],
    roles: [...SME, ...SCHOOL],
    run: (schoolId) =>
      downloadReport(
        '/reports/relatorio_excel/',
        'relatorio_notas.xlsx',
        schoolId ? { school: schoolId } : undefined
      ),
  },
  {
    key: 'teacher_allocation',
    name: 'Quadro de lotação de professores',
    description: 'Alocações por escola, disciplina e turno, com carga horária e conflitos.',
    scopes: ['network', 'school'],
    formats: ['XLSX'],
    roles: [...SME, ...SCHOOL],
  },
]

export function ReportCatalog({
  level,
  schoolId,
}: {
  level: ScopeLevel
  schoolId: string | null
}) {
  const role = useAuthStore((s) => s.user?.role)
  const [running, setRunning] = useState<string | null>(null)

  const rows = CATALOG.filter(
    (r) =>
      (!role || r.roles.includes(role)) &&
      (r.scopes === 'all' || r.scopes.includes(level))
  )

  const handleRun = async (row: CatalogRow) => {
    if (!row.run) {return}
    setRunning(row.key)
    try {
      await row.run(schoolId)
      toast.success('Relatório gerado.')
    } catch {
      toast.error('Não foi possível gerar o relatório.')
    } finally {
      setRunning(null)
    }
  }

  const columns: Column<CatalogRow>[] = [
    {
      key: 'name',
      header: 'Relatório',
      render: (r) => (
        <div>
          <p className="text-base font-semibold text-ink-900">{r.name}</p>
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
      render: (r) =>
        r.run ? (
          <Button size="sm" variant="secondary" loading={running === r.key} onClick={() => handleRun(r)}>
            Gerar
          </Button>
        ) : (
          <Button size="sm" variant="secondary" disabled title="Disponível na próxima versão">
            Gerar
          </Button>
        ),
    },
  ]

  return (
    <Panel
      id="relatorios"
      title="Relatórios"
      description="Gerados com o escopo e os filtros ativos do painel. O que você vê segue o seu perfil de acesso."
    >
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.key} />
    </Panel>
  )
}
