import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { ScopeBar, useScope } from '@/components/ui/ScopeBar'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { apiDelete, getErrorMessage } from '@/utils/api-helpers'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/app/routes/paths'
import type { AcademicPeriod } from '@/types/api'
import { fetchAcademicYear } from '../api/academicYearsApi'
import { fetchAcademicPeriods } from '../api/academicPeriodsApi'

const fmtDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR')

export default function AcademicPeriodsListPage() {
  const navigate = useNavigate()
  const { yearId } = useParams<{ yearId: string }>()
  const scope = useScope()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'sme_admin'
  const [toDelete, setToDelete] = useState<AcademicPeriod | null>(null)

  const yearQuery = useQuery({
    queryKey: ['academic-year', yearId],
    queryFn: () => fetchAcademicYear(yearId as string),
    enabled: !!yearId,
  })

  const periodsQuery = useQuery({
    queryKey: ['academic-periods', 'list', yearId ?? null],
    queryFn: () => fetchAcademicPeriods(yearId),
    enabled: !!yearId,
  })

  const year = yearQuery.data
  const periods = periodsQuery.data?.results ?? []
  const isClosed = year?.status === 'CLOSED'
  const canManage = isAdmin && !isClosed

  const confirmDelete = async () => {
    if (!toDelete) {
      return
    }
    try {
      await apiDelete(`sme/academic-periods/${toDelete.id}/`)
      toast.success('Período excluído.')
      queryClient.invalidateQueries({ queryKey: ['academic-periods', 'list', yearId ?? null] })
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setToDelete(null)
    }
  }

  const columns: Column<AcademicPeriod>[] = [
    { key: 'number', header: 'Nº', width: '72px', align: 'right', mono: true, render: (p) => p.period_number },
    { key: 'name', header: 'Nome', render: (p) => p.name },
    { key: 'start', header: 'Início', mono: true, render: (p) => fmtDate(p.start_date) },
    { key: 'end', header: 'Término', mono: true, render: (p) => fmtDate(p.end_date) },
    { key: 'deadline', header: 'Prazo de notas', mono: true, render: (p) => fmtDate(p.grade_deadline) },
  ]

  const breadcrumb = [
    { label: 'Rede' },
    { label: 'Ano letivo e bimestres', to: ROUTES.academicYear },
    { label: year ? `Bimestres ${year.year}` : 'Bimestres' },
  ]

  if (yearQuery.isError || (yearQuery.isFetched && !year)) {
    return (
      <>
        <PageHeader breadcrumb={breadcrumb} title="Bimestres do ano letivo" />
        <EmptyState
          title="Ano letivo não encontrado"
          description="O registro foi removido ou está fora do seu escopo."
        />
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={breadcrumb}
        title={year ? `Bimestres do ano letivo ${year.year}` : 'Bimestres do ano letivo'}
        meta={
          year ? (
            <>
              <span>{periods.length} período(s)</span>
              <Badge tone={isClosed ? 'neutral' : 'ok'}>
                {isClosed ? 'Ano encerrado' : year.status === 'ACTIVE' ? 'Ano ativo' : 'Ano planejado'}
              </Badge>
            </>
          ) : undefined
        }
        actions={
          canManage ? (
            <Button
              variant="primary"
              iconLeft={<Plus className="h-4 w-4" />}
              onClick={() => navigate(ROUTES.academicPeriodNew(yearId as string))}
            >
              Novo bimestre
            </Button>
          ) : undefined
        }
      />
      <ScopeBar level={scope.level} title={scope.title} />

      {isClosed && (
        <p className="rounded-lg border border-warn-border bg-warn-bg p-4 text-help text-warn-fg">
          Este ano letivo está encerrado. Não é possível adicionar, editar ou excluir períodos.
        </p>
      )}

      <DataTable
        columns={columns}
        rows={periods}
        rowKey={(p) => p.id}
        isLoading={periodsQuery.isLoading}
        onRowClick={
          canManage
            ? (p) => navigate(ROUTES.academicPeriodEdit(yearId as string, p.id))
            : undefined
        }
        empty={
          <EmptyState
            title="Nenhum bimestre cadastrado"
            description="Cadastre os bimestres ou trimestres deste ano letivo."
            actions={
              canManage ? (
                <Button
                  variant="primary"
                  iconLeft={<Plus className="h-4 w-4" />}
                  onClick={() => navigate(ROUTES.academicPeriodNew(yearId as string))}
                >
                  Criar primeiro bimestre
                </Button>
              ) : undefined
            }
          />
        }
        rowActions={
          canManage
            ? (p) => (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Editar"
                    onClick={() => navigate(ROUTES.academicPeriodEdit(yearId as string, p.id))}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" aria-label="Excluir" onClick={() => setToDelete(p)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )
            : undefined
        }
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Excluir bimestre"
        description={`Excluir "${toDelete?.name ?? 'este período'}"? Esta ação não pode ser desfeita.`}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
        confirmLabel="Excluir"
        destructive
      />
    </>
  )
}
