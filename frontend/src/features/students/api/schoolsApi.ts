import { apiGet } from '@/utils/api-helpers'
import type { PaginatedResponse, School } from '@/types/api'

/**
 * Busca a listagem de escolas.
 */
export function fetchSchools() {
  return apiGet<PaginatedResponse<School>>('schools/')
}
