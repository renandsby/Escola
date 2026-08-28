import { apiGet } from '@/utils/api-helpers'
import type { EducationDepartment, PaginatedResponse } from '@/types/api'

/**
 * Busca as secretarias municipais de educação cadastradas.
 */
export function fetchEducationDepartments() {
  return apiGet<PaginatedResponse<EducationDepartment>>('sme/departments/')
}
