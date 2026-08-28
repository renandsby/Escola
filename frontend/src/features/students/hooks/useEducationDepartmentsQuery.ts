import { useQuery } from '@tanstack/react-query'
import { fetchEducationDepartments } from '../api/departmentsApi'

/**
 * Lista as secretarias municipais de educação, para uso em selects/dropdowns.
 */
export function useEducationDepartmentsQuery() {
  return useQuery({
    queryKey: ['education-departments'],
    queryFn: fetchEducationDepartments,
  })
}
