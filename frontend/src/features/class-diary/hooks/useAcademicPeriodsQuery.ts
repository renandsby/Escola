import { useQuery } from '@tanstack/react-query'
import { fetchAcademicPeriods } from '../api/academicPeriodsApi'

/**
 * Lista os períodos letivos cadastrados, para uso em selects/dropdowns.
 */
export function useAcademicPeriodsQuery() {
  return useQuery({
    queryKey: ['academic-periods', 'list'],
    queryFn: fetchAcademicPeriods,
  })
}
