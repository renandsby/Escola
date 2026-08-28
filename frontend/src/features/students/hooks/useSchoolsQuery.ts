import { useQuery } from '@tanstack/react-query'
import { fetchSchools } from '../api/schoolsApi'

/**
 * Lista as escolas cadastradas, para uso em selects/dropdowns.
 */
export function useSchoolsQuery() {
  return useQuery({
    queryKey: ['schools', 'list'],
    queryFn: fetchSchools,
  })
}
