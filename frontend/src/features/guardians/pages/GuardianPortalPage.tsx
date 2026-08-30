import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { useAuthStore } from '@/stores/authStore'
import { apiGet } from '@/utils/api-helpers'
import { StudentCardOverview, type Dependent } from '../components/StudentCardOverview'

export default function GuardianPortalPage() {
  const firstName = useAuthStore((s) => s.user?.first_name)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['guardians', 'my-dependents'],
    queryFn: () => apiGet<Dependent[]>('guardians/my-dependents/'),
  })

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Meus filhos' }]}
        title={firstName ? `Olá, ${firstName}` : 'Meus filhos'}
        meta="Acompanhe notas, frequência e documentos de cada estudante."
      />

      {isLoading ? (
        <TableSkeleton rows={3} cols={2} />
      ) : isError || !data ? (
        <EmptyState
          title="Não foi possível carregar"
          description="Tente novamente em instantes."
        />
      ) : data.length === 0 ? (
        <EmptyState
          title="Nenhum estudante vinculado"
          description="Procure a secretaria da escola para vincular o seu cadastro de responsável."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((d) => (
            <StudentCardOverview key={d.student_id} dependent={d} />
          ))}
        </div>
      )}
    </>
  )
}
