import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { apiGet } from '@/utils/api-helpers'
import { ArrowLeft, Download } from 'lucide-react'

export default function DocumentFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()

  const { data, isLoading } = useQuery({
    queryKey: ['document', id],
    queryFn: () => apiGet(`documents/${id}/`),
  })

  const document = data as any

  if (isLoading) {return <div className="p-6">Carregando...</div>}

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/documents')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Detalhes do Documento</h1>
      </div>

      {document && (
        <div className="bg-white rounded-lg shadow p-8 space-y-6 max-w-2xl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome</label>
              <p className="text-gray-900 mt-1">{document.file_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tipo</label>
              <p className="text-gray-900 mt-1 capitalize">
                {document.document_type?.replace('_', ' ')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Enviado por</label>
              <p className="text-gray-900 mt-1">{document.uploaded_by || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Data</label>
              <p className="text-gray-900 mt-1">
                {new Date(document.created_at).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>

          {document.description && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
              <p className="text-gray-900">{document.description}</p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            {document.file && (
              <Button onClick={() => window.open(document.file, '_blank')}>
                <Download className="w-4 h-4 mr-2" />
                Baixar
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate('/documents')}>
              Voltar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
