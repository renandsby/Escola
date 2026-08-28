import { useQuery } from '@tanstack/react-query'
import { fetchAcademicYears } from '../api/academicYearsApi'

/**
 * Lista os anos letivos cadastrados, para uso em selects/dropdowns.
 */
export function useAcademicYearsQuery() {
  return useQuery({
    queryKey: ['academic-years', 'list'],
    queryFn: fetchAcademicYears,
  })
}
