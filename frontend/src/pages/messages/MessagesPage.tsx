import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Eye, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useCrud } from '@/hooks/useCrud'
import type { Message } from '@/types/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { ROUTES } from '@/app/routes/paths'

export default function MessagesPage() {
  const navigate = useNavigate()
  const { list, delete_ } = useCrud<Message>('communications/', 'communications')
  const [term, setTerm] = useState('')
  const [toDelete, setToDelete] = useState<Message | null>(null)

  const q = term.toLowerCase()
  const rows =
    list.data?.results?.filter(
      (m: Message) =>
        m.subject?.toLowerCase().includes(q) || m.sender_name?.toLowerCase().includes(q)
    ) || []

  const columns: Column<Message>[] = [
    {
      key: 'status',
      header: 'Status',
      width: '96px',
      render: (m) =>
        m.read ? (
          <Badge tone="neutral" shape="square">
            Lida
          </Badge>
        ) : (
          <Badge tone="brand">Nova</Badge>
        ),
    },
    { key: 'sender', header: 'De', render: (m) => m.sender_name || '—' },
    { key: 'subject', header: 'Assunto', render: (m) => m.subject },
    {
      key: 'date',
      header: 'Recebida',
      align: 'right',
      render: (m) =>
        formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: ptBR }),
    },
  ]

  if (list.isError) {
    return (
      <>
        <PageHeader title="Mensagens" />
        <EmptyState title="Erro ao carregar" description="Não foi possível carregar as mensagens." />
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Comunicação' }, { label: 'Mensagens' }]}
        title="Mensagens"
        actions={
          <Button
            variant="primary"
            iconLeft={<Plus className="h-4 w-4" />}
            onClick={() => navigate(ROUTES.messageNew)}
          >
            Nova mensagem
          </Button>
        }
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar por assunto ou remetente…"
          className="h-control w-full rounded border border-line-strong bg-white pl-9 pr-3 text-base"
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(m) => m.id}
        isLoading={list.isLoading}
        onRowClick={(m) => navigate(ROUTES.message(m.id))}
        empty={
          <EmptyState
            title="Nenhuma mensagem"
            description={term ? 'Ajuste a busca.' : 'A caixa de entrada está vazia.'}
          />
        }
        rowActions={(m) => (
          <>
            <Button size="sm" variant="ghost" onClick={() => navigate(ROUTES.message(m.id))}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setToDelete(m)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Excluir mensagem"
        description="A mensagem será removida permanentemente."
        onConfirm={() => {
          if (toDelete) {delete_.mutate(toDelete.id)}
          setToDelete(null)
        }}
        onCancel={() => setToDelete(null)}
        confirmLabel="Excluir"
        destructive
      />
    </>
  )
}
