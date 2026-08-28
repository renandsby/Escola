import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { apiGet } from '@/utils/api-helpers'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { DOCUMENT_TYPE, labelOf } from '@/components/ui/statusMaps'
import { ROUTES } from '@/app/routes/paths'

interface DocumentDetail {
  file_name: string
  document_type: string
  uploaded_by?: string
  uploaded_by_name?: string
  created_at: string
  description?: string
  file?: string
}

export default function DocumentFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['document', id],
    queryFn: () => apiGet<DocumentDetail>(`documents/${id}/`),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <>
        <PageHeader breadcrumb={[{ label: 'Documentos', to: ROUTES.documents }]} title="Documento" />
        <TableSkeleton rows={4} cols={2} />
      </>
    )
  }

  if (isError || !data) {
    return (
      <>
        <PageHeader breadcrumb={[{ label: 'Documentos', to: ROUTES.documents }]} title="Documento" />
        <EmptyState title="Documento não encontrado" description="O arquivo pode ter sido removido." />
      </>
    )
  }

  const rows: [string, string][] = [
    ['Nome', data.file_name],
    ['Tipo', labelOf(DOCUMENT_TYPE, data.document_type)],
    ['Enviado por', data.uploaded_by_name || data.uploaded_by || '—'],
    ['Data', new Date(data.created_at).toLocaleString('pt-BR')],
  ]

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Documentos', to: ROUTES.documents }, { label: data.file_name }]}
        title={data.file_name}
        actions={
          <>
            {data.file && (
              <Button
                variant="primary"
                iconLeft={<Download className="h-4 w-4" />}
                onClick={() => window.open(data.file, '_blank')}
              >
                Baixar
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate(ROUTES.documents)}>
              Voltar
            </Button>
          </>
        }
      />

      <div className="grid gap-4 rounded-lg border border-line bg-white p-6">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-line-soft pb-2">
              <dt className="text-help text-ink-400">{k}</dt>
              <dd className="text-right text-base text-ink-700">{v}</dd>
            </div>
          ))}
        </dl>
        {data.description && (
          <p className="whitespace-pre-wrap text-base text-ink-700">{data.description}</p>
        )}
      </div>
    </>
  )
}
