import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Pencil, Plus, Download, FileDown, QrCode } from 'lucide-react'
import { toast } from 'sonner'
import {
  downloadBoletimPdf,
  downloadCarteirinhaPdf,
  downloadHistoricoPdf,
} from '@/features/reports/api/officialDocs'
import { apiGet } from '@/utils/api-helpers'
import type {
  Student,
  Grade,
  Attendance,
  PaginatedResponse,
  Document as Doc,
} from '@/types/api'
import { ATTENDANCE_STATUS_LABELS } from '@/types/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { ScopeBar, useScope } from '@/components/ui/ScopeBar'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { DOCUMENT_TYPE, GENDER, RACE_COLOR, labelOf } from '@/components/ui/statusMaps'
import { ROUTES } from '@/app/routes/paths'
import { useAuthStore } from '@/stores/authStore'
import { DocumentUploadModal } from '@/features/documents/pages/DocumentUploadModal'
import { PrivacyConsentSection } from '../components/PrivacyConsentSection'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 rounded-lg border border-line bg-white p-6">
      <h2 className="text-section text-ink-900">{title}</h2>
      {children}
    </section>
  )
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string
  value: React.ReactNode
  tone?: 'brand' | 'ok' | 'warn'
}) {
  const color =
    tone === 'ok' ? 'text-ok-fg' : tone === 'warn' ? 'text-warn-fg' : tone === 'brand' ? 'text-brand-700' : 'text-ink-900'
  return (
    <div className="grid gap-1 rounded-lg border border-line bg-white p-4">
      <p className="text-help text-ink-400">{label}</p>
      <p className={`text-lg font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  )
}

const DOC_UPLOAD_ROLES = ['sme_admin', 'sme_supervisor', 'school_director', 'school_secretary']

export default function StudentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const scope = useScope()
  const role = useAuthStore((s) => s.user?.role) ?? ''
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [emitting, setEmitting] = useState<'boletim' | 'carteirinha' | 'historico' | null>(null)

  const DOC_DOWNLOADERS = {
    boletim: downloadBoletimPdf,
    carteirinha: downloadCarteirinhaPdf,
    historico: downloadHistoricoPdf,
  } as const

  async function emitirDoc(kind: 'boletim' | 'carteirinha' | 'historico', studentId: string) {
    setEmitting(kind)
    try {
      await DOC_DOWNLOADERS[kind](studentId)
    } catch {
      toast.error(`Não foi possível emitir o documento (${kind}).`)
    } finally {
      setEmitting(null)
    }
  }

  const student = useQuery({
    queryKey: ['student', id],
    queryFn: () => apiGet<Student>(`students/${id}/`),
    enabled: !!id,
  })
  const documents = useQuery({
    queryKey: ['documents', 'student', id],
    queryFn: () => apiGet<PaginatedResponse<Doc>>(`documents/?student=${id}`),
    enabled: !!id,
  })
  const grades = useQuery({
    queryKey: ['grades', id],
    queryFn: () => apiGet<PaginatedResponse<Grade>>(`grades/?student=${id}`),
    enabled: !!id,
  })
  const attendance = useQuery({
    queryKey: ['attendance', id],
    queryFn: () => apiGet<PaginatedResponse<Attendance>>(`attendance/?student=${id}`),
    enabled: !!id,
  })

  if (student.isLoading) {
    return (
      <>
        <PageHeader breadcrumb={[{ label: 'Alunos', to: ROUTES.students }]} title="Ficha do aluno" />
        <TableSkeleton rows={6} cols={2} />
      </>
    )
  }

  if (student.isError || !student.data) {
    return (
      <>
        <PageHeader breadcrumb={[{ label: 'Alunos', to: ROUTES.students }]} title="Ficha do aluno" />
        <EmptyState title="Erro ao carregar" description="Não foi possível carregar a ficha do aluno." />
      </>
    )
  }

  const data = student.data
  const gradesList = grades.data?.results || []
  const attendanceList = attendance.data?.results || []

  const totalClasses = attendanceList.length
  const presentDays = attendanceList.filter((a) => a.status === 'PRESENT').length
  const absentDays = attendanceList.filter((a) => a.status === 'ABSENT').length
  const excusedDays = attendanceList.filter((a) => a.status === 'EXCUSED_ABSENCE').length
  const attendancePercent = totalClasses > 0 ? ((presentDays / totalClasses) * 100).toFixed(1) : '—'

  const avgGrade =
    gradesList.length > 0
      ? (
          gradesList.reduce((sum, g) => sum + Number(g.effective_score ?? g.score ?? 0), 0) /
          gradesList.length
        ).toFixed(1)
      : '—'

  const gradesChartData = gradesList.map((g) => ({
    subject: g.subject_name || '—',
    nota: Number(g.effective_score ?? g.score ?? 0),
  }))

  const frequencyData = [
    { name: ATTENDANCE_STATUS_LABELS.PRESENT, value: presentDays },
    { name: ATTENDANCE_STATUS_LABELS.ABSENT, value: absentDays },
    { name: ATTENDANCE_STATUS_LABELS.EXCUSED_ABSENCE, value: excusedDays },
  ]

  const gradeColumns: Column<Grade>[] = [
    { key: 'subject', header: 'Disciplina', render: (g) => g.subject_name || '—' },
    { key: 'period', header: 'Período', render: (g) => g.academic_period_name || '—' },
    { key: 'score', header: 'Nota', align: 'right', mono: true, render: (g) => g.score ?? '—' },
    {
      key: 'recovery',
      header: 'Recuperação',
      align: 'right',
      mono: true,
      render: (g) => g.recovery_score ?? '—',
    },
    {
      key: 'effective',
      header: 'Nota efetiva',
      align: 'right',
      mono: true,
      render: (g) => g.effective_score ?? g.score ?? '—',
    },
  ]

  const fichaRows: [string, React.ReactNode][] = [
    ['ID municipal', <span className="font-mono tabular-nums">{data.unique_municipal_id}</span>],
    ['CPF', data.cpf ? <span className="font-mono tabular-nums">{data.cpf}</span> : '—'],
    ['Código INEP', data.inep_id ? <span className="font-mono tabular-nums">{data.inep_id}</span> : '—'],
    ['Data de nascimento', data.birth_date + (data.age ? ` · ${data.age} anos` : '')],
    ['Gênero', labelOf(GENDER, data.gender)],
    ['Raça / cor', labelOf(RACE_COLOR, data.race_color)],
    ['Nome da mãe', data.mother_name],
    ['Nome do pai', data.father_name || '—'],
    [
      'AEE',
      data.has_special_needs ? (
        <Badge tone="qual" shape="diamond">
          Público-alvo da educação especial
        </Badge>
      ) : (
        '—'
      ),
    ],
  ]

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Alunos', to: ROUTES.students }, { label: data.full_name }]}
        title={data.social_name || data.full_name}
        meta={
          <>
            <span className="font-mono tabular-nums">{data.unique_municipal_id}</span>
            {data.is_active ? (
              <Badge tone="ok">Ativo</Badge>
            ) : (
              <Badge tone="neutral" shape="square">
                Inativo
              </Badge>
            )}
          </>
        }
        actions={
          <>
            <Button
              variant="secondary"
              iconLeft={<FileDown className="h-4 w-4" />}
              loading={emitting === 'boletim'}
              onClick={() => emitirDoc('boletim', data.id)}
            >
              Emitir Boletim
            </Button>
            <Button
              variant="secondary"
              iconLeft={<QrCode className="h-4 w-4" />}
              loading={emitting === 'carteirinha'}
              onClick={() => emitirDoc('carteirinha', data.id)}
            >
              Emitir Carteirinha
            </Button>
            <Button
              variant="secondary"
              iconLeft={<FileDown className="h-4 w-4" />}
              loading={emitting === 'historico'}
              onClick={() => emitirDoc('historico', data.id)}
            >
              Emitir Histórico
            </Button>
            <Button
              variant="primary"
              iconLeft={<Pencil className="h-4 w-4" />}
              onClick={() => navigate(ROUTES.studentEdit(data.id))}
            >
              Editar
            </Button>
          </>
        }
      />
      <ScopeBar level={scope.level} title={scope.title} detail={data.full_name} />

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Média geral" value={avgGrade} tone="brand" />
        <Metric
          label="Frequência"
          value={attendancePercent === '—' ? '—' : `${attendancePercent}%`}
          tone="ok"
        />
        <Metric label="Faltas" value={absentDays} tone="warn" />
      </div>

      <Card title="Ficha cadastral">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {fichaRows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-line-soft pb-2">
              <dt className="text-help text-ink-400">{k}</dt>
              <dd className="text-right text-base text-ink-700">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card title="Notas por disciplina">
        {gradesList.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={gradesChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="subject" tick={{ fontSize: 12, fill: 'var(--chart-axis)' }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 12, fill: 'var(--chart-axis)' }} />
                <Tooltip />
                <Bar dataKey="nota" fill="var(--chart-brand)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <DataTable
              columns={gradeColumns}
              rows={gradesList}
              rowKey={(g) => g.id}
            />
          </>
        ) : (
          <EmptyState title="Sem notas registradas" description="Nada lançado no diário para este aluno." />
        )}
      </Card>

      <Card title="Resumo de frequência">
        {totalClasses > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={frequencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--chart-axis)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--chart-axis)' }} />
                <Tooltip />
                <Bar dataKey="value" fill="var(--chart-brand)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="grid gap-3">
              <Metric label={ATTENDANCE_STATUS_LABELS.PRESENT} value={presentDays} tone="ok" />
              <Metric label={ATTENDANCE_STATUS_LABELS.ABSENT} value={absentDays} tone="warn" />
              <Metric label={ATTENDANCE_STATUS_LABELS.EXCUSED_ABSENCE} value={excusedDays} />
            </div>
          </div>
        ) : (
          <EmptyState title="Sem frequência registrada" description="Nenhuma aula lançada para este aluno." />
        )}
      </Card>

      <section className="grid gap-4 rounded-lg border border-line bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-section text-ink-900">Documentos</h2>
          {DOC_UPLOAD_ROLES.includes(role) && (
            <Button
              size="sm"
              variant="secondary"
              iconLeft={<Plus className="h-4 w-4" />}
              onClick={() => setUploadingDoc(true)}
            >
              Enviar documento
            </Button>
          )}
        </div>
        {(documents.data?.results ?? []).length === 0 ? (
          <EmptyState title="Sem documentos" description="Nada arquivado para este aluno." />
        ) : (
          <ul className="grid gap-2">
            {documents.data?.results.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-4 border-b border-line-soft pb-2 last:border-0 last:pb-0"
              >
                <span className="text-base text-ink-700">
                  {doc.file_name}
                  <span className="ml-2 text-help text-ink-400">
                    {labelOf(DOCUMENT_TYPE, String(doc.document_type))}
                  </span>
                </span>
                {doc.file && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(doc.file, '_blank')}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <PrivacyConsentSection studentId={data.id} studentName={data.full_name} />

      {uploadingDoc && (
        <DocumentUploadModal
          studentId={data.id}
          studentName={data.full_name}
          onClose={() => setUploadingDoc(false)}
        />
      )}
    </>
  )
}
