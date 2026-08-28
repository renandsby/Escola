import { apiGet } from '@/utils/api-helpers'
import type { PaginatedResponse, Subject } from '@/types/api'

/**
 * Busca a listagem de disciplinas.
 */
export function fetchSubjects() {
  return apiGet<PaginatedResponse<Subject>>('subjects/')
}
