import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/PageHeader'
import { ScopeBar, useScope } from '@/components/ui/ScopeBar'
import { Button } from '@/components/ui/Button'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { apiGet } from '@/utils/api-helpers'
import { downloadEducacensoArchive } from '../api/officialDocs'
import {
  EducacensoValidationReport,
  type EducacensoValidation,
} from '../components/EducacensoValidationReport'

export default function EducacensoPage() {
  const scope = useScope()
  const [downloading, setDownloading] = useState(false)

  const validation = useQuery({
    queryKey: ['educacenso', 'validate'],
    queryFn: () => apiGet<EducacensoValidation>('reports/educacenso/validate/'),
  })

  async function baixarArquivo() {
    setDownloading(true)
    try {
      await downloadEducacensoArchive()
    } catch {
      toast.error('Não foi possível gerar o arquivo do Educacenso.')
    } finally {
      setDownloading(false)
    }
  }

  const data = validation.data

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Documentos' }, { label: 'Educacenso' }]}
        title="Educacenso — diagnóstico e exportação"
        meta="Valide a consistência cadastral da rede antes de gerar o arquivo do INEP."
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              iconLeft={<RefreshCw className="h-4 w-4" />}
              loading={validation.isFetching}
              onClick={() => validation.refetch()}
            >
              Revalidar
            </Button>
            <Button
              variant="primary"
              iconLeft={<Download className="h-4 w-4" />}
              loading={downloading}
              disabled={!data?.ready}
              onClick={baixarArquivo}
            >
              Baixar arquivo (ZIP)
            </Button>
          </div>
        }
      />
      <ScopeBar level={scope.level} title={scope.title} />

      {validation.isLoading ? (
        <TableSkeleton rows={5} cols={2} />
      ) : validation.isError || !data ? (
        <EmptyState
          title="Não foi possível validar"
          description="Tente novamente em instantes."
        />
      ) : (
        <EducacensoValidationReport data={data} />
      )}
    </>
  )
}
