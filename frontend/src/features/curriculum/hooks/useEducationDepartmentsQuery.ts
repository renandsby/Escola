import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/utils/api-helpers'
import type { EducationDepartment, PaginatedResponse } from '@/types/api'

/** Secretarias municipais para selects de formulário. */
export function useEducationDepartmentsQuery() {
  return useQuery({
    queryKey: ['education-departments'],
    queryFn: () => apiGet<PaginatedResponse<EducationDepartment>>('sme/departments/'),
  })
}
