import { useQuery } from '@tanstack/react-query'
import { fetchEnrollments } from '../api/enrollmentsApi'

/**
 * Lista as matrículas ativas de uma turma específica, usada para montar as
 * linhas do lançamento em lote de notas/frequência.
 */
export function useEnrollmentRosterQuery(schoolClassId: string) {
  return useQuery({
    queryKey: ['enrollments', 'roster', schoolClassId],
    queryFn: () => fetchEnrollments({ school_class: schoolClassId, status: 'ENROLLED' }),
    enabled: !!schoolClassId,
  })
}
