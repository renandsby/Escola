import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Download, Trash2, Eye, Plus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useCrud } from '@/hooks/useCrud'
import type { Document } from '@/types/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { ScopeBar, useScope } from '@/components/ui/ScopeBar'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { DOCUMENT_TYPE, labelOf } from '@/components/ui/statusMaps'
import { useAuthStore } from '@/stores/authStore'
import { DocumentUploadModal } from '@/features/documents/pages/DocumentUploadModal'
import { ROUTES } from '@/app/routes/paths'

const UPLOAD_ROLES = ['sme_admin', 'sme_supervisor', 'school_director', 'school_secretary']

export default function DocumentsPage() {
  const navigate = useNavigate()
  const scope = useScope()
  const role = useAuthStore((s) => s.user?.role) ?? ''
  const { list, delete_ } = useCrud<Document>('documents/', 'documents')
  const [term, setTerm] = useState('')
  const [toDelete, setToDelete] = useState<Document | null>(null)
  const [uploading, setUploading] = useState(false)

  const q = term.toLowerCase()
  const rows =
    list.data?.results?.filter(
      (d: Document) =>
        d.file_name?.toLowerCase().includes(q) ||
        d.document_type?.toLowerCase().includes(q) ||
        d.student_name?.toLowerCase().includes(q)
    ) || []

  const columns: Column<Document>[] = [
    { key: 'name', header: 'Nome', render: (d) => d.file_name },
    {
      key: 'type',
      header: 'Tipo',
      render: (d) => labelOf(DOCUMENT_TYPE, d.document_type),
    },
    { key: 'student', header: 'Aluno', render: (d) => d.student_name || '—' },
    { key: 'by', header: 'Enviado por', render: (d) => d.uploaded_by_name || '—' },
    {
      key: 'date',
      header: 'Enviado',
      align: 'right',
      render: (d) =>
        formatDistanceToNow(new Date(d.created_at), { addSuffix: true, locale: ptBR }),
    },
  ]

  if (list.isError) {
    return (
      <>
        <PageHeader title="Documentos" />
        <EmptyState title="Erro ao carregar" description="Não foi possível carregar os documentos." />
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Documentos' }, { label: 'Arquivos' }]}
        title="Documentos"
        actions={
          UPLOAD_ROLES.includes(role) ? (
            <Button
              variant="primary"
              iconLeft={<Plus className="h-4 w-4" />}
              onClick={() => setUploading(true)}
            >
              Enviar documento
            </Button>
          ) : undefined
        }
      />
      <ScopeBar level={scope.level} title={scope.title} />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar por nome, tipo ou aluno…"
          className="h-control w-full rounded border border-line-strong bg-white pl-9 pr-3 text-base"
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(d) => d.id}
        isLoading={list.isLoading}
        onRowClick={(d) => navigate(ROUTES.documentDetail(d.id))}
        empty={
          <EmptyState
            title="Nenhum documento"
            description={term ? 'Ajuste a busca.' : 'Nada arquivado ainda.'}
          />
        }
        rowActions={(d) => (
          <>
            {d.file && (
              <Button size="sm" variant="ghost" onClick={() => window.open(d.file, '_blank')}>
                <Download className="h-4 w-4" />
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => navigate(ROUTES.documentDetail(d.id))}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setToDelete(d)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Excluir documento"
        description="O arquivo será removido permanentemente."
        onConfirm={() => {
          if (toDelete) {delete_.mutate(toDelete.id)}
          setToDelete(null)
        }}
        onCancel={() => setToDelete(null)}
        confirmLabel="Excluir"
        destructive
      />

      {uploading && <DocumentUploadModal onClose={() => setUploading(false)} />}
    </>
  )
}
