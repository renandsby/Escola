import { apiGet } from '@/utils/api-helpers'
import type { PaginatedResponse, School } from '@/types/api'

/** Lista as escolas de uma secretaria municipal. */
export function fetchSchoolsByDepartment(departmentId: string) {
  return apiGet<PaginatedResponse<School>>('schools/', {
    education_department: departmentId,
  })
}
