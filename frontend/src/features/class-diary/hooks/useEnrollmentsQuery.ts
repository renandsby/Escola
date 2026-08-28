import { useQuery } from '@tanstack/react-query'
import { fetchEnrollments } from '../api/enrollmentsApi'

/**
 * Lista todas as matrículas, para uso em selects/dropdowns (ex: parecer
 * descritivo, que não é filtrado por turma).
 */
export function useEnrollmentsQuery() {
  return useQuery({
    queryKey: ['enrollments', 'list'],
    queryFn: () => fetchEnrollments(),
  })
}
