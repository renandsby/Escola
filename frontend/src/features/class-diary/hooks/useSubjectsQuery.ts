import { useQuery } from '@tanstack/react-query'
import { fetchSubjects } from '../api/subjectsApi'

/**
 * Lista as disciplinas cadastradas, para uso em selects/dropdowns.
 */
export function useSubjectsQuery() {
  return useQuery({
    queryKey: ['subjects', 'list'],
    queryFn: fetchSubjects,
  })
}
