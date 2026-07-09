import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Document } from '@/types/api'
import { Button } from '@/components/ui/button'
import { apiGet, apiPost, apiPut } from '@/utils/api-helpers'
import { ArrowLeft } from 'lucide-react'

const documentSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  document_type: z.string().min(1, 'Tipo de documento é obrigatório'),
  description: z.string().optional(),
  student: z.number().optional(),
  file_url: z.string().url().optional(),
})

type DocumentFormData = z.infer<typeof documentSchema>

export default function DocumentFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [loading, setLoading] = useState(!!id)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
  })

  useEffect(() => {
    if (id) {
      apiGet(`documents/${id}/`)
        .then((data: any) => {
          reset({
            name: data.name,
            document_type: data.document_type,
            description: data.description || '',
            file_url: data.file_url || '',
          })
          setLoading(false)
        })
        .catch(() => {
          setLoading(false)
          alert('Erro ao carregar documento')
        })
    }
  }, [id, reset])

  const onSubmit = async (data: DocumentFormData) => {
    try {
      setSubmitting(true)
      if (id) {
        await apiPut(`documents/${id}/`, data)
        alert('Documento atualizado com sucesso!')
      } else {
        await apiPost('documents/', data)
        alert('Documento criado com sucesso!')
      }
      navigate('/documents')
    } catch (error: any) {
      alert(`Erro ao salvar documento: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="p-6">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/documents')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">
          {id ? 'Editar Documento' : 'Novo Documento'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow p-8 space-y-6 max-w-2xl">
        <fieldset disabled={submitting}>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Documento
              </label>
              <input
                {...register('name')}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Certificado de conclusão"
              />
              {errors.name && (
                <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Documento
              </label>
              <select
                {...register('document_type')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecionar</option>
                <option value="Certificado">Certificado</option>
                <option value="Comprovante">Comprovante</option>
                <option value="Histórico">Histórico</option>
                <option value="Identidade">Identidade</option>
                <option value="Outro">Outro</option>
              </select>
              {errors.document_type && (
                <p className="text-red-600 text-sm mt-1">{errors.document_type.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição
              </label>
              <textarea
                {...register('description')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Descrição do documento"
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL do Arquivo
              </label>
              <input
                {...register('file_url')}
                type="url"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com/documento.pdf"
              />
              {errors.file_url && (
                <p className="text-red-600 text-sm mt-1">{errors.file_url.message}</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/documents')} disabled={submitting}>
              Cancelar
            </Button>
          </div>
        </fieldset>
      </form>
    </div>
  )
}
