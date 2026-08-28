import { useQuery } from '@tanstack/react-query'
import { fetchSchoolClasses } from '../api/schoolClassesApi'

/**
 * Lista as turmas cadastradas, para uso em selects/dropdowns.
 */
export function useSchoolClassesQuery() {
  return useQuery({
    queryKey: ['classes', 'list'],
    queryFn: fetchSchoolClasses,
  })
}
