import { apiGet } from '@/utils/api-helpers'
import type { PaginatedResponse, SchoolClass } from '@/types/api'

/**
 * Busca a listagem de turmas.
 */
export function fetchSchoolClasses() {
  return apiGet<PaginatedResponse<SchoolClass>>('classes/')
}
