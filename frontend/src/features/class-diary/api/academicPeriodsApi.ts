import { apiGet } from '@/utils/api-helpers'
import type { AcademicPeriod, PaginatedResponse } from '@/types/api'

/**
 * Busca a listagem de períodos letivos.
 */
export function fetchAcademicPeriods() {
  return apiGet<PaginatedResponse<AcademicPeriod>>('sme/academic-periods/')
}
