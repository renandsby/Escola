import { useQuery } from '@tanstack/react-query'
import { fetchAcademicYears } from '../api/academicYearsApi'

/** Lista de anos letivos com cache — para selects e listagens. */
export function useAcademicYearsQuery() {
  return useQuery({
    queryKey: ['academic-years', 'list'],
    queryFn: fetchAcademicYears,
    staleTime: 5 * 60 * 1000,
  })
}
