import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCrud } from '@/hooks/useCrud'
import { Document } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Plus, Download, Trash2, Eye } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function DocumentsPage() {
  const navigate = useNavigate()
  const { list, delete_ } = useCrud<Document>('documents/', 'documents')
  const [searchTerm, setSearchTerm] = useState('')

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja deletar este documento?')) {
      delete_.mutate(id)
    }
  }

  const filteredData =
    list.data?.results?.filter(
      (doc: Document) =>
        doc.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.document_type?.includes(searchTerm) ||
        doc.student_name?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || []

  if (list.isLoading) {return <div className="p-6">Carregando...</div>}
  if (list.isError) {return <div className="p-6 text-red-600">Erro ao carregar documentos</div>}

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Documentos</h1>
        <Button onClick={() => navigate('/documents/create')}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Documento
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <input
          type="text"
          placeholder="Buscar por nome, tipo ou aluno..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Nome</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Tipo</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Aluno</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Enviado por</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Data</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredData.map((doc: Document) => (
              <tr key={doc.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{doc.file_name}</td>
                <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                  {String(doc.document_type).replace(/_/g, ' ')}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{doc.student_name || '—'}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {doc.uploaded_by_name || '—'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {formatDistanceToNow(new Date(doc.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  {doc.file && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(doc.file, '_blank')}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/documents/${doc.id}`)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(doc.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredData.length === 0 && (
          <div className="p-6 text-center text-gray-500">Nenhum documento encontrado</div>
        )}
      </div>
    </div>
  )
}
