import { useQuery } from '@tanstack/react-query'
import { fetchAcademicPeriods } from '../api/academicPeriodsApi'

/** Períodos avaliativos de um ano letivo, com cache. */
export function useAcademicPeriodsQuery(academicYearId?: string) {
  return useQuery({
    queryKey: ['academic-periods', 'list', academicYearId ?? null],
    queryFn: () => fetchAcademicPeriods(academicYearId),
    enabled: !!academicYearId,
    staleTime: 5 * 60 * 1000,
  })
}
