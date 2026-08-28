import { useQuery } from '@tanstack/react-query'
import { fetchCurriculumMatrices } from '../api/curriculumMatricesApi'

/** Lista as matrizes curriculares da rede. */
export function useCurriculumMatricesQuery() {
  return useQuery({
    queryKey: ['governance', 'curriculum-matrices'],
    queryFn: fetchCurriculumMatrices,
  })
}
