import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCrud } from '@/hooks/useCrud'
import { Message } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Plus, Mail, Eye, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function MessagesPage() {
  const navigate = useNavigate()
  const { list, delete_ } = useCrud<Message>('communications/', 'communications')
  const [searchTerm, setSearchTerm] = useState('')

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja deletar esta mensagem?')) {
      delete_.mutate(id)
    }
  }

  const filteredData =
    list.data?.results?.filter(
      (message: Message) =>
        message.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.sender_name?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || []

  if (list.isLoading) {return <div className="p-6">Carregando...</div>}
  if (list.isError) {return <div className="p-6 text-red-600">Erro ao carregar mensagens</div>}

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Mensagens</h1>
        <Button onClick={() => navigate('/messages/create')}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Mensagem
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <input
          type="text"
          placeholder="Buscar por assunto ou remetente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Status</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">De</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Assunto</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Data</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredData.map((message: Message) => (
              <tr
                key={message.id}
                className={`hover:bg-gray-50 ${!message.read ? 'bg-blue-50' : ''}`}
              >
                <td className="px-6 py-4 text-sm">
                  {!message.read ? (
                    <Mail className="w-4 h-4 text-blue-600" />
                  ) : (
                    <span className="text-xs text-gray-500">Lido</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {message.sender_name || '—'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{message.subject}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {formatDistanceToNow(new Date(message.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/messages/${message.id}`)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(message.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredData.length === 0 && (
          <div className="p-6 text-center text-gray-500">Nenhuma mensagem encontrada</div>
        )}
      </div>
    </div>
  )
}
